from __future__ import annotations

import asyncio
import json
import logging
import tempfile
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .models import MeshGenerationError, MeshResult
from .settings import Settings

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class ModelConfig:
    name: str
    version: str
    python: str
    run_py: str
    model_id: str


class PersistentModel:
    """One model process; loads weights once and handles sequential requests."""

    def __init__(self, config: ModelConfig, runner_script: str, load_timeout: int) -> None:
        self.config = config
        self.runner_script = runner_script
        self.load_timeout = load_timeout
        self.process: asyncio.subprocess.Process | None = None
        self.stderr_file: Any = None
        self.lock = asyncio.Lock()

    async def start(self) -> None:
        if self.process is not None and self.process.returncode is None:
            return
        if not Path(self.config.run_py).is_file():
            raise MeshGenerationError(f"Configured {self.config.name} entrypoint does not exist")

        self.stderr_file = tempfile.TemporaryFile(mode="w+b")
        self.process = await asyncio.create_subprocess_exec(
            self.config.python,
            self.runner_script,
            "--model",
            self.config.name,
            "--run-py",
            self.config.run_py,
            "--model-id",
            self.config.model_id,
            stdout=asyncio.subprocess.PIPE,
            stderr=self.stderr_file,
            stdin=asyncio.subprocess.PIPE,
        )
        ready = await self._read_message(self.load_timeout)
        if not ready.get("ready"):
            reason = str(ready.get("error", "model initialization failed"))
            await self.stop()
            raise MeshGenerationError(f"{self.config.name} failed to initialize: {reason}")
        logger.info("GPU model ready model=%s version=%s", self.config.name, self.config.version)

    async def generate(self, image_path: Path, output_dir: Path, timeout: int) -> Path:
        async with self.lock:
            if self.process is None or self.process.returncode is not None:
                raise MeshGenerationError(f"{self.config.name} model process is not running")
            assert self.process.stdin is not None
            self.process.stdin.write(
                json.dumps(
                    {
                        "op": "generate",
                        "input_path": str(image_path),
                        "output_dir": str(output_dir),
                    }
                ).encode()
                + b"\n"
            )
            await self.process.stdin.drain()
            try:
                result = await self._read_message(timeout)
            except asyncio.CancelledError:
                await self.stop()
                raise
            if not result.get("ok"):
                raise MeshGenerationError(
                    f"{self.config.name} inference failed: {result.get('error', 'unknown error')}"
                )

            output = Path(str(result.get("glb_path", ""))).resolve()
            if not output.is_relative_to(output_dir.resolve()) or not output.is_file():
                raise MeshGenerationError(f"{self.config.name} returned an invalid GLB path")
            return output

    async def stop(self) -> None:
        process = self.process
        if process is not None and process.returncode is None:
            if process.stdin is not None:
                try:
                    process.stdin.write(b'{"op":"shutdown"}\n')
                    await process.stdin.drain()
                    process.stdin.close()
                except (BrokenPipeError, ConnectionError):
                    pass
            try:
                await asyncio.wait_for(process.wait(), timeout=10)
            except asyncio.TimeoutError:
                process.terminate()
                try:
                    await asyncio.wait_for(process.wait(), timeout=5)
                except asyncio.TimeoutError:
                    process.kill()
                    await process.wait()
        self.process = None
        if self.stderr_file is not None:
            self.stderr_file.close()
            self.stderr_file = None

    async def _read_message(self, timeout: int) -> dict[str, Any]:
        process = self.process
        if process is None or process.stdout is None:
            raise MeshGenerationError(f"{self.config.name} model process is not running")
        try:
            line = await asyncio.wait_for(process.stdout.readline(), timeout=timeout)
        except asyncio.TimeoutError as exc:
            await self.stop()
            raise MeshGenerationError(f"{self.config.name} timed out") from exc
        if not line:
            return_code = await process.wait()
            raise MeshGenerationError(
                f"{self.config.name} model process exited unexpectedly ({return_code})"
            )
        try:
            data = json.loads(line)
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise MeshGenerationError(f"{self.config.name} returned invalid worker protocol") from exc
        if not isinstance(data, dict):
            raise MeshGenerationError(f"{self.config.name} returned invalid worker protocol")
        return data


