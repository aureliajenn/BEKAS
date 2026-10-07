from __future__ import annotations

import asyncio
import hashlib
import json
import os
import queue
import re
import shutil
import subprocess
import time
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from PIL import Image, UnidentifiedImageError


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = Path(os.getenv("RECON_DATA_DIR", ROOT / "data")).resolve()
WEB_DIR = ROOT / "web"
MAX_IMAGES = 150
MIN_IMAGES = 12
MAX_IMAGE_BYTES = 30 * 1024 * 1024
MAX_UPLOAD_BYTES = 1024 * 1024 * 1024
ALLOWED_FORMATS = {"JPEG": ".jpg", "PNG": ".png", "WEBP": ".webp"}
RECONSTRUCTION_PROFILES = {
    "fast": {
        "max_resolution": 1024,
        "resolution_level": 1,
        "number_views": 3,
        "iterations": 2,
        "geometric_iterations": 0,
        "sub_resolution_levels": 0,
        "max_threads": 16,
    },
    "balanced": {
        "max_resolution": 1600,
        "resolution_level": 1,
        "number_views": 5,
        "iterations": 3,
        "geometric_iterations": 2,
        "sub_resolution_levels": 2,
        "max_threads": 8,
    },
}
JOBS: dict[str, dict[str, Any]] = {}
JOB_TASKS: set[asyncio.Task[None]] = set()
JOB_LOCK = asyncio.Lock()
PIPELINE_SEMAPHORE = asyncio.Semaphore(1)


def _tool(env_name: str, *candidates: str) -> str | None:
    configured = os.getenv(env_name)
    if configured:
        candidate = Path(configured).expanduser()
        if candidate.is_file():
            return str(candidate.resolve())
        located = shutil.which(configured)
        if located:
            return located
        return None
    use_cuda = os.getenv("OPENMVS_USE_CUDA", "0").lower() in {"1", "true", "yes"}
    preferred_bin = ROOT / "tools" / ("openmvs_cuda" if use_cuda else "openmvs") / "vc17" / "x64" / "Release"
    for name in candidates:
        preferred_candidate = preferred_bin / name
        if preferred_candidate.is_file():
            return str(preferred_candidate.resolve())
        located = shutil.which(name)
        if located:
            return located
        local = ROOT / "tools"
        if local.is_dir():
            for path in local.rglob(name):
                if path.is_file():
                    return str(path.resolve())
    return None


def _openmvs_cuda_args(executable: str | None) -> tuple[str, ...]:
    if not executable:
        return ()
    cuda_bin = (ROOT / "tools" / "openmvs_cuda" / "vc17" / "x64" / "Release").resolve()
    if Path(executable).resolve().is_relative_to(cuda_bin):
        return "--cuda-device", os.getenv("OPENMVS_CUDA_DEVICE", "0")
    return ()


def discover_tools() -> dict[str, str | None]:
    return {
        "colmap": _tool("COLMAP_BIN", "COLMAP.bat", "colmap", "colmap.exe"),
        "interface_colmap": _tool(
            "OPENMVS_INTERFACE_COLMAP", "InterfaceCOLMAP", "InterfaceCOLMAP.exe"
        ),
        "densify": _tool(
            "OPENMVS_DENSIFY", "DensifyPointCloud", "DensifyPointCloud.exe"
        ),
        "mesh": _tool("OPENMVS_RECONSTRUCT_MESH", "ReconstructMesh", "ReconstructMesh.exe"),
        "texture": _tool("OPENMVS_TEXTURE_MESH", "TextureMesh", "TextureMesh.exe"),
        "transform": _tool("OPENMVS_TRANSFORM_SCENE", "TransformScene", "TransformScene.exe"),
    }


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _profile_name() -> str:
    return os.getenv("RECON_PROFILE", "fast").strip().lower()


def _profile_options(name: str | None = None) -> dict[str, int]:
    selected = name or _profile_name()
    if selected not in RECONSTRUCTION_PROFILES:
        raise ValueError(f"Unknown RECON_PROFILE '{selected}'. Choose: {', '.join(RECONSTRUCTION_PROFILES)}.")
    options = dict(RECONSTRUCTION_PROFILES[selected])
    options["max_threads"] = min(options["max_threads"], os.cpu_count() or options["max_threads"])
    return options


