# BEKAS — Active implementation plan

Updated 2026-10-16. Architecture: **Expo → FastAPI → Supabase + OpenAI + official SF3D Space**.

Detailed migration checklist: [docs/SF3D_MIGRATION_PLAN.md](docs/SF3D_MIGRATION_PLAN.md). Latest evidence/blockers: [docs/AGENT_HANDOFF.md](docs/AGENT_HANDOFF.md).

## Mesh runtime

- One FastAPI/Uvicorn process with internal Postgres-backed mesh consumer.
- Space: `stabilityai/stable-fast-3d`; optional `HF_TOKEN` stays on backend.
- One isolated Gradio session per job; initialize, remove background if opaque, then generate.
- Download/validate bounded GLB; upload to private Supabase Storage; commit asset + job atomically.
- Fixed deadline, bounded attempts and stale-token guards; no remote heartbeat protocol.
- Existing mobile endpoints and status/asset response shapes stay unchanged.
- No separate GPU worker, CUDA, local model weights, TripoSR or `WORKER_TOKEN`.

## Remaining delivery order

1. Configure Supabase and apply migrations 0001–0003 in order.
2. Verify API upload → hosted SF3D → stored GLB on deployed infrastructure.
3. Complete staged OpenAI text-runner/repository integration and start it through lifespan.
4. Complete progressive illustration consumer; keep text independent from image failures.
5. Exercise Android photo input, polling, viewer and app reopen on a physical device.
6. Verify provider outage, quota, bounded retry and backend restart recovery.
7. Rehearse one real journey and prepare honestly labeled saved examples.

Reward features remain specified by PRD 1.3 and are not removed by this migration. Broader account/history/cutting-guide aspirations in the application context need their own scope decision; do not add them to the GPU refactor.

## Verification

- Backend route/adapter/storage checks and real SQL integration in a disposable Postgres database.
- Frontend `npm run typecheck` and `npm run check` for response-adapter compatibility.
- Live Space smoke command: `python -m app.smoke_sf3d input.jpg output.glb` from `services/api`.
- Use bounded command timeouts. Temporary database startup is a short background command, followed by finite tests and shutdown in `finally`; do not leave verification servers running.

Historical Vast.ai plan: [archive](docs/VASTAI_IMPLEMENTATION_PLAN.legacy.md), not an active deployment requirement.