class MeshGenerator:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        runner_script = settings.model_runner_script or str(Path(__file__).with_name("model_runner.py"))
        self.sf3d = PersistentModel(
            ModelConfig(
                "sf3d",
                settings.sf3d_version,
                settings.sf3d_python,
                settings.sf3d_run_py,
                settings.sf3d_model_id,
            ),
            runner_script,
            settings.model_load_timeout_seconds,
        )
        self.triposr = PersistentModel(
            ModelConfig(
                "triposr",
                settings.triposr_version,
                settings.triposr_python,
                settings.triposr_run_py,
                settings.triposr_model_id,
            ),
            runner_script,
            settings.model_load_timeout_seconds,
        )
        self.active_model: PersistentModel | None = None
        self.fallback_active = False

    async def start(self) -> None:
        try:
            await self.sf3d.start()
            self.active_model = self.sf3d
        except (MeshGenerationError, OSError) as exc:
            logger.warning("SF3D startup failed; loading TripoSR fallback (%s)", type(exc).__name__)
            await self.triposr.start()
            self.active_model = self.triposr
            self.fallback_active = True

    async def stop(self) -> None:
        await self.sf3d.stop()
        await self.triposr.stop()
        self.active_model = None

    async def generate(self, image_path: Path, work_dir: Path) -> MeshResult:
        if self.active_model is None:
            await self.start()
        assert self.active_model is not None
        if self.active_model.process is None or self.active_model.process.returncode is not None:
            if self.active_model is self.sf3d:
                try:
                    await self.sf3d.start()
                except (MeshGenerationError, OSError) as exc:
                    logger.warning("SF3D restart failed; switching to TripoSR (%s)", type(exc).__name__)
                    await self.sf3d.stop()
                    await self.triposr.start()
                    self.active_model = self.triposr
                    self.fallback_active = True
            else:
                await self.triposr.start()
        output_dir = work_dir / f"{self.active_model.config.name}-output"
        output_dir.mkdir(parents=True, exist_ok=True)

        try:
            start = time.perf_counter()
            glb = await self.active_model.generate(
                image_path,
                output_dir,
                self.settings.mesh_timeout_seconds,
            )
            elapsed = round((time.perf_counter() - start) * 1000)
            model = self.active_model
            return MeshResult(
                path=str(glb),
                model=model.config.name,
                model_version=model.config.version,
                fallback_used=self.fallback_active,
                timings={f"{model.config.name}_ms": elapsed},
            )
        except asyncio.CancelledError:
            raise
        except Exception as primary_error:
            if self.active_model is self.triposr:
                raise MeshGenerationError("TripoSR inference failed") from primary_error
            logger.warning("SF3D inference failed; switching to TripoSR (%s)", type(primary_error).__name__)

        # Stop SF3D before loading TripoSR so both model weights never occupy VRAM together.
        await self.sf3d.stop()
        try:
            await self.triposr.start()
        except (MeshGenerationError, OSError) as exc:
            raise MeshGenerationError("TripoSR fallback could not start") from exc
        self.active_model = self.triposr
        self.fallback_active = True
        output_dir = work_dir / "triposr-output"
        output_dir.mkdir(parents=True, exist_ok=True)
        start = time.perf_counter()
        try:
            glb = await self.triposr.generate(
                image_path,
                output_dir,
                self.settings.mesh_timeout_seconds,
            )
        except Exception as exc:
            if isinstance(exc, asyncio.CancelledError):
                raise
            raise MeshGenerationError("Both configured mesh models failed") from exc
        return MeshResult(
            path=str(glb),
            model=self.triposr.config.name,
            model_version=self.triposr.config.version,
            fallback_used=True,
            timings={"triposr_ms": round((time.perf_counter() - start) * 1000)},
        )
