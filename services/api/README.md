# BEKAS API

FastAPI API foundation for project upload, Postgres job queue, signed Storage URLs, and Vast.ai worker lifecycle. No end-user authentication is implemented.

## Local setup

From `services/api`, create `.env` from `.env.example`, set real Supabase server credentials and a long random `WORKER_TOKEN`, then install/run:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -e ".[dev]"
uvicorn app.main:app --reload --port 8000
```

Apply `database/migrations/0001_initial_schema.sql` and `0002_project_upload_idempotency.sql` to Supabase, then create the private `bekas-assets` bucket. Do not expose the Supabase service-role key to the mobile app or Vast.ai worker.

## Implemented routes

- `GET /health` and `GET /ready`.
- `POST /projects`: idempotent project creation and signed JPEG upload target.
- `POST /projects/{id}/start`: verify uploaded JPEG/PNG, enforce 5 MB and 1,536 px limits, persist checksum, and atomically queue mesh + ideas jobs.
- `GET /projects/{id}`: component job state and fresh signed URLs for assets.
- `POST /projects/{id}/guide`: create/reuse one guide job after ideas exist.
- `POST /projects/{id}/retry`: requeue an eligible failed job within its attempt budget.
- `POST /worker/jobs/claim`: Vast.ai worker claims the next mesh job.
- `POST /worker/jobs/{id}/heartbeat`: renews active lease and can refresh the upload URL.
- `POST /worker/jobs/{id}/complete`: verifies the uploaded GLB and commits the active asset.
- `POST /worker/jobs/{id}/fail`: records worker error and applies bounded retry policy.

AI consumers for `ideas`, `guide`, and `illustration` jobs are not implemented yet. Until then, those jobs remain queued; `/guide` returns `409 ideas_not_ready`.

## Tests

```powershell
python -m pytest
python -m ruff check --select F401,UP035 app tests
```

Tests use fake Postgres/storage dependencies for route flows. Apply migrations and run a separate Supabase/Vast.ai smoke test before deployment.
