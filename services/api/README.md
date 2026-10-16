# BEKAS API

FastAPI project API with a Postgres-backed mesh consumer calling the official `stabilityai/stable-fast-3d` Hugging Face Space. No end-user authentication.

## Local setup

From `services/api`, create `.env` from `.env.example` and configure Supabase server credentials. Set optional backend-only `HF_TOKEN` for authenticated Space access/quota, then install/run:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -e ".[dev]"
uvicorn app.main:app --reload --port 8000
```

Apply migrations `0001`, `0002`, and `0003` in order, then create the private `bekas-assets` bucket. Keep Supabase and Hugging Face credentials on the backend. Run exactly **one Uvicorn process**. The mesh consumer starts/stops with FastAPI; no GPU machine, CUDA, model weights, or worker token is required.

## Implemented routes

- `GET /health` and `GET /ready`.
- `POST /projects`: idempotent project creation and signed JPEG upload target.
- `POST /projects/{id}/start`: verify uploaded JPEG/PNG, enforce 5 MB and 1,536 px limits, persist checksum, and atomically queue mesh + ideas jobs.
- `GET /projects/{id}`: component job state and fresh signed URLs for assets.
- `POST /projects/{id}/guide`: create/reuse one guide job after ideas exist.
- `POST /projects/{id}/retry`: requeue an eligible failed job within its attempt budget.
- Old `/worker/jobs/*` endpoints are retired (404).

The staged text provider/runner is still incomplete and not started by lifespan; illustration consumer is absent. Those jobs remain queued until their separate integration is completed. Mesh failure does not modify ideas/guide jobs. Because queued work occupies project slots, a complete live multi-project demo still depends on finishing those consumers.

## Hosted SF3D

`app/services/sf3d.py` creates a fresh Gradio session for each mesh job. It normalizes RGBA, initializes `/requires_bg_remove`, calls `/run_button` with `"Remove Background"` for opaque input, then `"Run"`. The button is an undocumented positional input on the running Gradio 4.41 API. Background removal and generation share one session.

The handler downloads a bounded GLB, validates its container/mesh, uploads to `projects/<id>/mesh/attempt-<n>/model.glb`, and atomically publishes the asset and job. `GET /projects/{id}` keeps its existing response shape and returns our signed Storage URL. One mesh runs at a time; fixed claim deadlines, attempt tokens, and limited retry replace the remote heartbeat protocol.

Configuration: `SF3D_SPACE_ID`, `HF_TOKEN`, `MESH_ENABLED`, `MESH_JOB_TIMEOUT_SECONDS`, `MESH_POLL_SECONDS`, `MESH_RETRY_SECONDS`, `MAX_MESH_ATTEMPTS`, `MAX_GLB_BYTES`. Daily quota exhaustion is a clear final error rather than an automatic retry loop. Space availability/queue time is external.

Smoke command (requires real image and an existing output directory):

```powershell
python -m app.smoke_sf3d input.jpg output.glb
```

Observed 2026-10-16: official Space sample flattened to opaque JPEG → background removal → downloaded, validated **819,188-byte GLB**. This proves API integration, not reconstruction quality on waste photos or Android rendering.

## Tests

```powershell
python -m pytest
python -m ruff check --select F401,UP035 app tests
```

Route tests use fakes. `test_mesh_postgres.py` additionally checks real migrations, concurrent claims, deadline recovery, stale-result rejection and transaction rollback in a disposable database. Set `BEKAS_TEST_POSTGRES_DSN` to an **isolated local admin cluster**; it creates/drops its own test database. Never use the application database. Commands have bounded timeouts; stop any temporary database in a `finally` block after tests. Do not run foreground servers as verification commands.

Live Supabase deployment and physical Android checks remain necessary.
