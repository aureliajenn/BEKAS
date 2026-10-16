from __future__ import annotations

import json
import struct

from app.config import Settings
from app.routes.worker import _valid_glb


def make_glb(document: dict[str, object]) -> bytes:
    json_chunk = json.dumps(document, separators=(",", ":")).encode("utf-8")
    json_chunk += b" " * (-len(json_chunk) % 4)
    total_length = 12 + 8 + len(json_chunk)
    return struct.pack("<4sII", b"glTF", 2, total_length) + struct.pack(
        "<II", len(json_chunk), 0x4E4F534A
    ) + json_chunk


def test_worker_lease_is_read_from_environment_and_positive(monkeypatch) -> None:
    monkeypatch.setenv("WORKER_LEASE_SECONDS", "45")
    assert Settings(_env_file=None).worker_lease_seconds == 45

    monkeypatch.setenv("WORKER_LEASE_SECONDS", "0")
    try:
        Settings(_env_file=None)
    except ValueError:
        pass
    else:
        raise AssertionError("non-positive worker lease must fail Settings validation")


def test_glb_requires_valid_container_and_renderable_mesh() -> None:
    mesh = make_glb(
        {
            "asset": {"version": "2.0"},
            "meshes": [{"primitives": [{"attributes": {"POSITION": 0}}]}],
        }
    )
    header_only = make_glb({"asset": {"version": "2.0"}})
    assert _valid_glb(mesh)
    assert not _valid_glb(header_only)
    assert not _valid_glb(mesh[:-1])
