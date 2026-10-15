from __future__ import annotations

import os
import socket
from dataclasses import dataclass


def _int_env(name: str, default: int) -> int:
    value = os.getenv(name)
    return default if value is None else int(value)


def _float_env(name: str, default: float) -> float:
    value = os.getenv(name)
    return default if value is None else float(value)


@dataclass(frozen=True)
class Settings:
    api_base_url: str
    worker_token: str
    worker_id: str
    poll_interval_seconds: float = 5.0
    heartbeat_interval_seconds: float = 20.0
    request_timeout_seconds: float = 30.0
    max_claim_seconds: int = 600
    mesh_timeout_seconds: int = 300
    model_load_timeout_seconds: int = 900
    max_input_bytes: int = 5_000_000
    max_glb_bytes: int = 25_000_000
    sf3d_python: str = "python"
    sf3d_run_py: str = "/opt/stable-fast-3d/run.py"
    sf3d_version: str = "unversioned"
    sf3d_model_id: str = "stabilityai/stable-fast-3d"
    triposr_python: str = "python"
    triposr_run_py: str = "/opt/TripoSR/run.py"
    triposr_version: str = "unversioned"
    triposr_model_id: str = "stabilityai/TripoSR"
    model_runner_script: str | None = None

    @classmethod
    def from_env(cls) -> Settings:
        api_base_url = os.getenv("API_BASE_URL", "").rstrip("/")
        worker_token = os.getenv("WORKER_TOKEN", "")
        if not api_base_url:
            raise ValueError("API_BASE_URL is required")
        if not worker_token:
            raise ValueError("WORKER_TOKEN is required")

        return cls(
            api_base_url=api_base_url,
            worker_token=worker_token,
            worker_id=os.getenv("WORKER_ID", socket.gethostname()),
            poll_interval_seconds=_float_env("POLL_INTERVAL_SECONDS", 5.0),
            heartbeat_interval_seconds=_float_env("HEARTBEAT_INTERVAL_SECONDS", 20.0),
            request_timeout_seconds=_float_env("REQUEST_TIMEOUT_SECONDS", 30.0),
            max_claim_seconds=_int_env("MAX_CLAIM_SECONDS", 600),
            mesh_timeout_seconds=_int_env("MESH_TIMEOUT_SECONDS", 300),
            model_load_timeout_seconds=_int_env("MODEL_LOAD_TIMEOUT_SECONDS", 900),
            max_input_bytes=_int_env("MAX_INPUT_BYTES", 5_000_000),
            max_glb_bytes=_int_env("MAX_GLB_BYTES", 25_000_000),
            sf3d_python=os.getenv("SF3D_PYTHON", "python"),
            sf3d_run_py=os.getenv("SF3D_RUN_PY", "/opt/stable-fast-3d/run.py"),
            sf3d_version=os.getenv("SF3D_VERSION", "unversioned"),
            sf3d_model_id=os.getenv("SF3D_MODEL_ID", "stabilityai/stable-fast-3d"),
            triposr_python=os.getenv("TRIPOSR_PYTHON", "python"),
            triposr_run_py=os.getenv("TRIPOSR_RUN_PY", "/opt/TripoSR/run.py"),
            triposr_version=os.getenv("TRIPOSR_VERSION", "unversioned"),
            triposr_model_id=os.getenv("TRIPOSR_MODEL_ID", "stabilityai/TripoSR"),
            model_runner_script=os.getenv("MODEL_RUNNER_SCRIPT") or None,
        )
