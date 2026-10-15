from fastapi.testclient import TestClient

from app.config import Settings
from app.dependencies import get_settings
from app.main import app

client = TestClient(app)


def test_health_returns_ok() -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_readiness_fails_closed_without_database_and_storage() -> None:
    with TestClient(app) as configured_client:
        response = configured_client.get("/ready")

    assert response.status_code == 503
    assert response.json() == {"status": "not_ready", "database": False, "storage": False}


def test_worker_claim_requires_internal_token(monkeypatch) -> None:
    monkeypatch.setitem(
        app.dependency_overrides,
        get_settings,
        lambda: Settings(worker_token="test-worker-secret"),
    )

    response = client.post(
        "/worker/jobs/claim",
        json={"worker_id": "test-worker", "supported_kinds": ["mesh"]},
    )
    assert response.status_code == 401


def test_worker_api_fails_closed_without_token_config(monkeypatch) -> None:
    monkeypatch.setitem(app.dependency_overrides, get_settings, lambda: Settings(worker_token=None))

    response = client.post(
        "/worker/jobs/claim",
        json={"worker_id": "test-worker", "supported_kinds": ["mesh"]},
    )
    assert response.status_code == 503
