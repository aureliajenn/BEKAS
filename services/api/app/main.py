from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Annotated

import asyncpg
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from starlette.concurrency import run_in_threadpool

from app.config import Settings
from app.dependencies import get_settings
from app.errors import ApiError
from app.jobs.mesh import MeshJobRunner
from app.routes.projects import router as projects_router
from app.services.storage import SupabaseStorageService


@asynccontextmanager
async def lifespan(application: FastAPI) -> AsyncIterator[None]:
    settings = Settings()
    application.state.settings = settings
    application.state.db_pool = None
    application.state.supabase = None
    mesh_runner = None

    if settings.database_url:
        application.state.db_pool = await asyncpg.create_pool(
            settings.database_url,
            min_size=1,
            max_size=settings.database_pool_max_size,
            ssl=settings.database_ssl,
        )

    if settings.supabase_url and settings.supabase_service_role_key:
        from supabase import create_client

        application.state.supabase = create_client(
            settings.supabase_url,
            settings.supabase_service_role_key,
        )

    try:
        if application.state.db_pool and application.state.supabase and settings.mesh_enabled:
            storage = SupabaseStorageService(
                client=application.state.supabase, supabase_url=settings.supabase_url,
                service_role_key=settings.supabase_service_role_key,
                max_upload_bytes=settings.max_upload_bytes,
                max_image_dimension=settings.max_image_dimension,
            )
            mesh_runner = MeshJobRunner(application.state.db_pool, storage, settings)
            mesh_runner.start()
        yield
    finally:
        if mesh_runner:
            await mesh_runner.stop()
        if application.state.db_pool is not None:
            await application.state.db_pool.close()


app = FastAPI(title="BEKAS API", version="0.3.0", lifespan=lifespan)
app.include_router(projects_router)


@app.exception_handler(ApiError)
async def handle_api_error(_: Request, error: ApiError) -> JSONResponse:
    return JSONResponse(status_code=error.status_code, content=error.as_dict())


@app.exception_handler(HTTPException)
async def handle_http_error(_: Request, error: HTTPException) -> JSONResponse:
    if isinstance(error.detail, dict) and {"code", "message", "retryable"} <= error.detail.keys():
        content = error.detail
    else:
        codes = {
            401: "unauthorized",
            404: "not_found",
            409: "conflict",
            422: "invalid_request",
            502: "upstream_error",
            503: "service_unavailable",
        }
        content = {
            "code": codes.get(error.status_code, "http_error"),
            "message": str(error.detail),
            "retryable": error.status_code >= 500,
        }
    return JSONResponse(status_code=error.status_code, content=content, headers=error.headers)


@app.get("/health", tags=["health"])
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/ready", tags=["health"])
async def ready(
    request: Request,
    settings: Annotated[Settings, Depends(get_settings)],
) -> JSONResponse:
    pool = getattr(request.app.state, "db_pool", None)
    storage = getattr(request.app.state, "supabase", None)
    if pool is None or storage is None:
        return JSONResponse(
            status_code=503,
            content={"status": "not_ready", "database": pool is not None, "storage": storage is not None},
        )
    try:
        await pool.fetchval("select 1")
    except Exception:  # noqa: BLE001 - readiness must report dependency failure without leaking details
        return JSONResponse(
            status_code=503,
            content={"status": "not_ready", "database": False, "storage": True},
        )

    try:
        await run_in_threadpool(
            storage.storage.from_(settings.supabase_storage_bucket).list,
            "",
            {"limit": 1},
        )
    except Exception:  # noqa: BLE001 - SDK dependency errors map to readiness failure
        return JSONResponse(
            status_code=503,
            content={"status": "not_ready", "database": True, "storage": False},
        )
    return JSONResponse(content={"status": "ready", "database": True, "storage": True})
