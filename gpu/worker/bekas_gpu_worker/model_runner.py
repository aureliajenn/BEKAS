from __future__ import annotations

import argparse
import contextlib
import json
import sys
import time
import traceback
from pathlib import Path
from typing import Any


def send(message: dict[str, Any]) -> None:
    sys.stdout.write(json.dumps(message, separators=(",", ":")) + "\n")
    sys.stdout.flush()


def load_model(name: str, run_py: Path, model_id: str) -> tuple[Any, Any]:
    sys.path.insert(0, str(run_py.parent))
    import torch
    import rembg

    if not torch.cuda.is_available():
        raise RuntimeError("CUDA is unavailable")
    session = rembg.new_session()

    if name == "sf3d":
        from sf3d.system import SF3D

        model = SF3D.from_pretrained(
            model_id,
            config_name="config.yaml",
            weight_name="model.safetensors",
        )
        model.to("cuda")
        model.eval()
        return (name, model), session

    if name == "triposr":
        from tsr.system import TSR

        model = TSR.from_pretrained(
            model_id,
            config_name="config.yaml",
            weight_name="model.ckpt",
        )
        model.renderer.set_chunk_size(8192)
        model.to("cuda")
        model.eval()
        return (name, model), session

    raise ValueError("Unknown model adapter")


def preprocess(name: str, image_path: Path, session: Any) -> Any:
    from PIL import Image

    if name == "sf3d":
        from sf3d.utils import remove_background, resize_foreground

        image = remove_background(Image.open(image_path).convert("RGBA"), session)
        return resize_foreground(image, 0.85)

    import numpy as np
    from tsr.utils import remove_background, resize_foreground

    image = remove_background(Image.open(image_path), session)
    image = resize_foreground(image, 0.85)
    rgba = np.asarray(image).astype(np.float32) / 255.0
    rgb = rgba[:, :, :3] * rgba[:, :, 3:4] + (1 - rgba[:, :, 3:4]) * 0.5
    return Image.fromarray((rgb * 255.0).astype(np.uint8))


def infer(name: str, model: Any, session: Any, image_path: Path, output_dir: Path) -> str:
    import torch

    output_dir.mkdir(parents=True, exist_ok=True)
    image = preprocess(name, image_path, session)
    destination = output_dir / "0" / "mesh.glb"
    destination.parent.mkdir(parents=True, exist_ok=True)

    with torch.inference_mode():
        if name == "sf3d":
            with torch.autocast(device_type="cuda", dtype=torch.bfloat16):
                mesh, _ = model.run_image(
                    [image],
                    bake_resolution=1024,
                    remesh="none",
                    vertex_count=-1,
                )
            mesh.export(str(destination), include_normals=True)
        else:
            scene_codes = model([image], device="cuda")
            meshes = model.extract_mesh(scene_codes, True, resolution=256)
            meshes[0].export(str(destination))

    if not destination.is_file() or destination.stat().st_size == 0:
        raise RuntimeError("Model did not write GLB output")
    return str(destination)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", choices=["sf3d", "triposr"], required=True)
    parser.add_argument("--run-py", type=Path, required=True)
    parser.add_argument("--model-id", required=True)
    args = parser.parse_args()

    try:
        with contextlib.redirect_stdout(sys.stderr):
            model, session = load_model(args.model, args.run_py, args.model_id)
        send({"ready": True, "model": args.model})
    except Exception as exc:
        traceback.print_exc(file=sys.stderr)
        send({"ready": False, "error": type(exc).__name__})
        raise SystemExit(1) from exc

    for line in sys.stdin:
        try:
            request = json.loads(line)
        except json.JSONDecodeError:
            send({"ok": False, "error": "invalid_request"})
            continue
        if request.get("op") == "shutdown":
            break
        if request.get("op") != "generate":
            send({"ok": False, "error": "unsupported_operation"})
            continue
        start = time.perf_counter()
        try:
            with contextlib.redirect_stdout(sys.stderr):
                path = infer(
                    args.model,
                    model[1],
                    session,
                    Path(request["input_path"]),
                    Path(request["output_dir"]),
                )
            send({"ok": True, "glb_path": path, "inference_ms": round((time.perf_counter() - start) * 1000)})
        except Exception as exc:
            traceback.print_exc(file=sys.stderr)
            send({"ok": False, "error": type(exc).__name__})


if __name__ == "__main__":
    main()
