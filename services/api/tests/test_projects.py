from __future__ import annotations

from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.dependencies import get_project_repository, get_settings, get_storage_service
from app.errors import ApiError
from app.main import app
from app.services.storage import StoredImage


class FakeProjectRepository:
    def __init__(self) -> None:
        self.project_id = uuid4()
        self.create_keys: list[str] = []
        self.started_image: StoredImage | None = None
        self.context = {
            "id": self.project_id,
            "status": "upload_pending",
            "upload_expires_at": datetime.now(UTC) + timedelta(minutes=20),
            "input_asset_id": None,
        }

    async def create_upload_project(self, **kwargs):
        self.create_keys.append(kwargs["idempotency_key"])
        return self.context

    async def get_upload_context(self, _project_id):
        return self.context

    async def start_project(self, **kwargs):
        self.started_image = kwargs["image"]
        self.context["status"] = "active"
        self.context["input_asset_id"] = uuid4()
        return {
            "project_id": self.project_id,
            "status": "active",
            "jobs": [
                {
                    "job_id": uuid4(),
                    "kind": "ideas",
                    "step_id": None,
                    "status": "queued",
                    "attempt": 0,
                    "error": None,
                },
                {
                    "job_id": uuid4(),
                    "kind": "mesh",
                    "step_id": None,
                    "status": "queued",
                    "attempt": 0,
                    "error": None,
                },
            ],
        }

    async def get_project(self, project_id):
        if project_id != self.project_id:
            return None
        return {
            "project": {
                "id": self.project_id,
                "status": "active",
                "created_at": datetime.now(UTC),
                "object_profile": None,
                "ideas": None,
                "selected_idea_id": None,
                "guide": None,
            },
            "jobs": [
                {
                    "job_id": uuid4(),
                    "kind": "mesh",
                    "step_id": None,
                    "status": "queued",
                    "attempt": 0,
                    "error": None,
                }
            ],
            "assets": [
                {
                    "kind": "input",
                    "step_id": None,
                    "bucket": "bekas-assets",
                    "path": f"projects/{self.project_id}/input/source.jpg",
                    "mime_type": "image/jpeg",
                    "byte_size": 1024,
                }
            ],
        }

    async def create_guide_job(self, **_kwargs):
        raise ApiError(409, "ideas_not_ready", "Ide belum siap untuk proyek ini", retryable=True)

    async def retry_job(self, *, project_id, job_id, idempotency_key, **_kwargs):
        return {
            "project_id": project_id,
            "job_id": job_id,
            "status": "queued",
            "idempotency_key": idempotency_key,
        }


class FakeStorageService:
    def __init__(self) -> None:
        self.image = StoredImage(
            mime_type="image/jpeg",
            byte_size=1024,
            checksum_sha256="a" * 64,
            width=900,
            height=1200,
        )
        self.missing_image = False

    async def create_signed_upload_url(self, _bucket, path):
        return f"https://storage.example/upload/{path}?token=temporary"

    async def inspect_uploaded_image(self, _bucket, _path):
        if self.missing_image:
            raise ApiError(409, "input_not_uploaded", "Upload foto belum ditemukan")
        return self.image

    async def create_signed_download_url(self, _bucket, path, _expires_in):
        return f"https://storage.example/download/{path}?token=temporary"


@pytest.fixture
def api_client():
    repository = FakeProjectRepository()
    storage = FakeStorageService()
    app.dependency_overrides[get_project_repository] = lambda: repository
    app.dependency_overrides[get_storage_service] = lambda: storage
    app.dependency_overrides[get_settings] = lambda: Settings(
        supabase_storage_bucket="bekas-assets",
        signed_download_url_seconds=900,
        max_mesh_attempts=2,
        max_job_attempts=3,
    )
    with TestClient(app) as client:
        yield client, repository, storage
    app.dependency_overrides.clear()


def test_create_project_returns_idempotent_upload_target(api_client) -> None:
    client, repository, _ = api_client
    response = client.post("/projects", headers={"Idempotency-Key": "create-project-key-0001"})

    assert response.status_code == 201
    body = response.json()
    assert UUID(body["project_id"]) == repository.project_id
    assert body["status"] == "upload_pending"
    assert body["upload_target"]["method"] == "PUT"
    assert body["upload_target"]["headers"] == {"Content-Type": "image/jpeg"}
    assert "token=temporary" in body["upload_target"]["url"]
    assert repository.create_keys == ["create-project-key-0001"]


def test_start_validates_uploaded_photo_then_queues_mesh_and_ideas(api_client) -> None:
    client, repository, _ = api_client
    response = client.post(f"/projects/{repository.project_id}/start")

    assert response.status_code == 202
    body = response.json()
    assert body["project_id"] == str(repository.project_id)
    assert body["status"] == "active"
    assert {job["kind"] for job in body["jobs"]} == {"mesh", "ideas"}
    assert repository.started_image is not None
    assert repository.started_image.checksum_sha256 == "a" * 64


def test_start_does_not_enqueue_when_photo_missing(api_client) -> None:
    client, repository, storage = api_client
    storage.missing_image = True
    response = client.post(f"/projects/{repository.project_id}/start")

    assert response.status_code == 409
    assert response.json()["code"] == "input_not_uploaded"
    assert repository.started_image is None


def test_get_project_returns_component_status_and_fresh_asset_url(api_client) -> None:
    client, repository, _ = api_client
    response = client.get(f"/projects/{repository.project_id}")

    assert response.status_code == 200
    body = response.json()
    assert body["components"]["mesh"]["status"] == "queued"
    assert body["components"]["ideas"]["status"] == "not_started"
    assert body["assets"][0]["kind"] == "input"
    assert "token=temporary" in body["assets"][0]["url"]


def test_guide_is_rejected_until_ideas_are_persisted(api_client) -> None:
    client, repository, _ = api_client
    response = client.post(
        f"/projects/{repository.project_id}/guide",
        headers={"Idempotency-Key": "guide-job-key-00001"},
        json={"idea_id": "desk-organizer"},
    )

    assert response.status_code == 409
    assert response.json() == {
        "code": "ideas_not_ready",
        "message": "Ide belum siap untuk proyek ini",
        "retryable": True,
    }


def test_retry_returns_existing_job_id(api_client) -> None:
    client, repository, _ = api_client
    job_id = uuid4()
    response = client.post(
        f"/projects/{repository.project_id}/retry",
        headers={"Idempotency-Key": "retry-job-key-00001"},
        json={"job_id": str(job_id)},
    )

    assert response.status_code == 202
    assert response.json() == {
        "project_id": str(repository.project_id),
        "job_id": str(job_id),
        "status": "queued",
    }
