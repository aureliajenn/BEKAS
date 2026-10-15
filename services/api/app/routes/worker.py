from __future__ import annotations

import hmac
import json
from typing import Annotated, Any, Literal
from urllib.parse import quote

import asyncpg
import httpx
from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response, status
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool

from app.config import Settings
from app.dependencies import get_settings

router = APIRouter(prefix="/worker/jobs", tags=["worker"])

MAX_GLB_BYTES = 25_000_000


class ClaimRequest(BaseModel):
    worker_id: str = Field(min_length=1, max_length=100)
    supported_kinds: list[Literal["mesh"]] = Field(default_factory=lambda: ["mesh"])


class HeartbeatRequest(BaseModel):
    worker_id: str = Field(min_length=1, max_length=100)
    claim_token: str = Field(min_length=16, max_length=100)
    refresh_upload_url: bool = False


class CompleteRequest(BaseModel):
    claim_token: str = Field(min_length=16, max_length=100)
    output_bucket: str = Field(min_length=1, max_length=100)
    output_path: str = Field(min_length=1, max_length=500)
    mime_type: Literal["model/gltf-binary"]
    byte_size: int = Field(gt=0, le=MAX_GLB_BYTES)
    checksum_sha256: str = Field(pattern=r"^[a-fA-F0-9]{64}$")
    model: Literal["sf3d", "triposr"]
    model_version: str = Field(min_length=1, max_length=100)
    fallback_used: bool
    timing: dict[str, int] = Field(default_factory=dict)


class JobError(BaseModel):
    code: str = Field(min_length=1, max_length=100)
    message: str = Field(min_length=1, max_length=500)
    retryable: bool


class FailRequest(BaseModel):
    claim_token: str = Field(min_length=16, max_length=100)
    error: JobError


async def require_worker_token(
    request: Request,
    settings: Annotated[Settings, Depends(get_settings)],
    authorization: Annotated[str | None, Header()] = None,
) -> None:
    expected = settings.worker_token or ""
    if not expected:
        raise HTTPException(status_code=503, detail="Worker API is not configured")
    scheme, _, supplied = (authorization or "").partition(" ")
    if scheme.lower() != "bearer" or not hmac.compare_digest(supplied, expected):
        raise HTTPException(status_code=401, detail="Invalid worker credentials")
    if getattr(request.app.state, "db_pool", None) is None:
        raise HTTPException(status_code=503, detail="Database is not configured")


WorkerAuth = Annotated[None, Depends(require_worker_token)]


def _storage_client(request: Request) -> Any:
    client = getattr(request.app.state, "supabase", None)
    if client is None:
        raise HTTPException(status_code=503, detail="Storage is not configured")
    return client


def _signed_download(storage: Any, bucket: str, path: str, expires_in: int) -> str:
    response = storage.storage.from_(bucket).create_signed_url(path, expires_in)
    url = response.get("signedURL") or response.get("signedUrl")
    if not url:
        raise RuntimeError("Storage did not return a signed download URL")
    return str(url)


def _signed_upload(storage: Any, bucket: str, path: str) -> str:
    response = storage.storage.from_(bucket).create_signed_upload_url(path)
    url = response.get("signed_url") or response.get("signedUrl")
    if not url:
        raise RuntimeError("Storage did not return a signed upload URL")
    return str(url)


async def _release_claim(
    pool: asyncpg.Pool,
    job_id: str,
    claim_token: str,
    max_attempts: int,
) -> None:
    async with pool.acquire() as connection:
        await connection.execute(
            """
            update public.jobs
               set status = case when attempt < $3 then 'retry_wait' else 'failed' end,
                   claim_token = null,
                   lease_expires_at = null,
                   next_run_at = case
                       when attempt < $3 then now() + interval '5 seconds'
                       else next_run_at
                   end,
                   error = jsonb_build_object(
                       'code', 'transfer_url_failed',
                       'retryable', attempt < $3
                   ),
                   completed_at = case when attempt >= $3 then now() else null end,
                   updated_at = now()
             where id = $1::uuid
               and status = 'running'
               and claim_token = $2::uuid
            """,
            job_id,
            claim_token,
            max_attempts,
        )


