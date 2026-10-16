from __future__ import annotations

import asyncio
import hashlib
import logging
import time

from app.config import Settings
from app.errors import ApiError
from app.repositories.projects import ProjectRepository
from app.services.sf3d import SF3DService
from app.services.storage import SupabaseStorageService

logger = logging.getLogger("bekas.mesh")


class MeshJobRunner:
    def __init__(self, pool, storage: SupabaseStorageService, settings: Settings):
        self.repository = ProjectRepository(pool)
        self.storage, self.settings = storage, settings
        self.provider = SF3DService(
            space_id=settings.sf3d_space_id,
            token=settings.hf_token.get_secret_value() if settings.hf_token else None,
            timeout=settings.mesh_job_timeout_seconds,
            max_bytes=settings.max_glb_bytes,
        )
        self.task: asyncio.Task | None = None

    def start(self):
        self.task = asyncio.create_task(self.run(), name="bekas-mesh")

    async def stop(self):
        if self.task:
            self.task.cancel()
            await asyncio.gather(self.task, return_exceptions=True)
            self.task = None

    async def run(self):
        while True:
            try:
                job = await self.repository.claim_mesh_job(
                    max_attempts=self.settings.max_mesh_attempts,
                    # Include input read/upload/cleanup beyond the provider deadline.
                    timeout_seconds=self.settings.mesh_job_timeout_seconds + 120,
                )
                if job:
                    await self.process(job)
                    continue
            except asyncio.CancelledError:
                raise
            except Exception as exc:  # noqa: BLE001 - transient DB errors must not kill the consumer
                logger.error("Mesh runner error type=%s", type(exc).__name__)
            await asyncio.sleep(self.settings.mesh_poll_seconds)

    async def process(self, job):
        started = time.monotonic()
        try:
            if not job.get("bucket"):
                raise ApiError(409, "input_asset_missing", "Foto sumber tidak ditemukan.", retryable=False)
            image, _ = await self.storage.read_uploaded_image(job["bucket"], job["path"], job["checksum_sha256"])
            data = await self.provider.generate(image)
            bucket = self.settings.supabase_storage_bucket
            path = f"projects/{job['project_id']}/mesh/attempt-{job['attempt']}/model.glb"
            await self.storage.upload_glb(bucket, path, data)
            accepted = await self.repository.complete_mesh_job(
                job, bucket=bucket, path=path, byte_size=len(data),
                checksum=hashlib.sha256(data).hexdigest(),
                duration_ms=round((time.monotonic() - started) * 1000), space_id=self.settings.sf3d_space_id,
            )
            logger.info("Mesh finished job_id=%s attempt=%s accepted=%s", job["job_id"], job["attempt"], accepted)
        except asyncio.CancelledError:
            await self.repository.fail_mesh_job(
                job, error={"code": "runner_shutdown", "message": "Pemrosesan 3D terputus.", "retryable": True},
                max_attempts=self.settings.max_mesh_attempts, retry_seconds=self.settings.mesh_retry_seconds,
            )
            raise
        except Exception as exc:  # noqa: BLE001 - persist bounded failure for any failed job
            error = exc.as_dict() if isinstance(exc, ApiError) else {
                "code": "mesh_internal_error", "message": "Pembuatan model 3D gagal.", "retryable": True,
            }
            logger.warning("Mesh failed job_id=%s code=%s", job["job_id"], error["code"])
            await self.repository.fail_mesh_job(
                job, error=error, max_attempts=self.settings.max_mesh_attempts,
                retry_seconds=self.settings.mesh_retry_seconds,
            )
