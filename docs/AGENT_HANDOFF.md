# BEKAS — Current implementation handoff

Updated: 2026-10-16. Product scope: [PRD](../PRD.md). Delivery order: [implementation plan](../IMPLEMENTATION_PLAN.md). Hosted-inference evidence and integration gates: [SF3D migration](SF3D_MIGRATION_PLAN.md).

## Frontend

- Expo, React Native, TypeScript and Expo Router support Android and web.
- Demo assets: `apps/mobile/assets/demo/tempat-pensil/`, five GLBs and five PNGs registered in `src/theme/assets.ts`.
- Fixture preview uses `p1.png`. Results/recommendations and process 1 (preparation) use `bottle-1.glb`. Four craft steps use models 2–5. Saved examples always display **Contoh tersimpan**.
- Pencil-holder idea is first and marked **Mudah**; the other two ideas are **Sedang**.
- Guide routes delegate to `src/screens/GuideScreen.tsx`. `GuidePreparation`, `GuideCompletion`, and `useGuideProgress` separate rendering and local progress storage.
- Each process switches between 2D illustration and interactive 3D. `ProcessVisual` is the shared renderer; no legacy illustration-placeholder field remains.
- Local Android viewer writes its model-containing HTML to cache and passes a short file URI to WebView. This avoids sending the initial model's approximately 20 MB base64 HTML through the React Native bridge. Google model-viewer still loads from a configurable CDN URL.
- No frontend GLB size cap; 10 MiB is an optimization target. Initial GLB is 15,110,248 bytes. Loading, failure, timeout and retry states are explicit.

## Backend

- FastAPI calls the official `stabilityai/stable-fast-3d` Space. No separate GPU worker, CUDA deployment, TripoSR fallback, remote worker routes or worker token.
- Lifespan starts/stops the internal Postgres-backed mesh consumer when DB/Storage are configured and `MESH_ENABLED=true`.
- Backend validates Space output, stores GLB in private Supabase Storage, and exposes signed URLs through existing project endpoints. Atomic claim/completion and stale-attempt protection remain required.
- Pin `gradio-client==1.3.0`, Hugging Face Hub below 1. Use an isolated Gradio session per job. Blocking SDK calls run outside the event loop, with multiple executor threads for prediction and SSE.
- Verified Space sequence: `/requires_bg_remove`, then `/run_button` with explicit first positional button value. Opaque inputs use **Remove Background**, then **Run**; transparent inputs skip removal. Provider docs omit this button argument.
- Live opaque-JPEG smoke (Space sample chair flattened onto white) downloaded a validated **819,188-byte GLB**. This is not a team waste-photo quality benchmark.
- Existing project/upload, guide and retry contracts remain compatible with frontend.

## Pending integration and acceptance

1. Deploy/configure Supabase; apply migrations 0001–0003 and verify private Storage transfers.
2. Complete text-runner repository operations and lifecycle integration. Source runner/provider/prompts exist, but their presence does not prove end-to-end OpenAI operation.
3. Implement the progressive illustration consumer, with independent per-step failure/retry and text available before images.
4. Verify real team-photo quality, provider account/quota behavior, and full photo-to-guide journey.
5. Test camera permissions, picker recovery, viewer rendering/gestures and app reopen on physical Android. Browser/export success does not replace device acceptance.
6. Keep reward scope as specified by PRD; deferral/removal requires a product decision.

Prompt pack `BEKAS_AI_Prompt_Pack_v1.1.0/` is the current curated-demo proposal. It includes schemas and examples, not proof of completed backend integration. GLB is for the viewer; AI receives reference renders and metadata, not raw mesh bytes.

## Verification recorded

- Backend migration verification: **35 tests passed**, including disposable PostgreSQL integration; F401/UP035 lint passed.
- Frontend refactor: TypeScript including unused-local/parameter checks, response-adapter checks, web export and Android export passed.
- Browser flow verified: dummy preview, recommendation ordering/difficulty, initial model, all five process models, 2D/3D switching, viewer network failure/retry, saved completion and resume after reload.
- Model document tested in Chromium over HTTP and local HTML. Physical Android rendering remains unverified.
- Use bounded verification timeouts; temporary servers/databases run in background and stop in `finally`.

## Documentation cleanup

Removed duplicated `starter/` source, retired operator instructions, obsolete Vast.ai development checklist, and GPU-worker cache remnants. Active UI source is `apps/mobile/src/`; pending work is tracked in `IMPLEMENTATION_PLAN.md`. Historical pre-migration audit instructions were removed to avoid rebuilding retired infrastructure.