def _safe_name(filename: str, fallback: str) -> str:
    name = Path(filename or fallback).name
    cleaned = "".join(ch for ch in name if ch.isalnum() or ch in "-_. ").strip(" .")
    return cleaned[:100] or fallback


def _append_log(job: dict[str, Any], line: str) -> None:
    job["log_tail"].append(line.rstrip())
    job["log_tail"] = job["log_tail"][-120:]
    message = line.strip()
    if message and not message.startswith("$") and not message.startswith("---"):
        job["last_message"] = message[-300:]
        _update_progress_from_log(job, message)
    log_path = Path(job["paths"]["logs"]) / "pipeline.log"
    with log_path.open("a", encoding="utf-8") as stream:
        stream.write(line)
        if not line.endswith("\n"):
            stream.write("\n")


def _missing_pipeline_tools(tools: dict[str, str | None]) -> list[str]:
    return [key for key in ("colmap", "interface_colmap", "densify", "mesh", "texture") if not tools[key]]


def _job_response(job: dict[str, Any]) -> dict[str, Any]:
    output_dir = Path(job["paths"]["output"])
    artifact_names = ("sparse.ply", "dense.ply", "mesh.ply", "model.glb")
    artifacts = [
        {"name": name, "url": f"/api/jobs/{job['id']}/artifacts/{name}"}
        for name in artifact_names
        if (output_dir / name).is_file()
    ]
    return {
        "id": job["id"],
        "name": job["name"],
        "status": job["status"],
        "stage": job["stage"],
        "progress": job["progress"],
        "process_info": {
            "status": job["status"],
            "stage": job["stage"],
            "overall_percent": job["progress"],
            "stage_percent": job.get("stage_progress_percent"),
            "elapsed_seconds": round(max(0, time.monotonic() - job["started_monotonic"]), 1)
            if job.get("started_monotonic") else 0,
            "stage_elapsed_seconds": round(max(0, time.monotonic() - job["stage_started_monotonic"]), 1)
            if job.get("stage_started_monotonic") else 0,
            "message": job.get("last_message", job["stage"]),
        },
        "profile": job.get("profile", _profile_name()),
        "profile_parameters": _profile_options(job.get("profile")),
        "stage_timings": job.get("stage_timings", {}),
        "created_at": job["created_at"],
        "updated_at": job["updated_at"],
        "image_count": job["image_count"],
        "registered_images": job.get("registered_images"),
        "metrics": job.get("metrics", {}),
        "artifacts": artifacts,
        "log_tail": job["log_tail"],
        "error": job.get("error"),
    }


def _update_progress_from_log(job: dict[str, Any], line: str) -> None:
    stage = job.get("stage", "")
    fraction: float | None = None
    if stage == "Extracting features":
        match = re.search(r"Processed file \[(\d+)/(\d+)\]", line)
        if match:
            fraction = int(match.group(1)) / max(1, int(match.group(2)))
    elif stage == "Matching images":
        match = re.search(r"Processing block \[(\d+)/(\d+),\s*(\d+)/(\d+)\]", line)
        if match:
            row, rows, col, cols = map(int, match.groups())
            fraction = ((row - 1) * cols + col) / max(1, rows * cols)
    elif stage == "Reconstructing camera poses (SfM)":
        match = re.search(r"Registering image #\d+ \(num_reg_frames=(\d+)\)", line)
        if match:
            fraction = int(match.group(1)) / max(1, int(job["image_count"]))
    else:
        match = re.search(r"\b(\d+(?:\.\d+)?)%", line)
        if match:
            fraction = float(match.group(1)) / 100
        elif stage in {"Building dense point cloud", "Reconstructing mesh", "Mapping photo textures"}:
            lower_line = line.lower()
            if any(token in lower_line for token in ("image", "view", "depth", "iteration", "face", "vertex", "texture")):
                match = re.search(r"\b(\d+)\s*/\s*(\d+)\b", line)
                if match:
                    fraction = int(match.group(1)) / max(1, int(match.group(2)))

    if fraction is None:
        return
    fraction = min(1.0, max(0.0, fraction))
    fraction = max(fraction, float(job.get("stage_progress_percent") or 0) / 100)
    job["stage_progress_percent"] = round(fraction * 100, 1)
    start, end = job.get("stage_progress_range", (job["progress"], job["progress"]))
    job["progress"] = max(job["progress"], round(start + (end - start) * fraction))


