from __future__ import annotations

from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Depends, Header, status

from app.config import Settings
from app.dependencies import get_project_repository, get_settings, get_storage_service
from app.errors import ApiError
from app.repositories.projects import ProjectRepository
from app.schemas.ai import GuideResult, IdeasResult, ObjectProfile
from app.schemas.projects import (
    ComponentResponse,
    CreateGuideRequest,
    CreateProjectResponse,
    JobMutationResponse,
    JobSummary,
    ProjectResponse,
    RetryRequest,
    StartProjectResponse,
    UploadTarget,
)
from app.services.storage import SupabaseStorageService

router = APIRouter(prefix="/projects", tags=["projects"])
IdempotencyHeader = Annotated[str, Header(alias="Idempotency-Key", min_length=16, max_length=200)]


@router.post("", response_model=CreateProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    idempotency_key: IdempotencyHeader,
    repository: Annotated[ProjectRepository, Depends(get_project_repository)],
    storage: Annotated[SupabaseStorageService, Depends(get_storage_service)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> CreateProjectResponse:
    project = await repository.create_upload_project(
        idempotency_key=idempotency_key,
        max_active_projects=settings.max_active_projects,
        upload_ttl_seconds=settings.upload_pending_ttl_seconds,
    )
    project_id = UUID(str(project["id"]))
    project = await repository.get_upload_context(project_id)
    if project["status"] != "upload_pending":
        raise ApiError(409, "project_already_started", "Proyek dengan key ini sudah dimulai")

    path = f"projects/{project_id}/input/source.jpg"
    upload_url = await storage.create_signed_upload_url(settings.supabase_storage_bucket, path)
    return CreateProjectResponse(
        project_id=project_id,
        status="upload_pending",
        upload_target=UploadTarget(
            bucket=settings.supabase_storage_bucket,
            path=path,
            url=upload_url,
            headers={"Content-Type": "image/jpeg"},
        ),
        upload_expires_at=project["upload_expires_at"],
    )


@router.post(
    "/{project_id}/start",
    response_model=StartProjectResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def start_project(
    project_id: UUID,
    repository: Annotated[ProjectRepository, Depends(get_project_repository)],
    storage: Annotated[SupabaseStorageService, Depends(get_storage_service)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> StartProjectResponse:
    upload = await repository.get_upload_context(project_id)
    image = None
    if upload["input_asset_id"] is None:
        path = f"projects/{project_id}/input/source.jpg"
        image = await storage.inspect_uploaded_image(settings.supabase_storage_bucket, path)

    result = await repository.start_project(
        project_id=project_id,
        image=image,
        bucket=settings.supabase_storage_bucket,
        path=f"projects/{project_id}/input/source.jpg",
    )
    return StartProjectResponse(
        project_id=project_id,
        status="active",
        jobs=[JobSummary(**job) for job in result["jobs"]],
    )


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: UUID,
    repository: Annotated[ProjectRepository, Depends(get_project_repository)],
    storage: Annotated[SupabaseStorageService, Depends(get_storage_service)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> ProjectResponse:
    result = await repository.get_project(project_id)
    if result is None:
        raise ApiError(404, "project_not_found", "Proyek tidak ditemukan")

    project = result["project"]
    jobs = result["jobs"]
    by_kind = {job["kind"]: job for job in jobs if job["kind"] != "illustration"}
    ideas_result = IdeasResult.model_validate(project["ideas"]) if project["ideas"] is not None else None
    guide_result = GuideResult.model_validate(project["guide"]) if project["guide"] is not None else None
    profile_data = project["object_profile"]
    object_profile = ObjectProfile.model_validate(profile_data) if profile_data is not None else None

    def component(kind: str) -> ComponentResponse:
        job = by_kind.get(kind)
        if job is None:
            return ComponentResponse(status="not_started")
        return ComponentResponse(
            status=job["status"],
            job_id=job["job_id"],
            error=job.get("error"),
        )

    illustration_components: dict[str, ComponentResponse] = {}
    for job in jobs:
        if job["kind"] == "illustration" and job.get("step_id"):
            illustration_components[job["step_id"]] = ComponentResponse(
                status=job["status"],
                job_id=job["job_id"],
                error=job.get("error"),
            )

    assets: list[dict[str, Any]] = []
    for asset in result["assets"]:
        url = await storage.create_signed_download_url(
            asset["bucket"],
            asset["path"],
            settings.signed_download_url_seconds,
        )
        assets.append(
            {
                "kind": asset["kind"],
                "step_id": asset["step_id"],
                "mime_type": asset["mime_type"],
                "byte_size": asset["byte_size"],
                "url": url,
            }
        )

    return ProjectResponse(
        project_id=project["id"],
        status=project["status"],
        created_at=project["created_at"],
        input_status=ideas_result.input_status if ideas_result else None,
        object_profile=object_profile,
        ideas=ideas_result,
        selected_idea_id=project["selected_idea_id"],
        guide=guide_result,
        components={"mesh": component("mesh"), "ideas": component("ideas"), "guide": component("guide")},
        illustrations=illustration_components,
        assets=assets,
    )


@router.post(
    "/{project_id}/guide",
    response_model=JobMutationResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def create_guide(
    project_id: UUID,
    body: CreateGuideRequest,
    idempotency_key: IdempotencyHeader,
    repository: Annotated[ProjectRepository, Depends(get_project_repository)],
) -> JobMutationResponse:
    job = await repository.create_guide_job(
        project_id=project_id,
        idea_id=body.idea_id,
        idempotency_key=idempotency_key,
    )
    return JobMutationResponse(project_id=project_id, job_id=job["job_id"], status=job["status"])


@router.post(
    "/{project_id}/retry",
    response_model=JobMutationResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def retry_job(
    project_id: UUID,
    body: RetryRequest,
    idempotency_key: IdempotencyHeader,
    repository: Annotated[ProjectRepository, Depends(get_project_repository)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> JobMutationResponse:
    job = await repository.retry_job(
        project_id=project_id,
        job_id=body.job_id,
        idempotency_key=idempotency_key,
        max_mesh_attempts=settings.max_mesh_attempts,
        max_job_attempts=settings.max_job_attempts,
    )
    return JobMutationResponse(project_id=project_id, job_id=job["job_id"], status=job["status"])
