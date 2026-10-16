from __future__ import annotations

import asyncio
import io

import httpx
import pytest
from PIL import Image

from app.errors import ApiError
from app.services import storage as storage_module
from app.services.storage import SupabaseStorageService


def jpeg_bytes(width: int = 32, height: int = 24) -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", (width, height), color=(25, 90, 50)).save(buffer, format="JPEG")
    return buffer.getvalue()


def make_storage_service(monkeypatch, response: httpx.Response, *, max_bytes: int = 5_000_000):
    original_client = httpx.AsyncClient
    transport = httpx.MockTransport(lambda _request: response)

    def client_factory(*, timeout):
        return original_client(transport=transport, timeout=timeout)

    monkeypatch.setattr(storage_module.httpx, "AsyncClient", client_factory)
    return SupabaseStorageService(
        client=object(),
        supabase_url="https://storage.example",
        service_role_key="test-service-key",
        max_upload_bytes=max_bytes,
        max_image_dimension=1536,
    )


def test_storage_inspects_image_bytes_and_computes_checksum(monkeypatch) -> None:
    image = jpeg_bytes()
    response = httpx.Response(200, headers={"content-type": "image/jpeg"}, content=image)
    storage = make_storage_service(monkeypatch, response)

    result = asyncio.run(storage.inspect_uploaded_image("bekas-assets", "projects/demo/input.jpg"))

    assert result.mime_type == "image/jpeg"
    assert result.byte_size == len(image)
    assert result.width == 32
    assert result.height == 24
    assert len(result.checksum_sha256) == 64


def test_storage_rejects_files_over_configured_size(monkeypatch) -> None:
    response = httpx.Response(
        200,
        headers={"content-type": "image/jpeg"},
        content=jpeg_bytes(),
    )
    storage = make_storage_service(monkeypatch, response, max_bytes=10)

    with pytest.raises(ApiError) as error:
        asyncio.run(storage.inspect_uploaded_image("bekas-assets", "projects/demo/input.jpg"))

    assert error.value.status_code == 413
    assert error.value.code == "image_too_large"


def test_storage_rejects_corrupt_jpeg(monkeypatch) -> None:
    response = httpx.Response(
        200,
        headers={"content-type": "image/jpeg"},
        content=b"not-an-image",
    )
    storage = make_storage_service(monkeypatch, response)

    with pytest.raises(ApiError) as error:
        asyncio.run(storage.inspect_uploaded_image("bekas-assets", "projects/demo/input.jpg"))

    assert error.value.status_code == 422
    assert error.value.code == "invalid_image"


def test_storage_creates_signed_urls_from_supabase_client() -> None:
    class Bucket:
        def create_signed_upload_url(self, path):
            return {"signed_url": f"https://storage.example/upload/{path}?token=secret"}

        def create_signed_url(self, path, expires_in):
            assert expires_in == 600
            return {"signedURL": f"https://storage.example/download/{path}?token=secret"}

    class Storage:
        def from_(self, _bucket):
            return Bucket()

    class Supabase:
        storage = Storage()

    service = SupabaseStorageService(
        client=Supabase(),
        supabase_url="https://storage.example",
        service_role_key="server-only",
        max_upload_bytes=5_000_000,
        max_image_dimension=1536,
    )

    upload_url = asyncio.run(service.create_signed_upload_url("bekas-assets", "input.jpg"))
    download_url = asyncio.run(service.create_signed_download_url("bekas-assets", "input.jpg", 600))

    assert "upload/input.jpg" in upload_url
    assert "download/input.jpg" in download_url


def test_storage_reads_real_async_stream_and_checks_input_identity(monkeypatch):
    import hashlib

    data = jpeg_bytes()

    class Stream(httpx.AsyncByteStream):
        async def __aiter__(self):
            yield data[:20]
            yield data[20:]

    response = httpx.Response(200, headers={"content-type": "image/jpeg"}, stream=Stream())
    service = make_storage_service(monkeypatch, response)
    result, mime = asyncio.run(service.read_uploaded_image("bekas-assets", "input.jpg", hashlib.sha256(data).hexdigest()))
    assert result == data
    assert mime == "image/jpeg"
