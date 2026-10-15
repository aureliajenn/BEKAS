from __future__ import annotations

from typing import Any

from fastapi import Request

from app.config import Settings
from app.errors import ApiError
from app.repositories.projects import ProjectRepository
from app.services.storage import SupabaseStorageService


def get_settings(request: Request) -> Settings:
    settings = getattr(request.app.state, "settings", None)
    return settings if settings is not None else Settings()


def get_project_repository(request: Request) -> ProjectRepository:
    pool = getattr(request.app.state, "db_pool", None)
    if pool is None:
        raise ApiError(503, "database_unavailable", "Database is not configured", retryable=True)
    return ProjectRepository(pool)


def get_storage_service(request: Request) -> SupabaseStorageService:
    client: Any = getattr(request.app.state, "supabase", None)
    settings = get_settings(request)
    if client is None or not settings.supabase_url or not settings.supabase_service_role_key:
        raise ApiError(503, "storage_unavailable", "Storage is not configured", retryable=True)
    return SupabaseStorageService(
        client=client,
        supabase_url=settings.supabase_url,
        service_role_key=settings.supabase_service_role_key,
        max_upload_bytes=settings.max_upload_bytes,
        max_image_dimension=settings.max_image_dimension,
    )
