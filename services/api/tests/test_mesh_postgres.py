"""Real SQL checks in a disposable database, never the app database.

Set BEKAS_TEST_POSTGRES_DSN to an isolated local Postgres admin DSN.
The test creates/drops its own bekas_test_* database and applies all migrations.
"""
from __future__ import annotations

import asyncio
import os
from pathlib import Path
from uuid import uuid4

import asyncpg
import pytest

from app.repositories.projects import ProjectRepository
from app.services.storage import StoredImage


@pytest.mark.skipif(not os.getenv("BEKAS_TEST_POSTGRES_DSN"), reason="isolated Postgres DSN not configured")
def test_mesh_claim_recovery_stale_results_and_atomic_completion():
    async def scenario():
        admin = await asyncpg.connect(os.environ["BEKAS_TEST_POSTGRES_DSN"], timeout=5)
        name = "bekas_test_" + uuid4().hex
        pool = None
        try:
            await admin.execute(f'create database "{name}"')
            for role in ("anon", "authenticated"):
                if not await admin.fetchval("select 1 from pg_roles where rolname = $1", role):
                    await admin.execute(f'create role "{role}"')
            pool = await asyncpg.create_pool(
                os.environ["BEKAS_TEST_POSTGRES_DSN"], database=name,
                min_size=1, max_size=3, command_timeout=10,
            )
            migrations = Path(__file__).resolve().parents[3] / "database" / "migrations"
            async with pool.acquire() as connection:
                for path in sorted(migrations.glob("*.sql")):
                    await connection.execute(path.read_text(encoding="utf-8"))
            repo = ProjectRepository(pool)
            project = await repo.create_upload_project(
                idempotency_key="create-" + uuid4().hex, max_active_projects=2, upload_ttl_seconds=1800,
            )
            start = {"project_id": project["id"], "image": StoredImage("image/jpeg", 100, "a" * 64, 32, 24),
                     "bucket": "bekas-assets", "path": "input.jpg"}
            await repo.start_project(**start)
            await repo.start_project(**start)
            assert await pool.fetchval("select count(*) from jobs") == 2
            claims = await asyncio.gather(*[
                repo.claim_mesh_job(max_attempts=2, timeout_seconds=60) for _ in range(2)
            ])
            assert sum(c is not None for c in claims) == 1
            first = next(c for c in claims if c)
            assert first["attempt"] == 1
            await pool.execute("update jobs set lease_expires_at = now() - interval '1 second' where id = $1", first["job_id"])
            second = await repo.claim_mesh_job(max_attempts=2, timeout_seconds=60)
            assert second["attempt"] == 2
            assert second["claim_token"] != first["claim_token"]
            asset = {"bucket": "bekas-assets", "path": "model.glb", "byte_size": 100, "checksum": "b" * 64,
                     "duration_ms": 10, "space_id": "stabilityai/stable-fast-3d"}
            assert not await repo.complete_mesh_job(first, **asset)
            with pytest.raises(asyncpg.CheckViolationError):
                await repo.complete_mesh_job(second, **{**asset, "byte_size": -1})
            assert await pool.fetchval("select status from jobs where id = $1", second["job_id"]) == "running"
            assert await pool.fetchval("select count(*) from assets where kind = 'mesh'") == 0
            assert await repo.complete_mesh_job(second, **asset)
            assert not await repo.complete_mesh_job(second, **asset)
            result = await repo.get_project(project["id"])
            assert len([a for a in result["assets"] if a["kind"] == "mesh"]) == 1
            assert next(j for j in result["jobs"] if j["kind"] == "mesh")["status"] == "succeeded"
            assert result["project"]["status"] == "active"  # ideas has its own independent status
            await pool.execute("update jobs set status = 'failed' where kind = 'ideas'")
            assert (await repo.get_project(project["id"]))["project"]["status"] == "completed"
            # Terminal jobs release the shared processing slot.
            for _ in range(2):
                await repo.create_upload_project(idempotency_key=uuid4().hex, max_active_projects=2, upload_ttl_seconds=60)
        finally:
            if pool:
                await pool.close()
            await admin.execute(f'drop database if exists "{name}" with (force)')
            await admin.close()

    asyncio.run(asyncio.wait_for(scenario(), timeout=45))