@router.post("/claim", dependencies=[Depends(require_worker_token)], response_model=None)
async def claim_job(
    body: ClaimRequest,
    request: Request,
    settings: Annotated[Settings, Depends(get_settings)],
) -> Response | dict[str, Any]:
    pool: asyncpg.Pool = request.app.state.db_pool
    output_bucket = settings.supabase_storage_bucket

    async with pool.acquire() as connection:
        async with connection.transaction():
            await connection.execute(
                "select pg_advisory_xact_lock(4202401)"
            )
            await connection.execute(
                """
                update public.jobs
                   set status = 'failed',
                       claim_token = null,
                       lease_expires_at = null,
                       error = '{"code":"lease_expired","retryable":false}'::jsonb,
                       completed_at = now(),
                       updated_at = now()
                 where kind = 'mesh'
                   and status = 'running'
                   and lease_expires_at <= now()
                   and attempt >= $1
                """,
                settings.max_mesh_attempts,
            )
            claimed = await connection.fetchrow(
                """
                with candidate as (
                    select id
                      from public.jobs
                     where kind = any($1::text[])
                       and attempt < $2
                       and not exists (
                           select 1
                             from public.jobs as active
                            where active.kind = 'mesh'
                              and active.status = 'running'
                              and active.lease_expires_at > now()
                       )
                       and (
                            (status in ('queued', 'retry_wait') and next_run_at <= now())
                            or (status = 'running' and lease_expires_at <= now())
                       )
                     order by created_at
                     limit 1
                     for update skip locked
                )
                update public.jobs as job
                   set status = 'running',
                       attempt = job.attempt + 1,
                       claim_token = gen_random_uuid(),
                       lease_expires_at = now() + ($3 * interval '1 second'),
                       started_at = now(),
                       updated_at = now()
                  from candidate
                 where job.id = candidate.id
                returning job.id, job.project_id, job.attempt, job.claim_token,
                          job.lease_expires_at
                """,
                body.supported_kinds,
                settings.max_mesh_attempts,
                settings.worker_lease_seconds,
            )
            if claimed is None:
                return Response(status_code=status.HTTP_204_NO_CONTENT)

            source = await connection.fetchrow(
                """
                select asset.bucket, asset.path, asset.checksum_sha256
                  from public.projects as project
                  join public.assets as asset on asset.id = project.input_asset_id
                 where project.id = $1::uuid
                   and asset.kind = 'input'
                   and asset.is_active
                """,
                str(claimed["project_id"]),
            )
            if source is None:
                await connection.execute(
                    """
                    update public.jobs
                       set status = 'failed',
                           claim_token = null,
                           lease_expires_at = null,
                           error = '{"code":"input_asset_missing","retryable":false}'::jsonb,
                           completed_at = now(),
                           updated_at = now()
                     where id = $1::uuid
                    """,
                    str(claimed["id"]),
                )
                return Response(status_code=status.HTTP_204_NO_CONTENT)

    job_id = str(claimed["id"])
    project_id = str(claimed["project_id"])
    attempt = int(claimed["attempt"])
    claim_token = str(claimed["claim_token"])
    output_path = f"projects/{project_id}/mesh/attempt-{attempt}/model.glb"
    try:
        storage = _storage_client(request)
        input_url, upload_url = await run_in_threadpool(
            lambda: (
                _signed_download(
                    storage,
                    str(source["bucket"]),
                    str(source["path"]),
                    settings.signed_download_url_seconds,
                ),
                _signed_upload(storage, output_bucket, output_path),
            )
        )
    except Exception as exc:
        await _release_claim(pool, job_id, claim_token, settings.max_mesh_attempts)
        raise HTTPException(status_code=502, detail="Could not issue asset transfer URLs") from exc

    return {
        "job_id": job_id,
        "project_id": project_id,
        "attempt": attempt,
        "claim_token": claim_token,
        "input_url": input_url,
        "input_sha256": str(source["checksum_sha256"]).lower(),
        "output_bucket": output_bucket,
        "output_path": output_path,
        "output_upload_url": upload_url,
        "lease_expires_at": claimed.get("lease_expires_at").isoformat()
        if claimed.get("lease_expires_at")
        else None,
    }


