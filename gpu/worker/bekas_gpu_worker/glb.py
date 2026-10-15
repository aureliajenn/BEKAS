from __future__ import annotations

import json
import struct
from pathlib import Path


_GLB_MAGIC = b"glTF"
_JSON_CHUNK_TYPE = 0x4E4F534A
_BIN_CHUNK_TYPE = 0x004E4942


def validate_glb(path: Path, max_bytes: int) -> int:
    """Validate GLB v2 header and JSON chunk; return file size."""
    size = path.stat().st_size
    if size < 20 or size > max_bytes:
        raise ValueError("GLB size is outside configured limits")

    with path.open("rb") as file:
        header = file.read(12)
        magic, version, declared_length = struct.unpack("<4sII", header)
        if magic != _GLB_MAGIC or version != 2 or declared_length != size:
            raise ValueError("Invalid GLB v2 header")

        chunk_header = file.read(8)
        if len(chunk_header) != 8:
            raise ValueError("Missing GLB JSON chunk")
        chunk_length, chunk_type = struct.unpack("<II", chunk_header)
        if chunk_type != _JSON_CHUNK_TYPE or chunk_length < 2:
            raise ValueError("Invalid GLB JSON chunk")
        if 20 + chunk_length > size:
            raise ValueError("GLB JSON chunk exceeds file length")

        try:
            document = json.loads(file.read(chunk_length).decode("utf-8").rstrip(" \0"))
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise ValueError("GLB JSON chunk is invalid") from exc

        asset = document.get("asset") if isinstance(document, dict) else None
        if not isinstance(asset, dict) or asset.get("version") != "2.0":
            raise ValueError("GLB asset version must be 2.0")

        remaining = size - 20 - chunk_length
        if remaining:
            binary_header = file.read(8)
            if len(binary_header) != 8:
                raise ValueError("Invalid GLB binary chunk header")
            binary_length, binary_type = struct.unpack("<II", binary_header)
            if binary_type != _BIN_CHUNK_TYPE or 20 + chunk_length + 8 + binary_length != size:
                raise ValueError("Invalid GLB binary chunk")

    return size
