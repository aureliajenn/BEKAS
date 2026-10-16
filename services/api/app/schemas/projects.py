from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.ai import GuideResult, IdeasResult, ObjectProfile

JobState = Literal["not_started", "queued", "running", "succeeded", "retry_wait", "failed"]


class UploadTarget(BaseModel):
    bucket: str
    path: str
    url: str
    method: Literal["PUT"] = "PUT"
    headers: dict[str, str]


class CreateProjectResponse(BaseModel):
    project_id: UUID
    status: Literal["upload_pending"]
    upload_target: UploadTarget
    upload_expires_at: datetime


class JobSummary(BaseModel):
    job_id: UUID
    kind: Literal["mesh", "ideas", "guide", "illustration"]
    step_id: str | None = None
    status: JobState
    attempt: int
    error: dict[str, Any] | None = None


class StartProjectResponse(BaseModel):
    project_id: UUID
    status: Literal["active"]
    jobs: list[JobSummary]


class AssetResponse(BaseModel):
    kind: Literal["input", "mesh", "illustration"]
    step_id: str | None = None
    mime_type: str
    byte_size: int
    url: str


class ComponentResponse(BaseModel):
    status: JobState
    job_id: UUID | None = None
    error: dict[str, Any] | None = None


class ProjectResponse(BaseModel):
    project_id: UUID
    status: Literal["upload_pending", "active", "completed", "expired"]
    created_at: datetime
    input_status: Literal["accepted", "needs_new_photo"] | None = None
    object_profile: ObjectProfile | None = None
    ideas: IdeasResult | None = None
    selected_idea_id: str | None = None
    guide: GuideResult | None = None
    components: dict[str, ComponentResponse]
    illustrations: dict[str, ComponentResponse] = Field(default_factory=dict)
    assets: list[AssetResponse] = Field(default_factory=list)


class CreateGuideRequest(BaseModel):
    idea_id: str = Field(min_length=1, max_length=100)


class JobMutationResponse(BaseModel):
    project_id: UUID
    job_id: UUID
    status: JobState


class RetryRequest(BaseModel):
    job_id: UUID
