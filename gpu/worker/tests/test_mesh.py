from __future__ import annotations

import asyncio
import json
import struct
import sys

from bekas_gpu_worker.mesh import MeshGenerator
from bekas_gpu_worker.settings import Settings


def _write_fake_runner(path, *, fail_sf3d: bool = False) -> None:
    payload = json.dumps({"asset": {"version": "2.0"}}, separators=(",", ":")).encode()
    payload += b" " * ((4 - len(payload) % 4) % 4)
    glb = struct.pack("<4sII", b"glTF", 2, 20 + len(payload))
    glb += struct.pack("<II", len(payload), 0x4E4F534A) + payload
    script = f"""
import json
import pathlib
import sys
model = sys.argv[sys.argv.index('--model') + 1]
print(json.dumps({{'ready': True, 'model': model}}), flush=True)
for line in sys.stdin:
    request = json.loads(line)
    if request.get('op') == 'shutdown':
        break
    if {fail_sf3d!r} and model == 'sf3d':
        print(json.dumps({{'ok': False, 'error': 'ModelError'}}), flush=True)
        continue
    out = pathlib.Path(request['output_dir']) / '0'
    out.mkdir(parents=True, exist_ok=True)
    glb_path = out / 'mesh.glb'
    glb_path.write_bytes({glb!r})
    print(json.dumps({{'ok': True, 'glb_path': str(glb_path)}}), flush=True)
"""
    path.write_text(script, encoding="utf-8")


def test_mesh_generator_uses_sf3d_when_successful(tmp_path) -> None:
    runner = tmp_path / "fake_runner.py"
    model_entrypoint = tmp_path / "sf3d_run.py"
    model_entrypoint.write_text("# test entrypoint", encoding="utf-8")
    _write_fake_runner(runner)
    settings = Settings(
        api_base_url="https://api.example.com",
        worker_token="test-token",
        worker_id="test-worker",
        sf3d_python=sys.executable,
        sf3d_run_py=str(model_entrypoint),
        triposr_run_py=str(model_entrypoint),
        model_runner_script=str(runner),
    )
    input_path = tmp_path / "input.png"
    input_path.write_bytes(b"fake-image")

    async def run() -> None:
        generator = MeshGenerator(settings)
        await generator.start()
        try:
            result = await generator.generate(input_path, tmp_path)
            assert result.model == "sf3d"
            assert result.fallback_used is False
            assert result.path.endswith("mesh.glb")
        finally:
            await generator.stop()

    asyncio.run(run())


def test_mesh_generator_uses_triposr_after_sf3d_failure(tmp_path) -> None:
    runner = tmp_path / "fake_runner.py"
    model_entrypoint = tmp_path / "model_run.py"
    model_entrypoint.write_text("# test entrypoint", encoding="utf-8")
    _write_fake_runner(runner, fail_sf3d=True)
    settings = Settings(
        api_base_url="https://api.example.com",
        worker_token="test-token",
        worker_id="test-worker",
        sf3d_python=sys.executable,
        sf3d_run_py=str(model_entrypoint),
        triposr_python=sys.executable,
        triposr_run_py=str(model_entrypoint),
        model_runner_script=str(runner),
    )
    input_path = tmp_path / "input.png"
    input_path.write_bytes(b"fake-image")

    async def run() -> None:
        generator = MeshGenerator(settings)
        await generator.start()
        try:
            result = await generator.generate(input_path, tmp_path)
            assert result.model == "triposr"
            assert result.fallback_used is True
        finally:
            await generator.stop()

    asyncio.run(run())
