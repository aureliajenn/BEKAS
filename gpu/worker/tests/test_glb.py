from __future__ import annotations

import json
import struct

import pytest

from bekas_gpu_worker.glb import validate_glb


def _minimal_glb() -> bytes:
    document = json.dumps({"asset": {"version": "2.0"}}, separators=(",", ":")).encode()
    document += b" " * ((4 - len(document) % 4) % 4)
    total_length = 12 + 8 + len(document)
    return struct.pack("<4sII", b"glTF", 2, total_length) + struct.pack(
        "<II", len(document), 0x4E4F534A
    ) + document


def test_validate_glb_accepts_minimal_v2_json_chunk(tmp_path) -> None:
    path = tmp_path / "valid.glb"
    path.write_bytes(_minimal_glb())

    assert validate_glb(path, max_bytes=1024) == path.stat().st_size


@pytest.mark.parametrize("payload", [b"", b"not a glb", _minimal_glb()[:-1]])
def test_validate_glb_rejects_invalid_file(tmp_path, payload: bytes) -> None:
    path = tmp_path / "invalid.glb"
    path.write_bytes(payload)

    with pytest.raises(ValueError):
        validate_glb(path, max_bytes=1024)


def test_validate_glb_rejects_file_over_limit(tmp_path) -> None:
    path = tmp_path / "large.glb"
    path.write_bytes(_minimal_glb())

    with pytest.raises(ValueError, match="size"):
        validate_glb(path, max_bytes=20)
