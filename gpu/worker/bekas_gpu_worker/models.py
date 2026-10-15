from __future__ import annotations

from dataclasses import dataclass


@dataclass
class MeshJob:
    job_id: str
    project_id: str
    attempt: int
    claim_token: str
    input_url: str
    input_sha256: str
    output_bucket: str
    output_path: str
    output_upload_url: str


@dataclass(frozen=True)
class MeshResult:
    path: str
    model: str
    model_version: str
    fallback_used: bool
    timings: dict[str, int]


@dataclass(frozen=True)
class HeartbeatResult:
    lease_expires_at: str | None
    output_upload_url: str | None


class WorkerAPIError(RuntimeError):
    def __init__(self, message: str, status_code: int | None = None) -> None:
        super().__init__(message)
        self.status_code = status_code

    @property
    def is_auth_error(self) -> bool:
        return self.status_code in (401, 403)

    @property
    def is_claim_lost(self) -> bool:
        return self.status_code in (404, 409)


class MeshGenerationError(RuntimeError):
    """Safe-to-report model failure; subprocess output is kept in local logs only."""

    code = "mesh_inference_failed"
