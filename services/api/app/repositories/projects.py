from __future__ import annotations

import json
from typing import Any
from uuid import UUID

import asyncpg

from app.errors import ApiError
from app.services.storage import StoredImage

CREATE_PROJECT_LOCK = 4202402


def _json_value(value: Any) -> Any:
    if isinstance(value, str):
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return value
    return value


def _job_dict(row: asyncpg.Record) -> dict[str, Any]:
    result = dict(row)
    if "id" in result:
        result["job_id"] = result.pop("id")
    result["error"] = _json_value(result.get("error"))
    return result


class ProjectRepository:
    def __init__(self, pool: asyncpg.Pool) -> None:
        self.pool = pool

    async def create_upload_project(
        self,
        *,
        idempotency_key: str,
        max_active_projects: int,
        upload_ttl_seconds: int,
    ) -> dict[str, Any]:
        async with self.pool.acquire() as connection:
            async with connection.transaction():
                await connection.fetchval("select pg_advisory_xact_lock($1)", CREATE_PROJECT_LOCK)

                existing = await connection.fetchrow(
                    """
                    select id, status, upload_expires_at, input_asset_id
                      from public.projects
                     where idempotency_key = $1
                     for update
                    """,
                    idempotency_key,
                )
                if existing:
                    return dict(existing)

                active_count = await connection.fetchval(
                    """
                    select count(*)
                      from public.projects
                     where status = 'active'
                        or (status = 'upload_pending' and upload_expires_at > now())
                    """
                )
                if int(active_count or 0) >= max_active_projects:
                    raise ApiError(
                        429,
                        "active_project_limit",
                        "Batas dua proyek aktif sudah tercapai. Coba lagi setelah proyek selesai.",
                        retryable=True,
                    )

                row = await connection.fetchrow(
                    """
                    insert into public.projects (idempotency_key, upload_expires_at)
                    values ($1, now() + ($2 * interval '1 second'))
                    returning id, status, upload_expires_at, input_asset_id
                    """,
                    idempotency_key,
                    upload_ttl_seconds,
                )
                return dict(row)

    async def get_upload_context(self, project_id: UUID) -> dict[str, Any]:
        expired = False
        async with self.pool.acquire() as connection:
            async with connection.transaction():
                row = await connection.fetchrow(
                    """
                    select id, status, upload_expires_at, input_asset_id,
                           coalesce(upload_expires_at <= now(), false) as upload_expired
                      from public.projects
                     where id = $1
                     for update
                    """,
                    project_id,
                )
                if row is None:
                    raise ApiError(404, "project_not_found", "Proyek tidak ditemukan")

                if (
                    row["status"] == "upload_pending"
                    and row["upload_expired"]
                ):
                    await connection.execute(
                        "update public.projects set status = 'expired', updated_at = now() where id = $1",
                        project_id,
                    )
                    expired = True
                    row = dict(row)
                    row["status"] = "expired"
                result = dict(row)

        if expired:
            raise ApiError(410, "upload_expired", "Masa upload foto habis. Buat proyek baru.")
        return result

    async def start_project(
        self,
        *,
        project_id: UUID,
        image: StoredImage | None,
        bucket: str,
        path: str,
    ) -> dict[str, Any]:
        expired = False
        async with self.pool.acquire() as connection:
            async with connection.transaction():
                project = await connection.fetchrow(
                    """
                    select id, status, upload_expires_at, input_asset_id,
                           coalesce(upload_expires_at <= now(), false) as upload_expired
                      from public.projects
                     where id = $1
                     for update
                    """,
                    project_id,
                )
                if project is None:
                    raise ApiError(404, "project_not_found", "Proyek tidak ditemukan")

                if project["input_asset_id"] is not None:
                    jobs = await self._fetch_start_jobs(connection, project_id)
                    return {"project_id": project_id, "status": project["status"], "jobs": jobs}

                if project["status"] != "upload_pending":
                    raise ApiError(409, "project_not_upload_pending", "Proyek tidak menunggu upload")

                if image is None:
                    raise ApiError(409, "input_not_uploaded", "Upload foto belum ditemukan")

                if (
                    project["upload_expired"]
                ):
                    await connection.execute(
                        "update public.projects set status = 'expired', updated_at = now() where id = $1",
                        project_id,
                    )
                    expired = True
                else:
                    asset_id = await connection.fetchval(
                        """
                        insert into public.assets (
                            project_id, kind, bucket, path, mime_type, byte_size, checksum_sha256
                        ) values ($1, 'input', $2, $3, $4, $5, $6)
                        returning id
                        """,
                        project_id,
                        bucket,
                        path,
                        image.mime_type,
                        image.byte_size,
                        image.checksum_sha256,
                    )
                    await connection.execute(
                        """
                        update public.projects
                           set input_asset_id = $2,
                               status = 'active',
                               updated_at = now()
                         where id = $1
                        """,
                        project_id,
                        asset_id,
                    )

                    for kind in ("mesh", "ideas"):
                        await connection.execute(
                            """
                            insert into public.jobs (
                                project_id, kind, status, attempt, idempotency_key
                            ) values ($1, $2, 'queued', 0, $3)
                            on conflict do nothing
                            """,
                            project_id,
                            kind,
                            f"project-start:{project_id}:{kind}",
                        )

                if expired:
                    result = None
                else:
                    jobs = await self._fetch_start_jobs(connection, project_id)
                    result = {"project_id": project_id, "status": "active", "jobs": jobs}

        if expired:
            raise ApiError(410, "upload_expired", "Masa upload foto habis. Buat proyek baru.")
        return result or {}

    @staticmethod
    async def _fetch_start_jobs(connection: asyncpg.Connection, project_id: UUID) -> list[dict[str, Any]]:
        rows = await connection.fetch(
            """
            select id as job_id, kind, step_id, status, attempt, error
              from public.jobs
             where project_id = $1
               and kind in ('mesh', 'ideas')
             order by kind
            """,
            project_id,
        )
        return [_job_dict(row) for row in rows]

    async def get_project(self, project_id: UUID) -> dict[str, Any] | None:
        async with self.pool.acquire() as connection:
            project = await connection.fetchrow(
                """
                select id, status, object_profile, ideas, selected_idea_id, guide,
                       schema_version, prompt_version, text_model, image_model, created_at
                  from public.projects
                 where id = $1
                """,
                project_id,
            )
            if project is None:
                return None
            jobs = await connection.fetch(
                """
                select id as job_id, kind, step_id, status, attempt, error
                  from public.jobs
                 where project_id = $1
                 order by created_at
                """,
                project_id,
            )
            assets = await connection.fetch(
                """
                select kind, step_id, bucket, path, mime_type, byte_size
                  from public.assets
                 where project_id = $1 and is_active
                 order by created_at
                """,
                project_id,
            )
        project_data = dict(project)
        project_data["object_profile"] = _json_value(project_data.get("object_profile"))
        project_data["ideas"] = _json_value(project_data.get("ideas"))
        project_data["guide"] = _json_value(project_data.get("guide"))
        return {
            "project": project_data,
            "jobs": [_job_dict(row) for row in jobs],
            "assets": [dict(row) for row in assets],
        }

    async def create_guide_job(
        self,
        *,
        project_id: UUID,
        idea_id: str,
        idempotency_key: str,
    ) -> dict[str, Any]:
        async with self.pool.acquire() as connection:
            async with connection.transaction():
                project = await connection.fetchrow(
                    "select ideas, selected_idea_id from public.projects where id = $1 for update",
                    project_id,
                )
                if project is None:
                    raise ApiError(404, "project_not_found", "Proyek tidak ditemukan")

                ideas = _json_value(project["ideas"])
                if isinstance(ideas, dict):
                    if ideas.get("input_status") != "accepted":
                        raise ApiError(409, "ideas_not_ready", "Ide belum siap untuk proyek ini", retryable=True)
                    idea_items = ideas.get("ideas")
                else:
                    idea_items = ideas
                if not isinstance(idea_items, list):
                    raise ApiError(409, "ideas_not_ready", "Ide belum siap untuk proyek ini", retryable=True)
                if not any(isinstance(idea, dict) and idea.get("id") == idea_id for idea in idea_items):
                    raise ApiError(422, "idea_not_in_project", "Ide tidak tersedia pada proyek ini")
                selected_idea_id = project["selected_idea_id"]
                if selected_idea_id and selected_idea_id != idea_id:
                    raise ApiError(409, "guide_already_selected", "Panduan proyek ini sudah memakai ide lain")

                existing = await connection.fetchrow(
                    "select id, status, attempt, error from public.jobs where project_id = $1 and kind = 'guide'",
                    project_id,
                )
                if existing:
                    return {
                        "project_id": project_id,
                        "job_id": existing["id"],
                        "status": existing["status"],
                        "attempt": existing["attempt"],
                        "error": _json_value(existing["error"]),
                    }

                job_id = await connection.fetchval(
                    """
                    insert into public.jobs (project_id, kind, status, attempt, idempotency_key)
                    values ($1, 'guide', 'queued', 0, $2)
                    returning id
                    """,
                    project_id,
                    idempotency_key,
                )
                await connection.execute(
                    "update public.projects set selected_idea_id = $2, updated_at = now() where id = $1",
                    project_id,
                    idea_id,
                )
                return {
                    "project_id": project_id,
                    "job_id": job_id,
                    "status": "queued",
                    "attempt": 0,
                    "error": None,
                }

    async def retry_job(
        self,
        *,
        project_id: UUID,
        job_id: UUID,
        idempotency_key: str,
        max_mesh_attempts: int,
        max_job_attempts: int,
    ) -> dict[str, Any]:
        async with self.pool.acquire() as connection:
            async with connection.transaction():
                row = await connection.fetchrow(
                    """
                    select id, kind, status, attempt, error, idempotency_key
                      from public.jobs
                     where id = $1 and project_id = $2
                     for update
                    """,
                    job_id,
                    project_id,
                )
                if row is None:
                    raise ApiError(404, "job_not_found", "Pekerjaan tidak ditemukan pada proyek ini")

                if row["idempotency_key"] == idempotency_key:
                    return {"project_id": project_id, **_job_dict(row)}
                if row["status"] in ("queued", "retry_wait", "running"):
                    return {"project_id": project_id, **_job_dict(row)}
                if row["status"] == "succeeded":
                    raise ApiError(409, "job_already_succeeded", "Pekerjaan sudah berhasil")

                key_owner = await connection.fetchval(
                    "select id from public.jobs where idempotency_key = $1 and id <> $2",
                    idempotency_key,
                    job_id,
                )
                if key_owner is not None:
                    raise ApiError(
                        409,
                        "idempotency_key_reused",
                        "Idempotency-Key sudah digunakan untuk pekerjaan lain",
                    )

                error = _json_value(row["error"])
                if isinstance(error, dict) and error.get("retryable") is False:
                    raise ApiError(409, "job_not_retryable", "Kegagalan ini tidak dapat dicoba ulang")
                max_attempts = max_mesh_attempts if row["kind"] == "mesh" else max_job_attempts
                if int(row["attempt"]) >= max_attempts:
                    raise ApiError(409, "attempt_limit_reached", "Batas percobaan pekerjaan sudah tercapai")

                updated = await connection.fetchrow(
                    """
                    update public.jobs
                       set status = 'queued',
                           claim_token = null,
                           lease_expires_at = null,
                           next_run_at = now(),
                           idempotency_key = $3,
                           error = null,
                           completed_at = null,
                           updated_at = now()
                     where id = $1 and project_id = $2
                    returning id, kind, step_id, status, attempt, error
                    """,
                    job_id,
                    project_id,
                    idempotency_key,
                )
                return {"project_id": project_id, **_job_dict(updated)}

    async def claim_mesh_job(self, *, max_attempts: int, timeout_seconds: int) -> dict[str, Any] | None:
        """One global mesh slot with a fixed deadline; no remote heartbeats."""
        async with self.pool.acquire() as connection, connection.transaction():
            await connection.execute("select pg_advisory_xact_lock(4202401)")
            await connection.execute(
                """update public.jobs set
                    status = case when attempt < $1 then 'retry_wait' else 'failed' end,
                    claim_token = null, lease_expires_at = null, next_run_at = now(),
                    completed_at = case when attempt >= $1 then now() else null end,
                    error = jsonb_build_object('code', 'mesh_timeout',
                        'message', 'Pemrosesan 3D terputus.', 'retryable', attempt < $1),
                    updated_at = now()
                   where kind = 'mesh' and status = 'running' and lease_expires_at <= now()""",
                max_attempts,
            )
            row = await connection.fetchrow(
                """with candidate as (
                    select id from public.jobs
                    where kind = 'mesh' and status in ('queued', 'retry_wait')
                      and next_run_at <= now() and attempt < $1
                      and not exists (select 1 from public.jobs where kind = 'mesh' and status = 'running')
                    order by created_at limit 1 for update skip locked
                )
                update public.jobs job set status = 'running', attempt = attempt + 1,
                    claim_token = gen_random_uuid(), claim_started_at = now(), started_at = now(),
                    lease_expires_at = now() + make_interval(secs => $2), updated_at = now(), error = null
                from candidate where job.id = candidate.id
                returning job.id as job_id, job.project_id, job.attempt, job.claim_token""",
                max_attempts, timeout_seconds,
            )
            if row is None:
                return None
            asset = await connection.fetchrow(
                """select asset.bucket, asset.path, asset.checksum_sha256
                   from public.projects project join public.assets asset on asset.id = project.input_asset_id
                   where project.id = $1""", row["project_id"],
            )
            return {**dict(row), **(dict(asset) if asset else {})}

    async def complete_mesh_job(self, job: dict[str, Any], *, bucket: str, path: str,
                                byte_size: int, checksum: str, duration_ms: int, space_id: str) -> bool:
        async with self.pool.acquire() as connection, connection.transaction():
            current = await connection.fetchrow(
                """select id from public.jobs where id = $1 and status = 'running'
                   and claim_token = $2 and lease_expires_at > now() for update""",
                job["job_id"], job["claim_token"],
            )
            if current is None:
                return False
            await connection.execute(
                "update public.assets set is_active = false where project_id = $1 and kind = 'mesh' and is_active",
                job["project_id"],
            )
            await connection.execute(
                """insert into public.assets (project_id, kind, bucket, path, mime_type,
                       byte_size, checksum_sha256, source_job_id, source_attempt)
                   values ($1, 'mesh', $2, $3, 'model/gltf-binary', $4, $5, $6, $7)""",
                job["project_id"], bucket, path, byte_size, checksum, job["job_id"], job["attempt"],
            )
            await connection.execute(
                """update public.jobs set status = 'succeeded', claim_token = null,
                   lease_expires_at = null, completed_at = now(), updated_at = now(),
                   timing = $2::jsonb, usage = $3::jsonb where id = $1""",
                job["job_id"], json.dumps({"total_ms": duration_ms}),
                json.dumps({"provider": "huggingface_space", "space_id": space_id,
                            "model": "sf3d", "fallback_used": False}),
            )
            return True

    async def fail_mesh_job(self, job: dict[str, Any], *, error: dict[str, Any],
                            max_attempts: int, retry_seconds: int) -> None:
        await self.pool.execute(
            """update public.jobs set
                status = case when $3 and attempt < $4 then 'retry_wait' else 'failed' end,
                error = $5::jsonb, claim_token = null, lease_expires_at = null,
                next_run_at = now() + make_interval(secs => $6),
                completed_at = case when $3 and attempt < $4 then null else now() end, updated_at = now()
               where id = $1 and status = 'running' and claim_token = $2""",
            job["job_id"], job["claim_token"], error["retryable"], max_attempts,
            json.dumps(error), retry_seconds,
        )
