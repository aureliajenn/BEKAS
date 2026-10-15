# GPU notebooks (optional)

Vast.ai worker in [`../worker`](../worker/README.md) is the primary MVP GPU runtime. Notebooks are optional for experiments only; they do not participate in production job claiming or the automatic demo flow.

Planned notebook flow:

1. Check runtime, GPU type, VRAM, Python, and CUDA; stop with a clear message if requirements are unavailable.
2. Install pinned dependencies and load one model at a time.
3. Accept the operator-exported input image and manifest.
4. Preprocess, run SF3D, then try TripoSR once only for relevant SF3D/model/export failures.
5. Validate GLB and write a result manifest with job/attempt IDs, input and output checksums, model/version, fallback, and per-stage timings.
6. Let operator download output for import through `tools/operator`.

Do not commit model weights, credentials, or generated user photos. Use a secret store for a Hugging Face read token when required.
