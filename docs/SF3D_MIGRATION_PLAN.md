# BEKAS — Hackathon Backend Simplification & SF3D Migration

**Date:** 2026-10-16  
**Status:** GPU-worker replacement implemented and checked locally; deployed Supabase and Android acceptance pending. Text/illustration integration remains a separate unfinished part of this broader plan.
**Chosen provider:** [official SF3D Hugging Face Space](https://huggingface.co/spaces/stabilityai/stable-fast-3d).  
**Context:** [latest backend audit](AGENT_HANDOFF.md).

## Implementation evidence (2026-10-16)

- User's latest scope: refactor/remove unused GPU worker while keeping frontend compatible.
- Live official Space: transparent sample generation succeeded; opaque JPEG (Space sample flattened on white) followed initialization → background removal → generation and downloaded a validated **819,188-byte GLB**. Not a team waste-photo benchmark.
- Verified API quirk: `/run_button` requires an explicit first positional button value (`"Remove Background"` or `"Run"`) omitted from `/info`. Adapter handles this; no frontend change required.
- Pinned `gradio-client==1.3.0`; SDK needs multiple executor threads for prediction and SSE. One executor thread deadlocks; adapter uses four, with only one mesh job active.
- `python -m pytest -q`: **35 passed**, including real disposable Postgres migrations, concurrent claim, deadline recovery, stale result, rollback and project terminal status checks.
- Frontend `npm run typecheck` and `npm run check`: **passed**. Existing staged API client import/dependency errors repaired without adding an Expo dependency.
- Backend `ruff check --select F401,UP035 app tests`: **passed**; `git diff --check`: **passed**.
- Temporary Postgres cluster stopped in `finally`; no verification server remains running.
- Pending external evidence: live Supabase transfers/deployment, Android viewer/device recovery, real waste photo quality, quota-account behavior and complete OpenAI/illustration integration. No unsupported completion checkboxes below are marked.

## 1. Goal

Replace the separately deployed Vast.ai GPU worker with backend calls to the official SF3D Space. Deliver one real Android journey:

**Photo → stored input → mesh + three ideas → selected idea → guide → progressive illustrations.**

Ideas must work when mesh fails. Guide text must be readable before illustrations finish.

## 2. Target architecture

```text
Expo app
  │ create / signed upload / start / poll / select guide
  ▼
FastAPI — one deployment, one Uvicorn process
  ├── Postgres-backed async job runner
  │     ├── mesh         → official SF3D Space
  │     ├── ideas/guide  → OpenAI
  │     └── illustration → OpenAI
  ├── Supabase Postgres: projects, jobs, assets
  └── Supabase Storage: input photos, GLBs, illustrations
```

Mobile never calls the Space or handles Hugging Face credentials. Backend downloads generated GLBs into our Storage; temporary Space URLs are not application asset identities.

## 3. Scope decisions

| Keep | Simplify / retire |
|---|---|
| FastAPI, Supabase, existing three core tables | Separate Vast.ai deployment and GPU operations |
| Existing project upload, start, get, guide, retry endpoints | `/worker/jobs/*` remote-worker protocol |
| Durable jobs, atomic claims and result commits | Worker token, remote heartbeat and transfer-URL refresh |
| Duplicate-request and stale-attempt protection | Local SF3D/TripoSR execution and persistent model subprocesses |
| Bounded concurrency, retries and deadlines | TripoSR runtime fallback |
| Per-component and per-step status | Unnecessary telemetry: start with duration, model/provider, usage, error |
| One verified configurable text model | Automatic text-model fallback unless evaluation demonstrates need |

Do not add Redis, Celery, provider registries, plugin frameworks, a new inference gateway, or a new backend framework. Reuse useful existing code instead of rewriting it solely to reduce line count.

**Rewards:** this plan does not implement or remove reward features. Deferring them is recommended for the hackathon, but requires an explicit scope decision because PRD 1.3 marks them Must.

## 4. Phase 0 — Prove the Space integration

**Do this before replacing or deleting the existing GPU flow.**

### Tasks

- [x] Inspect current Space `/info`, `/config`, and source; record observed revision and API names.
- [x] Install/test a compatible `gradio_client` version, then pin the tested version.
- [ ] Create a small standalone smoke command using one team-owned opaque-object photo.
- [x] Establish the actual session sequence for image initialization, background removal, and mesh generation.
- [ ] Download output, validate GLB, and open it in the Android viewer.
- [ ] Record authentication requirements, quota behavior, elapsed time, output shape and file size.

### Known API facts / unknowns

At audit, `/info` exposed `/requires_bg_remove` and `/run_button`; running configuration reported Gradio 4.41.0. `/gradio_api/info` returned 404. Source uses Gradio state and a button that switches between background removal and generation.

Verified opaque-photo flow: `/requires_bg_remove` → `/run_button("Remove Background", ...)` → `/run_button("Run", ...)`, within one session. Transparent images skip removal. Response is `(preview_update, model_update)`; GLB metadata is in the model update's `value`. Smoke command exists as `python -m app.smoke_sf3d input.jpg output.glb`; team-owned photo and Android check remain pending.

Use one fresh client/session per mesh job, preserving it across that job's calls. Start with the Space defaults: foreground ratio `0.85`, remesh `"None"`, vertex count `-1`, texture size `1024`.

**Gate:** a real uploaded photo produces a valid, downloaded GLB that renders on Android. If blocked, record exact failure; do not build integration around guessed payloads or bypass provider restrictions.

## 5. Phase 1 — Align architecture specifications

- [x] Update `PRD.md` architecture, mesh acceptance/recovery wording, runtime assumptions, and setup instructions for hosted SF3D.
- [x] Update `IMPLEMENTATION_PLAN.md` and supersede Vast.ai tasks in `docs/development-todo.md` with this migration sequence. Old implementation plan archived with an explicit historical label.
- [x] Update `docs/api-contract.md`: preserve application endpoints; retire worker endpoints.
- [x] Distinguish confirmed API behavior from untested performance targets. Hosted queue wait is part of observed latency.

**Gate:** active specifications agree on hosted SF3D and preserve the existing mobile project contract.

## 6. Phase 2 — Add a small SF3D adapter and mesh handler

### Suggested files

| File | Responsibility |
|---|---|
| `services/api/app/services/sf3d.py` | Gradio session, preprocessing/generation, result extraction, provider error mapping |
| `services/api/app/services/glb.py` | Reused lightweight GLB validation, independent of retired worker package |
| `services/api/app/jobs/runner.py` | Internal job dispatch and bounded processing; mesh handler may be a small sibling module |
| `services/api/app/services/storage.py` | Read input and store validated generated output |
| `services/api/app/config.py` | Space ID, optional server token, provider deadline and required runner settings |
| `services/api/pyproject.toml` | Tested Gradio client dependency |

**Implemented:** adapter, GLB validator, `jobs/mesh.py`, mesh repository methods, input read/output upload, settings and lifespan wiring. Database/API portions tested locally; Supabase live gate still pending.

### Mesh job flow

1. Claim persisted mesh job atomically and record attempt/deadline.
2. Read original photo from our Storage into temporary backend working space.
3. Create isolated Gradio session and execute the Phase 0 verified call sequence.
4. Retrieve GLB with bounded transfer size/time; validate structure and calculate checksum.
5. Upload to a project/job-attempt-specific path in Supabase Storage.
6. Commit asset metadata and succeeded job together, only if attempt remains current.
7. On failure, persist structured error and bounded retry/final-failure state; clean temporary files/client resources.

### Operational rules

- Run blocking Gradio calls outside FastAPI's event loop. A timed-out await does not necessarily stop its thread or remote inference: use supported cancellation/cleanup, retain concurrency ownership until local work exits, and reject late results.
- One mesh job at a time initially; keep text and illustration capacity separate.
- Transient transfer/provider errors may retry within budget. Quota exhaustion, invalid credentials/input and unsupported API contracts need clear terminal or deferred states, not tight retry loops.
- Do not expose signed URLs, tokens or raw provider errors in client messages/logs.
- Keep DB attempt/deadline guards; do not copy the remote worker HTTP heartbeat protocol into this adapter.

**Gate:** project start queues mesh; backend alone generates and stores it; project polling returns our signed GLB URL.

## 7. Phase 3 — Complete existing backend integration

Resolve the audited gaps before claiming the core journey works:

- [ ] Wire runner start/stop and client cleanup into `services/api/app/main.py` lifespan.
- [ ] Implement the claim/complete/fail/recovery repository operations required by the runner; avoid parallel competing queue implementations.
- [ ] Declare and validate settings actually referenced by runner code.
- [x] Implement missing input-read Storage operation and replace async-stream `iter_bytes()` with `aiter_bytes()`.
- [x] Resolve `GuideResult.estimated_minutes` mismatch with backward-compatible optional field and conditional provider validation.
- [x] Align active mesh claim with migration 0003's `claim_started_at` constraint. Unwired text runner is still separate unfinished work.
- [x] Preserve migration history; no destructive queue schema change. Migrations 0001–0003 tested against isolated Postgres; deployed migration state still requires confirmation.
- [ ] Keep guide result and illustration-job creation in one transaction; implement one-at-a-time progressive illustration processing.
- [ ] Ensure terminal jobs release project processing slots; unconsumed queued jobs must not permanently exhaust the two-project allowance.
- [x] Implement bounded mesh recovery for interrupted jobs without duplicating active results. Deadline/token and transaction behavior checked on real Postgres.

Suggested initial limits: **mesh 1, text up to 2, illustration 1**. Keep one backend process; calibrate provider deadlines from smoke evidence.

**Gate:** real photo yields ideas and a guide; illustrations progress; failed mesh does not block text; third project can start after prior work terminates.

## 8. Phase 4 — Retire obsolete GPU flow

Only after the hosted path passes its gate:

- [x] Remove worker router registration and obsolete `services/api/app/routes/worker.py` endpoints.
- [x] Remove worker-only token/config/env requirements.
- [x] Retire tracked `gpu/worker/` source and obsolete adapter/notebook deployment instructions; retained validator behavior in backend. Ignored local cache files are not active source.
- [x] Replace worker-specific tests with relevant Space-adapter and internal-job checks.
- [x] Remove Vast.ai/CUDA/TripoSR deployment requirements from active READMEs and setup docs.
- [x] Inspect mobile stage copy: already provider-neutral; no wire-status or screen change needed. Legacy optional `worker_state` retained for fixture compatibility.
- [x] Update `docs/AGENT_HANDOFF.md` with implemented behavior and remaining blockers.

**Gate:** app runs without Vast.ai, CUDA, local model weights, or `WORKER_TOKEN`.

## 9. Verification and definition of done

### Focused automated checks

- Adapter handles the recorded output shape, missing GLB, provider failure and invalid/oversized output.
- Duplicate start/guide/retry requests do not duplicate logical work.
- Real Postgres test verifies atomic claim, stale-attempt rejection and result/job transaction behavior.
- Restart recovery is bounded; a late Space response cannot overwrite a newer result.
- Mesh failure leaves ideas usable; guide is available before illustrations.

### Live acceptance

- [ ] Fresh Android photo → upload → Space → stored GLB → viewer rotate/zoom.
- [ ] Three real ideas → selected guide → progressive real illustrations.
- [ ] App reopen restores stored project and checklist.
- [ ] Space unavailable/quota error produces truthful failure state and leaves text usable.
- [ ] Backend restart does not lose project or leave processing stuck indefinitely.
- [ ] Existing labeled saved examples remain available as demo backup.

Backend dependencies installed in an isolated temporary virtualenv; current test evidence is listed above. Live-device checks remain unchecked. Verification commands must have finite timeouts; temporary servers must run background and stop in `finally`.

**Done:** one deployed FastAPI backend calls the official Space, owns durable output files, delivers the core Android journey, and no longer requires the separate GPU worker. Record actual latency/quality and remaining limitations; fixture success is not live acceptance.
