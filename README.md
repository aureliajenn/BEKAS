# Forma — Smartphone Photogrammetry Workbench

Mobile-first web UI for guided smartphone RGB capture and classical COLMAP + OpenMVS reconstruction. Live camera frames are quality-filtered in-browser, selected images upload to the workstation, and completed GLB models can be inspected interactively with Three.js.

## Features

- Guided phone-camera capture with low, middle, and high viewing rings.
- Browser-side filtering for sharpness, exposure, and visual novelty.
- Photo uploads in JPG, PNG, and WebP formats.
- Background reconstruction with live progress, logs, and stage timings.
- Downloadable point clouds, meshes, and textured GLB models.
- Interactive Three.js model viewer.

## How it works

```text
Phone camera / photo upload
        ↓
FastAPI backend
        ↓
COLMAP: feature extraction → matching → camera poses
        ↓
OpenMVS: dense point cloud → mesh → texture
        ↓
GLB download + browser preview
```

Capture runs in the browser. Reconstruction runs on the workstation hosting the backend.

## Requirements

- Python 3.11+
- Git to clone the repository; PowerShell for the Windows commands below
- COLMAP CLI
- OpenMVS CLI: `InterfaceCOLMAP`, `DensifyPointCloud`, `ReconstructMesh`, `TextureMesh` (`TransformScene` optional)
- Recommended workstation: 32 GB RAM, SSD, NVIDIA GPU with about 8 GB VRAM. Hardware needs depend on image resolution and OpenMVS build.

COLMAP/OpenMVS executables must be available on `PATH`, installed under `tools/`, or configured through environment variables. GPU acceleration is optional; the default configuration uses CPU processing.

## Setup (Windows PowerShell)

Run commands from the repository root (the folder containing `requirements.txt`). If cloning, replace `<repository-url>` with this repository's Git URL:

```powershell
git clone <repository-url> prometheus
cd prometheus
```

### 1. Create the Python environment

