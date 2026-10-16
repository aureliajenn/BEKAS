from __future__ import annotations

import asyncio
import io
import threading
from types import SimpleNamespace

import pytest
from PIL import Image
from test_glb import make_glb

from app.errors import ApiError
from app.services import sf3d


GLB = make_glb({"asset": {"version": "2.0"}, "meshes": [{"primitives": [{"attributes": {"POSITION": 0}}]}]})


def test_space_opaque_photo_uses_isolated_session_and_hidden_button(monkeypatch):
    calls, clients = [], []

    class Client:
        src = "https://stabilityai-stable-fast-3d.hf.space/"

        def __init__(self, *args, **kwargs):
            clients.append(self)
            self.closed = False
            self.executor = SimpleNamespace(shutdown=lambda **kw: None)

        def submit(self, *args, api_name):
            calls.append((api_name, args))
            value = ({}, {"__type__": "update", "value": {
                "path": "/tmp/gradio/model.glb", "url": self.src + "file=/tmp/gradio/model.glb",
            }})
            return SimpleNamespace(result=lambda timeout: value, done=lambda: True)

        def close(self):
            self.closed = True

    class Download:
        def __init__(self, **kwargs): pass
        def __enter__(self): return self
        def __exit__(self, *args): pass
        def stream(self, *args): return self
        def raise_for_status(self): pass
        def iter_bytes(self): yield GLB

    monkeypatch.setattr(sf3d, "Client", Client)
    monkeypatch.setattr(sf3d.httpx, "Client", Download)
    data = io.BytesIO()
    Image.new("RGB", (32, 24), "white").save(data, format="JPEG")
    service = sf3d.SF3DService(space_id="stabilityai/stable-fast-3d", token=None, timeout=30, max_bytes=1024)
    assert asyncio.run(service.generate(data.getvalue())) == GLB
    assert [api for api, _ in calls] == ["/requires_bg_remove", "/run_button", "/run_button"]
    assert calls[1][1][0] == "Remove Background"
    assert calls[2][1][0] == "Run"
    assert clients[0].closed


@pytest.mark.parametrize("value", [None, ({}, {}), ({}, {"value": {"path": "x.png"}}),
    ({}, {"path": "x.glb", "url": "https://untrusted.example/x.glb"})])
def test_space_rejects_missing_or_untrusted_output(value):
    with pytest.raises(ValueError):
        sf3d.SF3DService._output_url(value, "https://stabilityai-stable-fast-3d.hf.space/")


def test_cancelled_call_waits_for_local_work_to_exit(monkeypatch):
    started, exited = threading.Event(), threading.Event()
    service = sf3d.SF3DService(space_id="test", token=None, timeout=30, max_bytes=1024)

    def blocking(image, stop):
        started.set()
        assert stop.wait(2)
        exited.set()
        raise ApiError(504, "mesh_timeout", "timeout", retryable=True)

    monkeypatch.setattr(service, "_generate", blocking)

    async def scenario():
        task = asyncio.create_task(service.generate(b"image"))
        await asyncio.to_thread(started.wait, 2)
        task.cancel()
        with pytest.raises(asyncio.CancelledError):
            await task
        assert exited.is_set()

    asyncio.run(scenario())
