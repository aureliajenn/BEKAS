# Colab notebook

PRD runtime: interactive Google Colab Free, operated by a team member. Notebook must not poll the backend, run a queue daemon, expose an application endpoint, or require a public tunnel.

Planned notebook flow:

1. Check runtime, GPU type, VRAM, Python, and CUDA; stop with a clear message if requirements are unavailable.
2. Install pinned dependencies and load one model at a time.
3. Accept the operator-exported input image and manifest.
4. Preprocess, run SF3D, then try TripoSR once only for relevant SF3D/model/export failures.
5. Validate GLB and write a result manifest with job/attempt IDs, input and output checksums, model/version, fallback, and per-stage timings.
6. Let operator download output for import through `tools/operator`.

Do not commit model weights, credentials, or generated customer photos. Use Colab Secrets for a Hugging Face read token when required.
