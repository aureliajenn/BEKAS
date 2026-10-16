from __future__ import annotations

import json
import struct

import pytest

from app.services.glb import validate_glb


def make_glb(document: dict[str, object]) -> bytes:
    json_chunk = json.dumps(document, separators=(",", ":")).encode("utf-8")
    json_chunk += b" " * (-len(json_chunk) % 4)
    total_length = 12 + 8 + len(json_chunk)
    return struct.pack("<4sII", b"glTF", 2, total_length) + struct.pack(
        "<II", len(json_chunk), 0x4E4F534A
    ) + json_chunk


def test_glb_requires_valid_container_and_renderable_mesh() -> None:
    mesh = make_glb(
        {
            "asset": {"version": "2.0"},
            "meshes": [{"primitives": [{"attributes": {"POSITION": 0}}]}],
        }
    )
    header_only = make_glb({"asset": {"version": "2.0"}})
    validate_glb(mesh, 1024)
    for invalid in (header_only, mesh[:-1], mesh + b"extra"):
        with pytest.raises(ValueError):
            validate_glb(invalid, 1024)
    with pytest.raises(ValueError):
        validate_glb(mesh, 10)
