from __future__ import annotations

import json
import struct


def validate_glb(data: bytes, max_bytes: int) -> None:
    """Check a self-contained GLB v2 container with mesh primitives before publishing."""
    if not 20 <= len(data) <= max_bytes:
        raise ValueError("GLB size is outside configured limits")
    magic, version, size = struct.unpack_from("<4sII", data)
    if magic != b"glTF" or version != 2 or size != len(data):
        raise ValueError("Invalid GLB v2 header")
    offset = 12
    chunks: list[tuple[int, bytes]] = []
    while offset < size:
        if offset + 8 > size:
            raise ValueError("Truncated GLB chunk")
        length, kind = struct.unpack_from("<II", data, offset)
        offset += 8
        if length % 4 or offset + length > size:
            raise ValueError("Invalid GLB chunk length")
        chunks.append((kind, data[offset:offset + length]))
        offset += length
    if not chunks or chunks[0][0] != 0x4E4F534A:
        raise ValueError("Missing GLB JSON chunk")
    if len(chunks) > 2 or (len(chunks) == 2 and chunks[1][0] != 0x004E4942):
        raise ValueError("Invalid GLB binary chunk")
    try:
        doc = json.loads(chunks[0][1].decode("utf-8"))
        if doc.get("asset", {}).get("version") != "2.0":
            raise ValueError("Invalid glTF asset")
        primitives = [p for mesh in doc.get("meshes", []) for p in mesh.get("primitives", [])]
        if not primitives or not all("POSITION" in p.get("attributes", {}) for p in primitives):
            raise ValueError("GLB contains no renderable mesh primitives")
        for resource in doc.get("buffers", []) + doc.get("images", []):
            uri = resource.get("uri")
            if uri and not uri.startswith("data:"):
                raise ValueError("GLB references external resources")
    except (UnicodeDecodeError, json.JSONDecodeError, AttributeError, TypeError) as exc:
        raise ValueError("Invalid GLB document") from exc