@router.post("/{job_id}/heartbeat", dependencies=[Depends(require_worker_token)])
async def heartbeat(
    job_id: str,
    body: HeartbeatRequest,
    request: Request,
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict[str, Any]:
    pool: asyncpg.Pool = request.app.state.db_pool
    row = await pool.fetchrow(
        """
        update public.jobs
           set lease_expires_at = now() + ($3 * interval '1 second'),
               updated_at = now()
         where id = $1::uuid
           and kind = 'mesh'
           and status = 'running'
           and claim_token = $2::uuid
           and lease_expires_at > now()
        returning project_id, attempt, lease_expires_at
        """,
        job_id,
        body.claim_token,
        settings.worker_lease_seconds,
    )
    if row is None:
        raise HTTPException(status_code=409, detail="Worker claim is no longer active")

    result: dict[str, Any] = {"lease_expires_at": row["lease_expires_at"].isoformat()}
    if body.refresh_upload_url:
        bucket = settings.supabase_storage_bucket
        path = f"projects/{row['project_id']}/mesh/attempt-{row['attempt']}/model.glb"
        storage = _storage_client(request)
        try:
            result["output_upload_url"] = await run_in_threadpool(
                _signed_upload, storage, bucket, path
            )
        except Exception as exc:
            raise HTTPException(status_code=502, detail="Could not refresh upload URL") from exc
    return result


async def _stored_asset_exists(
    settings: Settings,
    bucket: str,
    path: str,
    expected_size: int,
) -> bool:
    supabase_url = (settings.supabase_url or "").rstrip("/")
    service_key = settings.supabase_service_role_key or ""
    if not supabase_url or not service_key:
        raise HTTPException(status_code=503, detail="Storage verification is not configured")
    encoded_bucket = quote(bucket, safe="")
    encoded_path = quote(path, safe="/")
    url = f"{supabase_url}/storage/v1/object/{encoded_bucket}/{encoded_path}"
    headers = {"apikey": service_key, "Authorization": f"Bearer {service_key}"}
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.head(url, headers=headers)
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail="Could not verify uploaded mesh") from exc
    if response.status_code == 404:
        return False
    if response.status_code >= 400:
        raise HTTPException(status_code=502, detail="Could not verify uploaded mesh")
    content_length = response.headers.get("content-length")
    return content_length is None or int(content_length) == expected_size


