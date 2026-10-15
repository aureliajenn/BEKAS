# 3D adapters

Worker adapter code lives in [`../worker/bekas_gpu_worker/model_runner.py`](../worker/bekas_gpu_worker/model_runner.py): SF3D primary and TripoSR fallback. Both export GLB v2; the worker validates the result and reports checksum, model version, fallback flag, and timings. Model subprocess stays warm across jobs. It stops SF3D before loading TripoSR so both model weights do not occupy VRAM together. See model scope and limitations in [PRD](../../PRD.md).