```powershell
python -m venv .venv
Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned
& .\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

The execution-policy change applies only to the current PowerShell process. Activate the environment again in each new terminal. If `python` is unavailable but the Windows Python launcher is installed, use `py -3 -m venv .venv` for the first command.

Activation is optional: use `.\.venv\Scripts\python.exe` instead of `python` for pip and server commands if activation is blocked.

### 2. Install reconstruction tools

Python dependencies do **not** install COLMAP or OpenMVS. Download and extract the Windows releases from [COLMAP releases](https://github.com/colmap/colmap/releases) and [OpenMVS releases](https://github.com/cdcseacave/openMVS/releases). Development has used COLMAP 4.2.1 and OpenMVS 2.4.0; command-line compatibility may vary with other versions.

- Extract COLMAP under `tools/colmap/`, preserving its bundled files and DLLs.
- Extract the OpenMVS CPU release under `tools/openmvs/`, preserving its directory structure. The preferred executable directory is `tools/openmvs/vc17/x64/Release/`.
- Check that the releases contain `COLMAP.bat` or `colmap.exe`, plus `InterfaceCOLMAP.exe`, `DensifyPointCloud.exe`, `ReconstructMesh.exe`, and `TextureMesh.exe`.

The app searches `tools/` recursively and also checks `PATH`. For tools installed elsewhere, set explicit executable paths before starting the server, for example:

```powershell
$env:COLMAP_BIN = "C:\path\to\COLMAP.bat"
$env:OPENMVS_INTERFACE_COLMAP = "C:\path\to\InterfaceCOLMAP.exe"
$env:OPENMVS_DENSIFY = "C:\path\to\DensifyPointCloud.exe"
$env:OPENMVS_RECONSTRUCT_MESH = "C:\path\to\ReconstructMesh.exe"
$env:OPENMVS_TEXTURE_MESH = "C:\path\to\TextureMesh.exe"
```

Environment settings are read from the process environment; the app does not automatically load `.env` files. CPU is the default. Keep CUDA disabled until its runtime works on your machine.

### 3. Start the app

```powershell
python -m uvicorn app.main:app --reload
```

Open <http://127.0.0.1:8000>. FastAPI serves the frontend directly; no Node.js install or frontend build is needed. Stop the server with **Ctrl+C**. For reconstruction sessions, omit `--reload` so file changes do not restart the server and interrupt jobs.

### 4. Verify setup

In a second PowerShell terminal:

```powershell
$health = Invoke-RestMethod http://127.0.0.1:8000/api/health
$health
$health.tools
$health.missing_tools
```

`status: ok` means the web app is running. `pipeline_ready: true` means all required tool executables were discovered; run a real scan to verify they execute successfully. If it is `false`, correct the paths reported in `missing_tools` and check again. The UI can start without reconstruction tools, but reconstruction jobs will fail.

### macOS / Linux

Install Python 3.11+, COLMAP, and OpenMVS for your platform, with their executables on `PATH` (or set the variables listed above). From the repository root:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

### Run backend tests

With the virtual environment active:

```powershell
python -m pip install pytest httpx
python -m pytest tests -q
```

These are additional test dependencies; the application requirements are in `requirements.txt`.

### Local files and Git

`.gitignore` excludes virtual environments, Python caches, local `.env` settings, TLS certificates/private keys, runtime logs, downloaded tools in `tools/`, reconstruction jobs in `data/`, and local capture datasets in `images/`. These folders are created or populated locally and are not included when cloning the repository.

## Configuration

Set environment variables in the same terminal before starting the server. `.env` files are not loaded automatically.

| Variable | Purpose / default |
|---|---|
| `COLMAP_BIN` | Path or command for `colmap` / `COLMAP.bat` |
| `OPENMVS_INTERFACE_COLMAP` | Path or command for `InterfaceCOLMAP` |
| `OPENMVS_DENSIFY` | Path or command for `DensifyPointCloud` |
| `OPENMVS_RECONSTRUCT_MESH` | Path or command for `ReconstructMesh` |
| `OPENMVS_TEXTURE_MESH` | Path or command for `TextureMesh` |
| `OPENMVS_TRANSFORM_SCENE` | Optional `TransformScene`; not required by the pipeline |
| `RECON_DATA_DIR` | Job storage directory; defaults to the repository's `data/` folder |
| `RECON_PROFILE` | `fast` (default) or `balanced` |
| `RECON_USE_GPU` | Enable COLMAP CUDA with `1`; default `0` |
| `OPENMVS_USE_CUDA` | Prefer local binaries under `tools/openmvs_cuda/` with `1`; default `0` |
| `OPENMVS_CUDA_DEVICE` | Device index for binaries in the local OpenMVS CUDA release directory; default `0` |

### Reconstruction profiles

| Profile | Maximum MVS resolution | Source views | PatchMatch iterations | Maximum CPU threads |
|---|---|---|---|---|
| `fast` | 1024 px | 3 | 2 | 16 |
| `balanced` | 1600 px | 5 | 3 | 8 |

Thread count is capped to available logical processors. `balanced` also enables geometric-consistency and sub-resolution passes for more detailed reconstruction. Settings apply to new jobs; runtime depends on image count, capture quality, and hardware.

```powershell
$env:RECON_PROFILE = "balanced"
python -m uvicorn app.main:app
```

## Scan from a phone

1. Start the server on the workstation. For same-Wi-Fi access, bind to `0.0.0.0` and open `https://<workstation-LAN-IP>:8443` on the phone.
2. Phone camera APIs require a **secure context**. Plain HTTP on a LAN IP is blocked by mobile browsers. For local development, install [mkcert](https://github.com/FiloSottile/mkcert#installation), generate a certificate for the workstation LAN IP, install/trust its local CA on the phone, then run Uvicorn with TLS:

    ```powershell
    mkcert -install
    New-Item -ItemType Directory -Force -Path .certs
    $ip = "192.168.1.10" # replace with workstation Wi-Fi IPv4 from ipconfig
    mkcert -cert-file .certs/lan-cert.pem -key-file .certs/lan-key.pem $ip localhost 127.0.0.1
    python -m uvicorn app.main:app --host 0.0.0.0 --port 8443 --ssl-certfile .certs/lan-cert.pem --ssl-keyfile .certs/lan-key.pem
    ```

    Install `rootCA.pem` from the directory printed by `mkcert -CAROOT` as trusted on the test phone. Never share `rootCA-key.pem`. Keep phone and workstation on the same Wi-Fi and allow the server port through Windows Firewall on that private network. Regenerate the certificate if the workstation IP changes. See [`MOBILE_DEVELOPMENT.md`](MOBILE_DEVELOPMENT.md) for Android/iOS trust steps; its recorded IP is specific to the original workstation.
3. Tap **Start Scan**, grant rear-camera permission, and circle a stationary object. Auto-capture keeps sharp, reasonably exposed, visually distinct frames. Move through low, middle, and high rings; shutter button allows manually keeping a similar frame if it is still sharp and exposed.
4. Forma captures up to 18 frames per ring at up to 2200 px and JPEG quality 0.92. Finish requires at least 12 frames and at least 4 frames in each ring. Backend minimum remains 12 images.
5. Upload starts reconstruction; jobs and downloadable GLB appear below. Three.js viewer loads from jsDelivr only when a GLB is ready; scanning and uploads do not depend on the 3D viewer CDN.

`getUserMedia()` cannot provide reliable camera poses on all browsers. Ring coverage is a user-guided proxy, and visual novelty is a lightweight grayscale similarity check—not a replacement for SfM verification. Auto-capture heuristics (128×96 Laplacian variance, clipped-pixel ratio, sampled grayscale MAE) need tuning against real phone/object datasets. Camera focus/exposure remain under browser/device auto controls where manual lock is not exposed.

Current upload sends selected frames as one multipart request. It reports progress but does not resume a failed transfer. Camera frames are capped/downscaled to 2200 px and JPEG-compressed to keep typical scan uploads manageable. Production-scale or unreliable-network uploads should use resumable per-file/chunk uploads with hashes and server-side session finalization.

For phone photos already on device, switch to **Upload photos**. JPG, PNG, and WebP supported; HEIC is not supported yet. Reconstruction executes on the workstation, not on the phone.

The UI validates JPG, PNG, and WebP images, previews selected photos, or scans through the phone camera. Reconstruction runs as a background job. Minimum 12 images; maximum 150 images; maximum 30 MB per image and 1 GB per job.

## Outputs

Each job stores original uploaded files and working artifacts under `data/<job-id>/`:

```text
data/<job-id>/
├── input_images/
├── output/
│   ├── sparse.ply
│   ├── dense.ply
│   ├── mesh.ply
│   ├── model.glb
│   └── metrics.json
├── logs/pipeline.log
├── manifest.json
└── work/
    ├── database.db
    ├── sparse/
    ├── dense/
    └── mvs/
```

The API exposes job progress, a bounded log tail, full log download, and download links for generated artifacts. Job metadata currently lives in server memory; restart the server to clear the visible job list. Uploaded data remains on disk until manually removed.

While reconstruction runs, the backend tails OpenMVS native `DensifyPointCloud`, `ReconstructMesh`, and `TextureMesh` log files into `logs/pipeline.log`; the job log panel refreshes during the stage instead of waiting for it to finish.

Job API responses include `process_info` (`status`, `stage`, `overall_percent`, `stage_percent`, `elapsed_seconds`, `message`). COLMAP feature extraction/matching progress is calculated from their native counters. MVS stage percentage appears when OpenMVS emits a parseable counter; live native log lines and elapsed time remain available otherwise.

## Capture tips

- Capture 60–100 sharp photos; keep at least 12 for a test run.
- Aim for roughly 70–85% visual overlap, with camera translation between shots.
- Cover low, middle, and high viewpoints around the object.
- Keep object rigid and stationary on a stable surface; move only the phone. Do not hold or rotate object, and keep people/hands out of the frame.
- Keep one phone lens/focal length, exposure, and focus fixed.
- Use stable diffuse lighting. Matte, textured objects are easiest for first tests.
- Areas never visible to camera cannot be reconstructed reliably.

## Pipeline

The orchestrator uses COLMAP SIFT, exhaustive matching, incremental SfM, sparse model export, and image undistortion. It then imports the undistorted scene into OpenMVS, densifies, reconstructs a mesh, textures it, and exports a GLB. TextureMesh exports GLB directly; TransformScene is not required.

The SfM stage rejects reconstructions registering fewer than `max(8, ceil(25% of input images))`, preventing empty or very small reconstructions from entering MVS.

### API endpoints

```text
POST /api/jobs
GET  /api/health
GET  /api/jobs
GET  /api/jobs/{job_id}
GET  /api/jobs/{job_id}/artifacts/{filename}
GET  /api/jobs/{job_id}/log
```

## Project structure

```text
app/main.py             FastAPI app and reconstruction orchestration
web/index.html          Mobile capture UI and model viewer
tests/test_app.py       Backend tests
requirements.txt        Python application dependencies
IMPLEMENTATION_PLAN.md  Project phases and evaluation plan
MOBILE_DEVELOPMENT.md   Detailed phone HTTPS setup notes
```

## Troubleshooting

| Problem | Fix |
|---|---|
| PowerShell blocks activation | Run the process-scoped execution-policy command above, or use `.venv\Scripts\python.exe` directly. |
| Dependency install reports `getaddrinfo failed` | Check DNS/network access to PyPI. For offline setup, install dependencies from a local wheelhouse. |
| `pipeline_ready` is `false` | Check `missing_tools`, extracted binary locations, `PATH`, and executable environment variables. |
| Tools are found but reconstruction fails | Download the job log and verify that the installed COLMAP/OpenMVS versions run on your machine. |
| CUDA initialization fails | Use CPU-compatible binaries and leave GPU flags disabled; verify build/driver compatibility before enabling CUDA. |
| Phone cannot open the app | Check shared Wi-Fi, workstation IP, listening port, and firewall settings. |
| Phone camera is unavailable | Use HTTPS with a trusted certificate and grant camera permission. |
| Too few images register | Recapture a stationary, textured object with sharp images, viewpoint changes, and substantial overlap. |

## Current MVP limits

- One local worker processes jobs sequentially. Camera access from a phone requires HTTPS and a certificate trusted by that phone.
- Job state is in memory; uploaded data and logs are on disk.
- Object segmentation, native RGB-D/LiDAR capture, camera-pose sensor fusion, cancellation, persistent job recovery, and ground-truth metrics are not implemented yet.
- Tool CLI options/output names can vary across COLMAP/OpenMVS builds; verify commands against installed versions.
- Prototype supports JPG/PNG/WebP. HEIC conversion is not included.
- This service is intended for local trusted use, not direct public deployment.
- CPU reconstruction can take substantially longer than GPU-accelerated processing.

See [`IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md) for full project phases, capture protocol, evaluation, risks, and milestones.
