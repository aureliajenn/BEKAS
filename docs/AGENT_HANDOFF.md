# Backend review and SF3D Space migration handoff

Updated: 2026-10-16. Latest implementation status below supersedes the historical audit later in this file.

## Latest: GPU refactor implemented

User narrowed implementation to retiring unnecessary GPU-worker infrastructure while preserving frontend compatibility. Broad application context describes future product aspirations; accounts/dimensions/blueprints were not added in this refactor.

- Added `services/api/app/services/sf3d.py`, `services/glb.py`, `jobs/mesh.py`, and `app/smoke_sf3d.py`.
- FastAPI lifespan starts/stops the internal mesh consumer when DB/Storage are configured and `MESH_ENABLED=true`.
- Added mesh claim/recovery/complete/fail repository methods. Existing migration 0003 is required; it is preserved rather than rewritten.
- Removed remote worker routes, GPU Python package, local model runners, fallback adapters and GPU deployment requirements.
- Existing project endpoints/status/asset shapes are preserved. Backend persists Space output in Supabase.
- Live API confirmed: `/requires_bg_remove` then `/run_button` with explicit hidden button positional value. Opaque images use `"Remove Background"`, then `"Run"`; transparent images skip removal. Docs omit this button argument, but callable requires it.
- Verified opaque-JPEG smoke using Space sample chair flattened onto white background: **819,188-byte validated GLB** downloaded successfully. Not a team-owned waste photo or Android test.
- Gradio client 1.3.0 is pinned; HF Hub restricted below 1. SDK executor needs multiple threads for prediction + SSE (one thread deadlocks). Isolated client per mesh job, bounded provider deadline, cancellation and cleanup; SDK runs outside event loop.
- Fixed streamed input read and retry `id`/`job_id` mapping; added missing Storage input-read and GLB upload methods.
- Repaired pre-existing staged frontend API client's broken type imports/nonexistent filesystem dependency using existing wire types and fetch upload; screens and current live client are preserved.
- Added small missing text timeout/retry settings and optional guide estimate field to resolve existing tests. Text runner still lacks repository operations/lifecycle wiring; illustration consumer remains absent. Do not claim full photo→guide journey works yet.
- Previous `server started` output was successful background launch of a disposable local PostgreSQL cluster, not a hanging command. Future verification must use timeouts and cleanup temporary servers in `finally`.

Pending: live Supabase deployment, team photo quality, physical Android rendering and independent OpenAI integration. Verification results are recorded in the migration plan after checks.

Verification: **35 backend tests passed** (including real disposable Postgres); frontend TypeScript and wire checks passed; backend F401/UP035 lint and diff whitespace checks passed. Temporary database stopped cleanly in `finally`. Runtime application credentials were not required or read for these isolated checks.

---

## Historical pre-implementation audit

Implementation plan: [SF3D_MIGRATION_PLAN.md](SF3D_MIGRATION_PLAN.md). User requested this Markdown plan after the review; runtime changes remain pending.

## User direction

- User wants hackathon backend reviewed for overengineering and unnecessary complexity.
- User wants to replace separate Vast.ai GPU worker with the official hosted SF3D Space API.
- Confirmed Space: https://huggingface.co/spaces/stabilityai/stable-fast-3d
- Earlier user explicitly requested saving context for subsequent agents. Previous handoff and its CLAUDE.md pointer were absent from the current checkout; recreated in this review.
- Current request is review/reassessment. Runtime migration has not been implemented.

## Review conclusion

Keep FastAPI, Supabase Postgres/Storage, existing project endpoints, polling, and three core tables (`projects`, `jobs`, `assets`). Main excess is separate GPU operations/protocol, dual reconstruction models, and reward scope added before the core journey works.

Recommended target:

```text
Expo -> FastAPI -> Supabase Postgres + Storage
               -> OpenAI: ideas, guide, illustrations
               -> official SF3D Space: mesh
```

- One backend process with a DB-backed runner, bounded concurrency per job kind, bounded retries/timeouts, and basic restart recovery.
- Backend reads source image, invokes Space, downloads and validates GLB, uploads GLB to Supabase, commits result + job status.
- Keep duplicate-request protection, stale-attempt protection, and transactional result persistence.
- Keep ideas independent of mesh and guide text independent of illustrations.
- Use a separate Gradio session/client per mesh job; retain that session across its preprocessing/generation calls. Start with one mesh job at a time.
- Do not introduce provider registries, generic plugin frameworks, Redis, Celery, or a separately deployed inference gateway.
- Once the Space path works, retire Vast.ai worker deployment and `/worker/jobs/*`, worker token/heartbeat/transfer-URL protocol, CUDA/model installation, persistent model subprocess management, and TripoSR fallback. Reuse lightweight GLB validation outside the retired worker package.
- Internal database claims/attempt guards may still be useful; removing the remote worker does not make durable processing unnecessary.
- A fixed bounded claim deadline can be simpler than renewable in-process heartbeats for a single-process prototype; any simplification must preserve timeout and stale-result behavior.
- Defer automatic text-model fallback and detailed per-stage telemetry unless observed failures justify them. Existing useful code need not be rewritten solely to reduce line count.
- Global two-active-project admission control can block demo if jobs are never consumed. Prefer small per-kind processing limits if product scope permits changing the current PRD requirement.