async def _run_command(
    job: dict[str, Any], stage: str, progress: int, *args: str,
    cwd: Path, end_progress: int | None = None,
) -> None:
    job["stage"] = stage
    job["progress"] = progress
    job["stage_progress_percent"] = None
    job["stage_progress_range"] = (progress, end_progress if end_progress is not None else progress)
    job["stage_started_monotonic"] = time.monotonic()
    job["last_message"] = f"Starting {stage}"
    job["updated_at"] = _now()
    command = [str(arg) for arg in args]
    _append_log(job, f"\n$ {' '.join(command)}\n")
    command_started = time.time()
    output: queue.Queue[str] = queue.Queue()
    process_holder: list[subprocess.Popen[str]] = []
    is_batch = os.name == "nt" and Path(command[0]).suffix.lower() in {".bat", ".cmd"}
    app_log_offsets: dict[Path, int] = {}
    app_log_names: set[Path] = set()
    next_app_log_poll = 0.0

    def stream_native_logs() -> None:
        if os.name != "nt":
            return
        for app_log in sorted(cwd.glob(f"{Path(command[0]).stem}-*.log")):
            try:
                if app_log.stat().st_mtime < command_started:
                    continue
                offset = app_log_offsets.get(app_log, 0)
                if app_log not in app_log_names:
                    _append_log(job, f"\n--- {app_log.name} ---\n")
                    app_log_names.add(app_log)
                with app_log.open("r", encoding="utf-8", errors="replace") as stream:
                    stream.seek(offset)
                    while line := stream.readline():
                        app_log_offsets[app_log] = stream.tell()
                        _append_log(job, line)
            except OSError as exc:
                _append_log(job, f"Could not read {app_log.name}: {exc}\n")

    def run_process() -> int:
        process = subprocess.Popen(
            subprocess.list2cmdline(command) if is_batch else command,
            cwd=str(cwd),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding="utf-8",
            errors="replace",
            bufsize=1,
            shell=is_batch,
        )
        process_holder.append(process)
        assert process.stdout is not None
        with process.stdout:
            for line in process.stdout:
                output.put(line)
        return process.wait()

    worker = asyncio.create_task(asyncio.to_thread(run_process))
    try:
        while not worker.done() or not output.empty():
            now = time.monotonic()
            if now >= next_app_log_poll:
                stream_native_logs()
                next_app_log_poll = now + 0.4
            try:
                line = output.get_nowait()
            except queue.Empty:
                await asyncio.sleep(0.05)
                continue
            _append_log(job, line)
        return_code = await worker
        stream_native_logs()
    except asyncio.CancelledError:
        if process_holder and process_holder[0].poll() is None:
            process_holder[0].terminate()
        try:
            await asyncio.shield(worker)
        except Exception:
            pass
        raise
    except Exception as exc:
        raise RuntimeError(f"Could not start or run {stage}: {exc!r}") from exc
    if return_code != 0:
        job.setdefault("stage_timings", {})[stage] = round(time.monotonic() - job["stage_started_monotonic"], 1)
        raise RuntimeError(f"{stage} failed with exit code {return_code}. Check job log.")
    job["stage_progress_percent"] = 100.0
    job["progress"] = max(job["progress"], job["stage_progress_range"][1])
    job.setdefault("stage_timings", {})[stage] = round(time.monotonic() - job["stage_started_monotonic"], 1)


