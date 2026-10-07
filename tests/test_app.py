import asyncio
import io
import os
import time

from fastapi.testclient import TestClient
from PIL import Image

from app import main


def photo_bytes(index: int) -> bytes:
    image = Image.new("RGB", (480, 480), (index * 13 % 255, index * 29 % 255, index * 47 % 255))
    output = io.BytesIO()
    image.save(output, format="JPEG", quality=88)
    return output.getvalue()


def test_health_and_upload_flow(tmp_path, monkeypatch):
    monkeypatch.setattr(main, "DATA_DIR", tmp_path)
    monkeypatch.setattr(main, "JOBS", {})
    monkeypatch.setattr(main, "discover_tools", lambda: {
        "colmap": None,
        "interface_colmap": None,
        "densify": None,
        "mesh": None,
        "texture": None,
        "transform": None,
    })
    files = [("files", (f"view-{index}.jpg", photo_bytes(index), "image/jpeg")) for index in range(12)]

    with TestClient(main.app) as client:
        assert client.get("/").status_code == 200
        health = client.get("/api/health").json()
        assert "pipeline_ready" in health

        response = client.post("/api/jobs", data={"name": "test object"}, files=files)
        assert response.status_code == 202, response.text
        process_info = response.json()["process_info"]
        assert process_info["status"] == "queued"
        assert process_info["overall_percent"] == 0
        assert "elapsed_seconds" in process_info
        job_id = response.json()["id"]

        for _ in range(50):
            job = client.get(f"/api/jobs/{job_id}").json()
            if job["status"] in {"failed", "completed"}:
                break
            time.sleep(0.02)

        assert job["image_count"] == 12
        assert (tmp_path / job_id / "manifest.json").is_file()
        assert job["status"] in {"failed", "completed"}
        assert not health["pipeline_ready"]
        assert "Missing reconstruction tools" in job["error"]
        assert client.get(f"/api/jobs/{job_id}/log").status_code == 200


def test_upload_rejects_too_few_images(tmp_path, monkeypatch):
    monkeypatch.setattr(main, "DATA_DIR", tmp_path)
    files = [("files", (f"view-{index}.jpg", photo_bytes(index), "image/jpeg")) for index in range(3)]
    with TestClient(main.app) as client:
        response = client.post("/api/jobs", files=files)
    assert response.status_code == 400
    assert "at least 12" in response.json()["detail"]


def test_upload_rejects_duplicate_images(tmp_path, monkeypatch):
    monkeypatch.setattr(main, "DATA_DIR", tmp_path)
    contents = photo_bytes(3)
    files = [("files", (f"view-{index}.jpg", contents if index < 2 else photo_bytes(index), "image/jpeg")) for index in range(12)]
    with TestClient(main.app) as client:
        response = client.post("/api/jobs", files=files)
    assert response.status_code == 400
    assert "Duplicate photo" in response.json()["detail"]
    assert not list(tmp_path.iterdir())


def test_windows_batch_subprocess_streams_output(tmp_path):
    if os.name != "nt":
        return
    logs = tmp_path / "logs"
    logs.mkdir()
    script = tmp_path / "batch smoke.cmd"
    script.write_text("@echo off\r\necho batch smoke ok\r\nexit /b 0\r\n", encoding="utf-8")
    job = {"paths": {"logs": str(logs)}, "log_tail": [], "stage": "queued", "progress": 0}

    asyncio.run(main._run_command(job, "batch smoke", 5, str(script), cwd=tmp_path))

    assert any("batch smoke ok" in line for line in job["log_tail"])


def test_colmap_log_updates_job_progress(tmp_path):
    logs = tmp_path / "logs"
    logs.mkdir()
    job = {
        "paths": {"logs": str(logs)},
        "log_tail": [],
        "stage": "Extracting features",
        "progress": 8,
        "stage_progress_percent": None,
        "stage_progress_range": (8, 16),
        "image_count": 10,
    }

    main._append_log(job, "Processed file [5/10]\n")

    assert job["stage_progress_percent"] == 50.0
    assert job["progress"] == 12


def test_matching_block_log_updates_stage_progress():
    job = {
        "stage": "Matching images",
        "progress": 18,
        "stage_progress_percent": None,
        "stage_progress_range": (18, 30),
    }

    main._update_progress_from_log(job, "Processing block [1/2, 2/2]")

    assert job["stage_progress_percent"] == 50.0
    assert job["progress"] == 24


def test_fast_profile_trades_mvs_quality_for_runtime():
    fast = main._profile_options("fast")
    balanced = main._profile_options("balanced")
    assert fast["number_views"] < balanced["number_views"]
    assert fast["iterations"] < balanced["iterations"]
    assert fast["geometric_iterations"] < balanced["geometric_iterations"]
    assert fast["max_threads"] > balanced["max_threads"]


def test_openmvs_native_log_is_streamed_before_process_exits(tmp_path):
    if os.name != "nt":
        return
    logs = tmp_path / "logs"
    logs.mkdir()
    script = tmp_path / "DensifyPointCloud.cmd"
    script.write_text(
        "@echo off\r\necho Densify started> DensifyPointCloud-progress.log\r\n"
        "ping 127.0.0.1 -n 5 > nul\r\necho Depth maps fused>> DensifyPointCloud-progress.log\r\n"
        "exit /b 0\r\n",
        encoding="utf-8",
    )
    job = {"paths": {"logs": str(logs)}, "log_tail": [], "stage": "queued", "progress": 0}

    async def observe_live_log():
        task = asyncio.create_task(main._run_command(job, "dense smoke", 68, str(script), cwd=tmp_path))
        for _ in range(20):
            await asyncio.sleep(0.1)
            if any("Densify started" in line for line in job["log_tail"]):
                assert not task.done()
                await task
                return
        await task
        assert any("Densify started" in line for line in job["log_tail"])

    asyncio.run(observe_live_log())
    assert any("Depth maps fused" in line for line in job["log_tail"])