@router.post("/{job_id}/complete", status_code=status.HTTP_204_NO_CONTENT)
async def complete_job(
    job_id: str,
    body: CompleteRequest,
    request: Request,
    _: WorkerAuth,
    settings: Annotated[Settings, Depends(get_settings)],
) -> Response:
    pool: asyncpg.Pool = request.app.state.db_pool
    expected_bucket = settings.supabase_storage_bucket
    if body.byte_size > settings.max_glb_bytes:
        raise HTTPException(status_code=413, detail="GLB exceeds the configured 10 MB limit")
    if body.output_bucket != expected_bucket:
        raise HTTPException(status_code=422, detail="Unexpected output bucket")
    if not await _stored_asset_exists(settings, body.output_bucket, body.output_path, body.byte_size):
        raise HTTPException(status_code=409, detail="Uploaded mesh was not found")

    async with pool.acquire() as connection:
        async with connection.transaction():
            job = await connection.fetchrow(
                "select project_id, attempt, status, claim_token, lease_expires_at, lease_expires_at > now() as lease_active from public.jobs where id = $1::uuid for update",
                job_id,
            )
            if job is None:
                raise HTTPException(status_code=404, detail="Mesh job not found")

            project_id = str(job["project_id"])
            expected_path = f"projects/{project_id}/mesh/attempt-{job['attempt']}/model.glb"
            if body.output_path != expected_path:
                raise HTTPException(status_code=422, detail="Output path does not match active attempt")

            if job["status"] == "succeeded":
                existing = await connection.fetchrow(
                    """
                    select checksum_sha256
                      from public.assets
                     where source_job_id = $1::uuid
                       and source_attempt = $2
                       and bucket = $3
                       and path = $4
                    """,
                    job_id,
                    job["attempt"],
                    body.output_bucket,
                    body.output_path,
                )
                if existing and existing["checksum_sha256"] == body.checksum_sha256.lower():
                    return Response(status_code=status.HTTP_204_NO_CONTENT)
                raise HTTPException(status_code=409, detail="Job already completed with different output")

            if (
                job["status"] != "running"
                or str(job["claim_token"]) != body.claim_token
                or not job["lease_active"]
            ):
                raise HTTPException(status_code=409, detail="Worker claim is no longer active")

            await connection.execute(
                "update public.assets set is_active = false where project_id = $1::uuid and kind = 'mesh' and is_active",
                project_id,
            )
            await connection.execute(
                """
                insert into public.assets (
                    project_id, kind, bucket, path, mime_type, byte_size,
                    checksum_sha256, source_job_id, source_attempt, is_active
                ) values ($1::uuid, 'mesh', $2, $3, $4, $5, $6, $7::uuid, $8, true)
                on conflict (bucket, path) do update
                    set project_id = excluded.project_id,
                        kind = excluded.kind,
                        mime_type = excluded.mime_type,
                        byte_size = excluded.byte_size,
                        checksum_sha256 = excluded.checksum_sha256,
                        source_job_id = excluded.source_job_id,
                        source_attempt = excluded.source_attempt,
                        is_active = true
                """,
                project_id,
                body.output_bucket,
                body.output_path,
                body.mime_type,
                body.byte_size,
                body.checksum_sha256.lower(),
                job_id,
                job["attempt"],
            )
            await connection.execute(
                """
                update public.jobs
                   set status = 'succeeded',
                       claim_token = null,
                       lease_expires_at = null,
                       timing = timing || $2::jsonb,
                       usage = usage || $3::jsonb,
                       completed_at = now(),
                       updated_at = now()
                 where id = $1::uuid
                """,
                job_id,
                json.dumps(body.timing),
                json.dumps(
                    {
                        "model": body.model,
                        "model_version": body.model_version,
                        "fallback_used": body.fallback_used,
                    }
                ),
            )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{job_id}/fail", status_code=status.HTTP_204_NO_CONTENT)
async def fail_job(
    job_id: str,
    body: FailRequest,
    request: Request,
    _: WorkerAuth,
    settings: Annotated[Settings, Depends(get_settings)],
) -> Response:
    pool: asyncpg.Pool = request.app.state.db_pool
    row = await pool.fetchrow(
        """
        update public.jobs
           set status = case
                   when $3::boolean and attempt < $4 then 'retry_wait'
                   else 'failed'
               end,
               claim_token = null,
               lease_expires_at = null,
               next_run_at = case
                   when $3::boolean and attempt < $4
                   then now() + make_interval(secs => least(30, 5 * attempt))
                   else next_run_at
               end,
               error = $5::jsonb,
               completed_at = case when not ($3::boolean and attempt < $4) then now() else null end,
               updated_at = now()
         where id = $1::uuid
           and kind = 'mesh'
           and status = 'running'
           and claim_token = $2::uuid
           and lease_expires_at > now()
         returning id
        """,
        job_id,
        body.claim_token,
        body.error.retryable,
        settings.max_mesh_attempts,
        body.error.model_dump_json(),
    )
    if row is None:
        raise HTTPException(status_code=409, detail="Worker claim is no longer active")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
