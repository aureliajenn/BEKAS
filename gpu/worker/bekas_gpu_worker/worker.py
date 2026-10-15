from __future__ import annotations

import asyncio
import hashlib
import logging
import signal
import tempfile
import time
from pathlib import Path

from PIL import Image, UnidentifiedImageError

from .api import WorkerAPI
from .glb import validate_glb
from .mesh import MeshGenerator
from .models import MeshGenerationError, MeshJob, WorkerAPIError
from .settings import Settings

logger = logging.getLogger("bekas_gpu_worker")


class GPUWorker:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.api = WorkerAPI(settings)
        self.generator = MeshGenerator(settings)
        self._stop = asyncio.Event()

    def request_stop(self) -> None:
        self._stop.set()

    async def run(self) -> None:
        logger.info("Vast.ai worker started worker_id=%s", self.settings.worker_id)
        try:
            await self.generator.start()
            logger.info("Mesh model warm; worker is polling for jobs")
            claim_failures = 0
            while not self._stop.is_set():
                try:
                    job = await self.api.claim()
                except WorkerAPIError as exc:
                    logger.error("Job claim failed: %s", exc)
                    if exc.is_auth_error:
                        raise
                    delay = min(self.settings.poll_interval_seconds * (2**claim_failures), 60.0)
                    claim_failures = min(claim_failures + 1, 8)
                    await self._wait(delay)
                    continue

                claim_failures = 0
                if job is None:
                    await self._wait(self.settings.poll_interval_seconds)
                    continue

                logger.info(
                    "Claimed mesh job job_id=%s project_id=%s attempt=%s",
                    job.job_id,
                    job.project_id,
                    job.attempt,
                )
                await self._process_job(job)
        finally:
            await self.generator.stop()
            await self.api.close()
            logger.info("Vast.ai worker stopped")

    async def _process_job(self, job: MeshJob) -> None:
        stop_heartbeat = asyncio.Event()
        heartbeat_task = asyncio.create_task(self._heartbeat_loop(job, stop_heartbeat))
        work_task = asyncio.create_task(self._generate_and_upload(job))
        try:
            done, _ = await asyncio.wait(
                {work_task, heartbeat_task},
                return_when=asyncio.FIRST_COMPLETED,
            )
            if work_task in done:
                await work_task
                return
            if heartbeat_task in done:
                error = heartbeat_task.exception()
                if error is not None:
                    work_task.cancel()
                    await asyncio.gather(work_task, return_exceptions=True)
                    raise error
        except asyncio.CancelledError:
            work_task.cancel()
            await asyncio.gather(work_task, return_exceptions=True)
            raise
        except WorkerAPIError as exc:
            logger.error("Job transfer/API failed job_id=%s: %s", job.job_id, exc)
            await self._report_failure(job, "worker_transfer_failed", str(exc), True)
        except Exception as exc:
            logger.error("Mesh job failed job_id=%s error_type=%s", job.job_id, type(exc).__name__)
            code = exc.code if isinstance(exc, MeshGenerationError) else "worker_internal_error"
            await self._report_failure(job, code, "Mesh worker could not complete this job", True)
        finally:
            stop_heartbeat.set()
            if not heartbeat_task.done():
                heartbeat_task.cancel()
            await asyncio.gather(heartbeat_task, return_exceptions=True)

    async def _generate_and_upload(self, job: MeshJob) -> None:
        with tempfile.TemporaryDirectory(prefix=f"bekas-{job.job_id}-") as temp:
            work_dir = Path(temp)
            input_path = work_dir / "input-image"
            download_started = time.perf_counter()
            await self.api.download_input(job, input_path)
            download_ms = round((time.perf_counter() - download_started) * 1000)
            self._validate_image(input_path)

            inference_started = time.perf_counter()
            result = await self.generator.generate(input_path, work_dir)
            inference_ms = round((time.perf_counter() - inference_started) * 1000)
            glb_path = Path(result.path)
            byte_size = validate_glb(glb_path, self.settings.max_glb_bytes)
            checksum = await asyncio.to_thread(self._sha256_file, glb_path)

            upload_started = time.perf_counter()
            try:
                await self.api.upload_glb(job, glb_path)
            except WorkerAPIError as exc:
                if exc.status_code not in (400, 401, 403, 404, 410):
                    raise
                heartbeat = await self.api.heartbeat(job, refresh_upload_url=True)
                if heartbeat.output_upload_url:
                    job.output_upload_url = heartbeat.output_upload_url
                await self.api.upload_glb(job, glb_path)
            upload_ms = round((time.perf_counter() - upload_started) * 1000)

            completion_started = time.perf_counter()
            await self.api.complete(
                job,
                byte_size=byte_size,
                checksum_sha256=checksum,
                model=result.model,
                model_version=result.model_version,
                fallback_used=result.fallback_used,
                timings={
                    **result.timings,
                    "download_ms": download_ms,
                    "total_inference_ms": inference_ms,
                    "upload_ms": upload_ms,
                },
            )
            completion_ms = round((time.perf_counter() - completion_started) * 1000)
            logger.info(
                "Mesh job completed job_id=%s model=%s fallback=%s bytes=%s "
                "download_ms=%s inference_ms=%s upload_ms=%s completion_ms=%s",
                job.job_id,
                result.model,
                result.fallback_used,
                byte_size,
                download_ms,
                inference_ms,
                upload_ms,
                completion_ms,
            )

    async def _heartbeat_loop(self, job: MeshJob, stop: asyncio.Event) -> None:
        failures = 0
        claim_started = time.monotonic()
        while not stop.is_set():
            remaining = self.settings.max_claim_seconds - (time.monotonic() - claim_started)
            if remaining <= 0:
                raise WorkerAPIError("Worker claim exceeded maximum processing time")
            try:
                await asyncio.wait_for(
                    stop.wait(),
                    timeout=min(self.settings.heartbeat_interval_seconds, remaining),
                )
                return
            except asyncio.TimeoutError:
                pass

            try:
                await self.api.heartbeat(job)
                failures = 0
            except WorkerAPIError as exc:
                if exc.is_claim_lost or exc.is_auth_error:
                    raise
                failures += 1
                logger.warning(
                    "Heartbeat failed job_id=%s consecutive_failures=%s (%s)",
                    job.job_id,
                    failures,
                    exc,
                )
                if failures >= 3:
                    raise

    async def _report_failure(
        self,
        job: MeshJob,
        code: str,
        message: str,
        retryable: bool,
    ) -> None:
        try:
            await self.api.fail(job, code=code, message=message, retryable=retryable)
        except WorkerAPIError as exc:
            logger.error("Could not report job failure job_id=%s: %s", job.job_id, exc)

    async def _wait(self, seconds: float) -> None:
        try:
            await asyncio.wait_for(self._stop.wait(), timeout=seconds)
        except asyncio.TimeoutError:
            pass

    def _validate_image(self, path: Path) -> None:
        try:
            with Image.open(path) as image:
                image.verify()
        except (UnidentifiedImageError, OSError) as exc:
            raise WorkerAPIError("Input asset is not a valid image") from exc

    @staticmethod
    def _sha256_file(path: Path) -> str:
        digest = hashlib.sha256()
        with path.open("rb") as file:
            for chunk in iter(lambda: file.read(1024 * 1024), b""):
                digest.update(chunk)
        return digest.hexdigest()


def _check_cuda() -> None:
    import subprocess

    try:
        result = subprocess.run(
            ["nvidia-smi", "--query-gpu=name,memory.total", "--format=csv,noheader"],
            check=True,
            capture_output=True,
            text=True,
            timeout=10,
        )
    except (OSError, subprocess.SubprocessError) as exc:
        raise RuntimeError("No visible NVIDIA GPU; check Vast.ai GPU/CUDA configuration") from exc
    logger.info("Visible GPU: %s", result.stdout.strip().replace("\n", "; "))


async def _async_main() -> None:
    settings = Settings.from_env()
    _check_cuda()
    worker = GPUWorker(settings)
    loop = asyncio.get_running_loop()
    for stop_signal in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(stop_signal, worker.request_stop)
    await worker.run()


def main() -> None:
    logging.basicConfig(
        level=getattr(logging, __import__("os").getenv("LOG_LEVEL", "INFO").upper(), logging.INFO),
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )
    try:
        asyncio.run(_async_main())
    except (ValueError, RuntimeError) as exc:
        logger.error("Worker startup failed: %s", exc)
        raise SystemExit(1) from exc


if __name__ == "__main__":
    main()
