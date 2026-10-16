from __future__ import annotations

import asyncio
import io
import logging
import threading
import time
from concurrent.futures import TimeoutError as FutureTimeout
from pathlib import Path
from tempfile import TemporaryDirectory
from urllib.parse import urljoin, urlparse

import httpx
from gradio_client import Client, handle_file
from PIL import Image

from app.errors import ApiError
from app.services.glb import validate_glb

logger = logging.getLogger("bekas.sf3d")


class SF3DService:
    """One isolated Gradio session per call; no local models or GPU runtime."""

    def __init__(self, *, space_id: str, token: str | None, timeout: int, max_bytes: int):
        self.space_id, self.token = space_id, token
        self.timeout, self.max_bytes = timeout, max_bytes

    async def generate(self, image: bytes) -> bytes:
        stop = threading.Event()
        task = asyncio.create_task(asyncio.to_thread(self._generate, image, stop))
        try:
            return await asyncio.shield(task)
        except asyncio.CancelledError:
            # Do not release the mesh slot while its local Gradio work is still running.
            stop.set()
            try:
                await task
            except Exception as exc:  # noqa: BLE001 - original cancellation takes precedence
                logger.debug("Cancelled Space call exited type=%s", type(exc).__name__)
            raise

    def _generate(self, image: bytes, stop: threading.Event) -> bytes:
        deadline = time.monotonic() + self.timeout
        client = None
        job = None

        def check_deadline() -> float:
            remaining = deadline - time.monotonic()
            if stop.is_set() or remaining <= 0:
                raise TimeoutError("Space deadline reached")
            return remaining

        def call(*args, api_name):
            nonlocal job
            check_deadline()
            job = client.submit(*args, api_name=api_name)
            while True:
                try:
                    return job.result(timeout=min(0.5, check_deadline()))
                except FutureTimeout:
                    check_deadline()

        try:
            with TemporaryDirectory(prefix="bekas-sf3d-") as directory:
                path = Path(directory) / "input.png"
                # Normalize to RGBA: the Space's initialization expects an alpha channel.
                with Image.open(io.BytesIO(image)) as photo:
                    rgba = photo.convert("RGBA")
                    transparent = rgba.getchannel("A").getextrema()[0] == 0
                    rgba.save(path)
                client = Client(
                    self.space_id, hf_token=self.token or False, download_files=False,
                    # Gradio uses this executor for both prediction and SSE reading.
                    verbose=False, max_workers=4, httpx_kwargs={"timeout": 30},
                )
                source = handle_file(str(path))
                call(source, 0.85, api_name="/requires_bg_remove")
                # Gradio 4.41 /info omits the Button input although its callable needs it.
                # Explicit positional button value is required; State is inserted by client.
                if not transparent:
                    call("Remove Background", source, 0.85, "None", -1, 1024, api_name="/run_button")
                output = call("Run", source, 0.85, "None", -1, 1024, api_name="/run_button")
                url = self._output_url(output, client.src)
                data = bytearray()
                with httpx.Client(timeout=30, follow_redirects=False) as download, download.stream("GET", url) as response:
                    response.raise_for_status()
                    for chunk in response.iter_bytes():
                        check_deadline()
                        data.extend(chunk)
                        if len(data) > self.max_bytes:
                            raise ValueError("Space output exceeds GLB limit")
                result = bytes(data)
                validate_glb(result, self.max_bytes)
                return result
        except TimeoutError as exc:
            raise ApiError(504, "mesh_timeout", "Pembuatan model 3D melewati batas waktu.", retryable=True) from exc
        except ApiError:
            raise
        except Exception as exc:
            text = str(exc).lower()
            if any(word in text for word in ("quota", "gpu quota", "exceeded your")):
                code, message, retryable = "mesh_quota_exhausted", "Kuota layanan 3D habis. Ide tetap dapat digunakan.", False
            elif isinstance(exc, httpx.HTTPStatusError) and exc.response.status_code in (401, 403):
                code, message, retryable = "mesh_access_denied", "Layanan 3D menolak akses backend.", False
            elif isinstance(exc, ValueError):
                code, message, retryable = "mesh_invalid_output", "Layanan 3D mengembalikan hasil yang tidak valid.", False
            else:
                code, message, retryable = "mesh_provider_unavailable", "Layanan 3D belum tersedia. Ide tetap dapat digunakan.", True
            raise ApiError(502, code, message, retryable=retryable) from exc
        finally:
            if job is not None and not job.done():
                try:
                    job.cancel()
                except Exception as exc:  # noqa: BLE001 - cancellation cleanup must preserve job error
                    logger.debug("Space cancellation failed type=%s", type(exc).__name__)
            if client is not None:
                client.close()
                client.executor.shutdown(wait=True, cancel_futures=True)

    @staticmethod
    def _output_url(output, source: str) -> str:
        # /run_button returns (preview update, model update), not a bare file URL.
        if not isinstance(output, (list, tuple)) or len(output) != 2:
            raise ValueError("Unexpected Space output shape")
        model = output[1]
        if isinstance(model, dict) and model.get("__type__") == "update":
            model = model.get("value")
        if not isinstance(model, dict) or not str(model.get("path", "")).lower().endswith(".glb"):
            raise ValueError("Space returned no GLB")
        url = urljoin(source, model.get("url") or ("file=" + model["path"]))
        if urlparse(url).scheme != "https" or urlparse(url).netloc != urlparse(source).netloc:
            raise ValueError("Unexpected Space output host")
        return url
