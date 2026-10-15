from __future__ import annotations

import hashlib
import logging
from pathlib import Path

import httpx

from .models import HeartbeatResult, MeshJob, WorkerAPIError
from .settings import Settings

logger = logging.getLogger(__name__)


class WorkerAPI:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        timeout = httpx.Timeout(settings.request_timeout_seconds)
        self.api = httpx.AsyncClient(
            base_url=f"{settings.api_base_url}/",
            timeout=timeout,
            headers={
                "Authorization": f"Bearer {settings.worker_token}",
                "Accept": "application/json",
            },
        )
        self.transfer = httpx.AsyncClient(timeout=timeout)

    async def close(self) -> None:
        await self.api.aclose()
        await self.transfer.aclose()

    async def claim(self) -> MeshJob | None:
        response = await self._request(
            "POST",
            "worker/jobs/claim",
            json={"worker_id": self.settings.worker_id, "supported_kinds": ["mesh"]},
            expected=(200, 204),
        )
        if response.status_code == 204:
            return None
        try:
            data = response.json()
            return MeshJob(
                job_id=str(data["job_id"]),
                project_id=str(data["project_id"]),
                attempt=int(data["attempt"]),
                claim_token=str(data["claim_token"]),
                input_url=str(data["input_url"]),
                input_sha256=str(data["input_sha256"]).lower(),
                output_bucket=str(data["output_bucket"]),
                output_path=str(data["output_path"]),
                output_upload_url=str(data["output_upload_url"]),
            )
        except (KeyError, TypeError, ValueError) as exc:
            raise WorkerAPIError("Claim response does not match worker contract") from exc

    async def heartbeat(self, job: MeshJob, refresh_upload_url: bool = False) -> HeartbeatResult:
        response = await self._request(
            "POST",
            f"worker/jobs/{job.job_id}/heartbeat",
            json={
                "worker_id": self.settings.worker_id,
                "claim_token": job.claim_token,
                "refresh_upload_url": refresh_upload_url,
            },
            expected=(200,),
        )
        data = response.json()
        url = data.get("output_upload_url")
        return HeartbeatResult(
            lease_expires_at=data.get("lease_expires_at"),
            output_upload_url=str(url) if url else None,
        )

    async def download_input(self, job: MeshJob, destination: Path) -> str:
        digest = hashlib.sha256()
        byte_count = 0
        async with self.transfer.stream("GET", job.input_url) as response:
            if response.status_code >= 400:
                raise WorkerAPIError("Input asset download failed", response.status_code)
            with destination.open("wb") as output:
                async for chunk in response.aiter_bytes():
                    byte_count += len(chunk)
                    if byte_count > self.settings.max_input_bytes:
                        raise WorkerAPIError("Input asset exceeds configured size limit")
                    digest.update(chunk)
                    output.write(chunk)
        if byte_count == 0:
            raise WorkerAPIError("Input asset is empty")
        actual_hash = digest.hexdigest()
        if actual_hash != job.input_sha256:
            raise WorkerAPIError("Input asset checksum does not match claim")
        return actual_hash

    async def upload_glb(self, job: MeshJob, glb_path: Path) -> None:
        with glb_path.open("rb") as file:
            response = await self.transfer.put(
                job.output_upload_url,
                files={"file": ("mesh.glb", file, "model/gltf-binary")},
                headers={"x-upsert": "false"},
            )
        if response.status_code >= 400:
            raise WorkerAPIError("GLB upload failed", response.status_code)

    async def complete(
        self,
        job: MeshJob,
        *,
        byte_size: int,
        checksum_sha256: str,
        model: str,
        model_version: str,
        fallback_used: bool,
        timings: dict[str, int],
    ) -> None:
        await self._request(
            "POST",
            f"worker/jobs/{job.job_id}/complete",
            json={
                "claim_token": job.claim_token,
                "output_bucket": job.output_bucket,
                "output_path": job.output_path,
                "mime_type": "model/gltf-binary",
                "byte_size": byte_size,
                "checksum_sha256": checksum_sha256,
                "model": model,
                "model_version": model_version,
                "fallback_used": fallback_used,
                "timing": timings,
            },
            expected=(200, 204),
        )

    async def fail(
        self,
        job: MeshJob,
        *,
        code: str,
        message: str,
        retryable: bool,
    ) -> None:
        await self._request(
            "POST",
            f"worker/jobs/{job.job_id}/fail",
            json={
                "claim_token": job.claim_token,
                "error": {
                    "code": code,
                    "message": message,
                    "retryable": retryable,
                },
            },
            expected=(200, 204),
        )

    async def _request(
        self,
        method: str,
        path: str,
        *,
        expected: tuple[int, ...],
        **kwargs: object,
    ) -> httpx.Response:
        try:
            response = await self.api.request(method, path, **kwargs)
        except httpx.HTTPError as exc:
            raise WorkerAPIError(f"Backend request failed ({type(exc).__name__})") from exc
        if response.status_code not in expected:
            raise WorkerAPIError(
                f"Backend endpoint failed (HTTP {response.status_code})",
                response.status_code,
            )
        return response