async def _run_pipeline(job: dict[str, Any]) -> None:
    paths = {key: Path(value) for key, value in job["paths"].items()}
    images = paths["images"]
    work = paths["work"]
    output = paths["output"]
    database = work / "database.db"
    sparse_root = work / "sparse"
    dense = work / "dense"
    mvs_root = work / "mvs"
    mvs_root.mkdir(parents=True, exist_ok=True)
    job["status"] = "running"
    job["stage"] = "Checking reconstruction tools"
    job["progress"] = 2
    job["stage_progress_percent"] = None
    job["started_monotonic"] = time.monotonic()
    job["updated_at"] = _now()
    _append_log(job, f"Validating {job['image_count']} uploaded images.\n")
    tools = discover_tools()
    missing = _missing_pipeline_tools(tools)
    if missing:
        raise RuntimeError(
            "Missing reconstruction tools: " + ", ".join(missing)
            + ". Install COLMAP and OpenMVS, add their executables to PATH, then restart the server."
        )

    profile = _profile_options(job.get("profile"))
    started = time.monotonic()
    colmap = tools["colmap"]
    assert colmap is not None
    use_gpu = "1" if os.getenv("RECON_USE_GPU", "0").lower() in {"1", "true", "yes"} else "0"
    await _run_command(
        job, "Extracting features", 8, colmap, "feature_extractor",
        "--database_path", str(database), "--image_path", str(images),
        "--ImageReader.single_camera", "1" if job.get("single_camera") else "0",
        "--FeatureExtraction.max_image_size", "2400", "--FeatureExtraction.use_gpu", use_gpu,
        cwd=work, end_progress=16,
    )
    await _run_command(
        job, "Matching images", 18, colmap, "exhaustive_matcher",
        "--database_path", str(database), "--FeatureMatching.max_num_matches", "10000",
        "--FeatureMatching.use_gpu", use_gpu, cwd=work, end_progress=29,
    )
    sparse_root.mkdir(parents=True, exist_ok=True)
    await _run_command(
        job, "Reconstructing camera poses (SfM)", 32, colmap, "mapper",
        "--database_path", str(database), "--image_path", str(images),
        "--output_path", str(sparse_root), cwd=work, end_progress=38,
    )

    model_converter = _tool("COLMAP_MODEL_CONVERTER", "colmap", "COLMAP.bat", "colmap.exe")
    assert model_converter is not None
    sparse_candidates = [path for path in sparse_root.iterdir() if path.is_dir()]
    model_counts: list[tuple[int, Path]] = []
    for index, candidate in enumerate(sparse_candidates):
        if not ((candidate / "images.bin").is_file() or (candidate / "images.txt").is_file()):
            continue
        text_model = work / "model_text" / str(index)
        text_model.mkdir(parents=True, exist_ok=True)
        await _run_command(
            job, "Inspecting sparse models", 39, model_converter, "model_converter",
            "--input_path", str(candidate), "--output_path", str(text_model),
            "--output_type", "TXT", cwd=work,
        )
        image_file = text_model / "images.txt"
        if not image_file.is_file():
            continue
        lines = [line for line in image_file.read_text(encoding="utf-8", errors="ignore").splitlines()
                 if not line.startswith("#")]
        registered = sum(
            1 for line in lines[::2]
            if len(line.split()) >= 10 and line.split()[0].isdigit()
        )
        model_counts.append((registered, candidate))
    if not model_counts:
        raise RuntimeError("COLMAP produced no sparse model. Add more overlap and texture, then retry.")
    registered_count, sparse_model = max(model_counts, key=lambda item: item[0])
    job["registered_images"] = registered_count
    min_registered = max(8, (job["image_count"] + 3) // 4)
    if registered_count < min_registered:
        raise RuntimeError(
            f"SfM registered only {registered_count}/{job['image_count']} images; need at least {min_registered}. "
            "Keep the object still on a stable surface, remove hands/people from the views, and move the phone around it."
        )
    await _run_command(
        job, "Exporting sparse point cloud", 42, model_converter, "model_converter",
        "--input_path", str(sparse_model), "--output_path", str(output / "sparse.ply"),
        "--output_type", "PLY", cwd=work,
    )

    await _run_command(
        job, "Undistorting images", 50, colmap, "image_undistorter",
        "--image_path", str(images), "--input_path", str(sparse_model),
        "--output_path", str(dense), "--output_type", "COLMAP", cwd=work,
    )
    scene = mvs_root / "scene.mvs"
    await _run_command(
        job, "Preparing OpenMVS scene", 57, tools["interface_colmap"],
        "-i", str(dense), "-o", str(scene), "--image-folder", str(dense / "images"), cwd=mvs_root,
    )
    dense_scene = mvs_root / "scene_dense.mvs"
    await _run_command(
        job, "Building dense point cloud", 68, tools["densify"], str(scene),
        "--max-resolution", str(profile["max_resolution"]),
        "--resolution-level", str(profile["resolution_level"]),
        "--number-views", str(profile["number_views"]),
        "--iters", str(profile["iterations"]),
        "--geometric-iters", str(profile["geometric_iterations"]),
        "--sub-resolution-levels", str(profile["sub_resolution_levels"]),
        "--max-threads", str(profile["max_threads"]),
        *_openmvs_cuda_args(tools["densify"]), cwd=mvs_root, end_progress=77,
    )
    dense_cloud_candidates = (mvs_root / "scene_dense.ply", mvs_root / "scene_dense_pointcloud.ply")
    dense_cloud = next((path for path in dense_cloud_candidates if path.is_file()), None)
    if dense_cloud is None:
        raise RuntimeError("OpenMVS completed densification but dense point cloud was not found.")
    shutil.copy2(dense_cloud, output / "dense.ply")

    mesh_path = mvs_root / "mesh.ply"
    mesh_scene = mvs_root / "mesh.mvs"
    await _run_command(
        job, "Reconstructing mesh", 78, tools["mesh"], str(dense_scene),
        "-o", str(mesh_scene), "--max-threads", str(profile["max_threads"]),
        *_openmvs_cuda_args(tools["mesh"]),
        cwd=mvs_root, end_progress=87,
    )
    mesh_candidates = (mesh_path, mvs_root / "scene_dense_mesh.ply", mvs_root / "mesh_mesh.ply")
    generated_mesh = next((path for path in mesh_candidates if path.is_file()), None)
    if generated_mesh is None:
        raise RuntimeError("OpenMVS completed meshing but mesh PLY was not found.")
    shutil.copy2(generated_mesh, output / "mesh.ply")
    source_scene = mesh_scene if mesh_scene.is_file() else dense_scene

    await _run_command(
        job, "Mapping photo textures", 88, tools["texture"], str(source_scene),
        "-m", str(generated_mesh), "-o", str(mvs_root / "textured.mvs"), "--export-type", "glb",
        "--max-threads", str(profile["max_threads"]), *_openmvs_cuda_args(tools["texture"]),
        cwd=mvs_root, end_progress=95,
    )
    job["stage"] = "Exporting textured GLB"
    job["progress"] = 95
    job["stage_progress_percent"] = None
    job["stage_progress_range"] = (95, 100)
    job["stage_started_monotonic"] = time.monotonic()
    job["last_message"] = "Exporting textured GLB"
    glb_candidates = list(mvs_root.glob("textured*.glb"))
    if not glb_candidates:
        raise RuntimeError("OpenMVS completed texturing but textured GLB was not found.")
    shutil.copy2(max(glb_candidates, key=lambda path: path.stat().st_mtime), output / "model.glb")
    job.setdefault("stage_timings", {})["Exporting textured GLB"] = round(
        time.monotonic() - job["stage_started_monotonic"], 1
    )

    job["metrics"] = {
        "input_images": job["image_count"],
        "registered_images": job.get("registered_images"),
        "profile": job.get("profile"),
        "profile_parameters": profile,
        "runtime_seconds": round(time.monotonic() - started, 2),
        "stage_durations_seconds": job.get("stage_timings", {}),
    }
    (output / "metrics.json").write_text(json.dumps(job["metrics"], indent=2), encoding="utf-8")
    job["status"] = "completed"
    job["stage"] = "Reconstruction complete"
    job["progress"] = 100
    job["stage_progress_percent"] = 100.0
    job["last_message"] = "Reconstruction complete"
    job["updated_at"] = _now()
    _append_log(job, "\nReconstruction complete.\n")


async def _execute_job(job: dict[str, Any]) -> None:
    try:
        async with PIPELINE_SEMAPHORE:
            await _run_pipeline(job)
    except asyncio.CancelledError:
        job["status"] = "cancelled"
        job["stage"] = "Cancelled"
        job["updated_at"] = _now()
        _append_log(job, "\nJob cancelled.\n")
        raise
    except Exception as exc:  # Pipeline errors are returned to the UI and stored in logs.
        job["status"] = "failed"
        job["stage"] = "Failed"
        job["stage_progress_percent"] = None
        job["error"] = f"{type(exc).__name__}: {exc!r}"
        job["updated_at"] = _now()
        _append_log(job, f"\nERROR: {job['error']}\n")


@asynccontextmanager
async def lifespan(_: FastAPI):
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    yield
    for task in list(JOB_TASKS):
        task.cancel()
    if JOB_TASKS:
        await asyncio.gather(*JOB_TASKS, return_exceptions=True)


app = FastAPI(title="Forma — Photogrammetry Workbench", version="0.1.0", lifespan=lifespan)


@app.get("/api/health")
async def health() -> dict[str, Any]:
    tools = discover_tools()
    cuda_root = (ROOT / "tools" / "openmvs_cuda").resolve()
    openmvs_gpu_selected = bool(tools["densify"]) and Path(tools["densify"]).resolve().is_relative_to(cuda_root)
    return {
        "status": "ok",
        "tools": tools,
        "accelerators": {
            "colmap": "cuda" if os.getenv("RECON_USE_GPU", "0").lower() in {"1", "true", "yes"} else "cpu",
            "openmvs": "cuda" if openmvs_gpu_selected else "cpu",
        },
        "reconstruction_profile": _profile_name(),
        "pipeline_ready": not _missing_pipeline_tools(tools),
        "missing_tools": _missing_pipeline_tools(tools),
        "limits": {"min_images": MIN_IMAGES, "max_images": MAX_IMAGES, "max_image_bytes": MAX_IMAGE_BYTES},
    }


@app.post("/api/jobs", status_code=202)
async def create_job(name: str = Form(default="Untitled capture"), files: list[UploadFile] = File(...)) -> dict[str, Any]:
    profile = _profile_name()
    try:
        _profile_options(profile)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    if len(files) < MIN_IMAGES:
        raise HTTPException(400, f"Upload at least {MIN_IMAGES} photos for a useful reconstruction.")
    if len(files) > MAX_IMAGES:
        raise HTTPException(400, f"Upload no more than {MAX_IMAGES} photos per reconstruction.")

    job_id = uuid.uuid4().hex[:12]
    job_root = DATA_DIR / job_id
    paths = {
        "root": job_root,
        "images": job_root / "input_images",
        "output": job_root / "output",
        "work": job_root / "work",
        "logs": job_root / "logs",
    }
    for path in paths.values():
        path.mkdir(parents=True, exist_ok=True)

    total_bytes = 0
    hashes: set[str] = set()
    accepted = 0
    image_dimensions: set[tuple[int, int]] = set()
    image_names: list[str] = []
    try:
        for index, upload in enumerate(files, start=1):
            digest = hashlib.sha256()
            file_size = 0
            temporary_path = paths["images"] / f".upload-{index:04d}.tmp"
            with temporary_path.open("wb") as destination:
                while chunk := await upload.read(1024 * 1024):
                    file_size += len(chunk)
                    total_bytes += len(chunk)
                    if file_size > MAX_IMAGE_BYTES:
                        raise HTTPException(413, f"{upload.filename or f'Photo {index}'} exceeds 30 MB limit.")
                    if total_bytes > MAX_UPLOAD_BYTES:
                        raise HTTPException(413, "Upload exceeds 1 GB total limit.")
                    digest.update(chunk)
                    destination.write(chunk)
            fingerprint = digest.hexdigest()
            if fingerprint in hashes:
                raise HTTPException(400, f"Duplicate photo detected: {upload.filename or index}.")
            hashes.add(fingerprint)
            try:
                with Image.open(temporary_path) as image:
                    image_format = image.format
                    width, height = image.size
                    image.verify()
            except (UnidentifiedImageError, OSError, ValueError) as exc:
                raise HTTPException(400, f"{upload.filename or f'Photo {index}'} is not a valid image.") from exc
            if image_format not in ALLOWED_FORMATS:
                raise HTTPException(400, f"Unsupported image format for {upload.filename or index}. Use JPG, PNG, or WebP.")
            if width < 320 or height < 320:
                raise HTTPException(400, f"{upload.filename or f'Photo {index}'} must be at least 320 × 320 pixels.")
            basename = _safe_name(Path(upload.filename or "").stem, f"photo{index}")
            filename = f"{index:04d}_{basename}{ALLOWED_FORMATS[image_format]}"
            temporary_path.replace(paths["images"] / filename)
            image_dimensions.add((width, height))
            image_names.append(filename)
            accepted += 1
            await upload.close()
    except Exception:
        shutil.rmtree(job_root, ignore_errors=True)
        raise
    finally:
        for upload in files:
            if not upload.file.closed:
                await upload.close()

    job = {
        "id": job_id,
        "name": _safe_name(name, "Untitled capture"),
        "status": "queued",
        "stage": "Waiting for reconstruction slot",
        "progress": 0,
        "created_at": _now(),
        "updated_at": _now(),
        "image_count": accepted,
        "single_camera": len(image_dimensions) == 1,
        "profile": profile,
        "stage_timings": {},
        "paths": {key: str(value) for key, value in paths.items()},
        "log_tail": [],
        "metrics": {},
    }
    (paths["root"] / "manifest.json").write_text(json.dumps({
        "id": job_id,
        "name": job["name"],
        "created_at": job["created_at"],
        "image_count": accepted,
        "image_names": image_names,
        "pipeline": "COLMAP + OpenMVS",
        "profile": profile,
    }, indent=2), encoding="utf-8")

    async with JOB_LOCK:
        JOBS[job_id] = job
        task = asyncio.create_task(_execute_job(job), name=f"reconstruction-{job_id}")
        JOB_TASKS.add(task)
        task.add_done_callback(JOB_TASKS.discard)
    return _job_response(job)


@app.get("/api/jobs")
async def list_jobs() -> dict[str, list[dict[str, Any]]]:
    jobs = sorted(JOBS.values(), key=lambda item: item["created_at"], reverse=True)
    return {"jobs": [_job_response(job) for job in jobs]}


@app.get("/api/jobs/{job_id}")
async def get_job(job_id: str) -> dict[str, Any]:
    job = JOBS.get(job_id)
    if not job:
        raise HTTPException(404, "Reconstruction job not found.")
    return _job_response(job)


@app.get("/api/jobs/{job_id}/artifacts/{filename}")
async def get_artifact(job_id: str, filename: str) -> FileResponse:
    if filename not in {"sparse.ply", "dense.ply", "mesh.ply", "model.glb"}:
        raise HTTPException(404, "Artifact not found.")
    job = JOBS.get(job_id)
    if not job:
        raise HTTPException(404, "Reconstruction job not found.")
    path = Path(job["paths"]["output"]) / filename
    if not path.is_file():
        raise HTTPException(404, "Artifact is not ready.")
    media_type = "model/gltf-binary" if filename.endswith(".glb") else "application/octet-stream"
    return FileResponse(path, media_type=media_type, filename=f"{job['name']}_{filename}")


@app.get("/api/jobs/{job_id}/log")
async def get_log(job_id: str) -> FileResponse:
    job = JOBS.get(job_id)
    if not job:
        raise HTTPException(404, "Reconstruction job not found.")
    path = Path(job["paths"]["logs"]) / "pipeline.log"
    if not path.is_file():
        raise HTTPException(404, "Job log is not ready.")
    return FileResponse(path, media_type="text/plain", filename=f"{job_id}_pipeline.log")


app.mount("/", StaticFiles(directory=WEB_DIR, html=True), name="web")