Reward backend deferral was recommended, **not approved**. PRD 1.3 still marks verification/wallet/leaderboard/bank-sampah features Must. Do not silently cut them.

## Official Space API: verified facts

Inspected these live URLs on 2026-10-16:

- https://huggingface.co/api/spaces/stabilityai/stable-fast-3d
- https://stabilityai-stable-fast-3d.hf.space/info
- https://stabilityai-stable-fast-3d.hf.space/config
- https://huggingface.co/spaces/stabilityai/stable-fast-3d/raw/main/gradio_app.py
- https://huggingface.co/docs/hub/spaces-zerogpu

Observed:

- Public, ungated Gradio Space; runtime metadata reported RUNNING on ZeroGPU.
- Running configuration reports Gradio 4.41.0 with queued SSE protocol.
- `/info` returns API metadata. `/gradio_api/info` returned 404; do not assume current Gradio URL conventions work on this older deployment.
- Named endpoints include `/requires_bg_remove`, `/run_button`, `/update_foreground_ratio`, and `/lambda`.
- `/requires_bg_remove` accepts image and foreground ratio (default 0.85).
- `/run_button` exposes image, foreground ratio (0.85), remesh option (`"None"`), vertex count (-1), texture size (1024).
- Source initializes image/background `gr.State`; source button switches between background removal and mesh generation. Calling generation without initialized state is not a valid assumed workflow.
- Candidate sequence for opaque photos: initialize via `/requires_bg_remove`, then background removal and generation through `/run_button`, retaining one session. Transparent input can follow a different branch. **Actual sequence and client handling of button/component updates require a live smoke test.**
- The GLB may appear in a Gradio component-update/file payload; do not assume the response is a bare URL.
- Use compatible `gradio_client` rather than implementing SSE/queue/session plumbing manually. Blocking client operations must not block FastAPI's event loop.
- Download generated files promptly into our Storage; Space temporary files are not durable app assets.
- ZeroGPU shared queues and daily quotas remain relevant; confirm authenticated backend access and available quota. No HF token is added to mobile.

**Not verified:** actual inference, correct multi-call session behavior, HF token/account access, GLB quality/latency, or Android rendering. Local Python did not have `gradio_client`; no inference was submitted in this review.

## Current source integration gaps

There are staged additions from other work, including runner/provider, prompts/tests, migration 0003, and mobile API client. Preserve them. Do not interpret their presence or old checklist ticks as working integration.

1. `services/api/app/main.py:18–45`: lifespan initializes DB and Storage, but never starts/stops `TextJobRunner`.
2. `services/api/app/jobs/runner.py:98`, `159`, `382`, `414`: calls `claim_text_job`, `complete_text_job`, `heartbeat_text_job`, `fail_text_job`; these methods are absent from current `repositories/projects.py`.
3. Runner references settings such as `max_active_text_jobs`, `worker_lease_seconds`, `openai_request_timeout_seconds`, polling/heartbeat/deadline/retry settings; current `config.py` does not declare them. Existing remote worker also references missing `worker_lease_seconds`.
4. `runner.py:262` calls `storage.read_uploaded_image`, absent from current `services/storage.py`.
5. `jobs/provider.py:115` checks `guide.estimated_minutes`, but current `schemas/ai.py` defines no such field on `GuideResult`.
6. `services/storage.py:117` still uses synchronous `response.iter_bytes()` on an async streamed response; needs `async for ... response.aiter_bytes()`.
7. Migration `0003_job_claim_limits.sql` adds a constraint requiring `claim_started_at` for running jobs, but existing `routes/worker.py:183–193` claim update does not populate it. Applying this migration without aligning consumers breaks claims.
8. Illustration consumer is absent. Without consuming all queued jobs, global active-project slots can remain occupied; migration 0003's trigger cannot fix unprocessed jobs.

These are integration blockers, separate from architecture preferences.

## Documents still describe old design

`PRD.md` section 9, `IMPLEMENTATION_PLAN.md`, `docs/development-todo.md`, `docs/api-contract.md`, root/API/worker READMEs still target Vast.ai. Align them when implementing the user's confirmed hosted-SF3D direction. Existing project policy uses PRD as the reference between documents; avoid leaving contradictory architecture requirements after migration.

`docs/development-todo.md` claims some fixes/source tasks complete even though the inspected files do not contain required changes. Trust source and live evidence over checkbox status.

## Verification attempted

Command: `python -m pytest -q` from `services/api`.

Result: collection stopped with five errors because active Python environment lacks `pydantic_settings` and `openai`. No tests passed/failed at execution stage; runtime defects above are source findings, not test results. No dependencies installed during review.

## Recommended implementation order

1. Prove one real photo -> GLB using official Space and a compatible Gradio client; record actual session/call sequence and output shape.
2. Add small SF3D client module and internal mesh job handler. Preserve app-facing project contracts.
3. Complete runner/config/repository/storage/schema integration; implement progressive illustrations.
4. Wire runner lifecycle; verify duplicate requests, bounded retry, restart recovery, valid stored GLB, and text independent from mesh.
5. Retire old remote-worker path and align specs/env/deployment documentation after replacement is proven.
6. Exercise full journey on physical Android before expanding infrastructure or rewards.

Preserve no-login scope, backend-only secrets, truthful stage labels, and fixture label **"Contoh tersimpan"**.
