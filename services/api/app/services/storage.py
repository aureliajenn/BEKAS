from __future__ import annotations

import hashlib
import io
from dataclasses import dataclass
from typing import Any
from urllib.parse import quote

import httpx
from PIL import Image, UnidentifiedImageError
from starlette.concurrency import run_in_threadpool

from app.errors import ApiError

ALLOWED_IMAGE_TYPES = {"image/jpeg": "JPEG", "image/png": "PNG"}


@dataclass(frozen=True)
class StoredImage:
    mime_type: str
    byte_size: int
    checksum_sha256: str
    width: int
    height: int


class SupabaseStorageService:
    def __init__(
        self,
        *,
        client: Any,
        supabase_url: str,
        service_role_key: str,
        max_upload_bytes: int,
        max_image_dimension: int,
    ) -> None:
        self.client = client
        self.supabase_url = supabase_url.rstrip("/")
        self.service_role_key = service_role_key
        self.max_upload_bytes = max_upload_bytes
        self.max_image_dimension = max_image_dimension

    async def create_signed_upload_url(self, bucket: str, path: str) -> str:
        try:
            result = await run_in_threadpool(
                self.client.storage.from_(bucket).create_signed_upload_url,
                path,
            )
        except Exception as exc:
            raise ApiError(
                502,
                "storage_signing_failed",
                "Could not create a signed upload URL",
                retryable=True,
            ) from exc

        signed_url = result.get("signed_url") or result.get("signedUrl") or result.get("signedURL")
        if not signed_url:
            raise ApiError(
                502,
                "storage_signing_failed",
                "Storage did not return a signed upload URL",
                retryable=True,
            )
        return str(signed_url)

    async def create_signed_download_url(self, bucket: str, path: str, expires_in: int) -> str:
        try:
            result = await run_in_threadpool(
                self.client.storage.from_(bucket).create_signed_url,
                path,
                expires_in,
            )
        except Exception as exc:
            raise ApiError(
                502,
                "storage_signing_failed",
                "Could not create a signed download URL",
                retryable=True,
            ) from exc

        signed_url = result.get("signedURL") or result.get("signedUrl") or result.get("signed_url")
        if not signed_url:
            raise ApiError(
                502,
                "storage_signing_failed",
                "Storage did not return a signed download URL",
                retryable=True,
            )
        return str(signed_url)

    async def _read_image(self, bucket: str, path: str) -> tuple[bytes, StoredImage]:
        encoded_bucket = quote(bucket, safe="")
        encoded_path = quote(path, safe="/")
        url = f"{self.supabase_url}/storage/v1/object/{encoded_bucket}/{encoded_path}"
        headers = {
            "apikey": self.service_role_key,
            "Authorization": f"Bearer {self.service_role_key}",
        }
        chunks = bytearray()

        try:
            async with httpx.AsyncClient(timeout=20) as client:
                async with client.stream("GET", url, headers=headers) as response:
                    if response.status_code == 404:
                        raise ApiError(409, "input_not_uploaded", "Upload foto belum ditemukan")
                    if response.status_code in (401, 403):
                        raise ApiError(503, "storage_unavailable", "Storage rejected server credentials", retryable=True)
                    if response.status_code >= 400:
                        raise ApiError(502, "storage_read_failed", "Could not read uploaded photo", retryable=True)

                    declared_size = response.headers.get("content-length")
                    if declared_size and int(declared_size) > self.max_upload_bytes:
                        raise ApiError(413, "image_too_large", "Foto melebihi batas 5 MB")

                    content_type = response.headers.get("content-type", "").split(";", maxsplit=1)[0].lower()
                    async for chunk in response.aiter_bytes():
                        chunks.extend(chunk)
                        if len(chunks) > self.max_upload_bytes:
                            raise ApiError(413, "image_too_large", "Foto melebihi batas 5 MB")
        except ApiError:
            raise
        except httpx.HTTPError as exc:
            raise ApiError(502, "storage_read_failed", "Could not read uploaded photo", retryable=True) from exc

        expected_format = ALLOWED_IMAGE_TYPES.get(content_type)
        if expected_format is None:
            raise ApiError(415, "unsupported_image_type", "Foto harus JPEG atau PNG")

        try:
            with Image.open(io.BytesIO(chunks)) as image:
                actual_format = image.format
                width, height = image.size
                image.verify()
        except (UnidentifiedImageError, OSError, ValueError) as exc:
            raise ApiError(422, "invalid_image", "File tidak dapat dibaca sebagai gambar") from exc

        if actual_format != expected_format:
            raise ApiError(415, "image_type_mismatch", "Format gambar tidak cocok dengan MIME type")
        if width <= 0 or height <= 0 or max(width, height) > self.max_image_dimension:
            raise ApiError(422, "invalid_image_dimensions", "Ukuran foto harus maksimal 1.536 px per sisi")

        data = bytes(chunks)
        return data, StoredImage(
            mime_type=content_type,
            byte_size=len(data),
            checksum_sha256=hashlib.sha256(data).hexdigest(),
            width=width,
            height=height,
        )

    async def inspect_uploaded_image(self, bucket: str, path: str) -> StoredImage:
        _, image = await self._read_image(bucket, path)
        return image

    async def read_uploaded_image(self, bucket: str, path: str, checksum: str) -> tuple[bytes, str]:
        data, image = await self._read_image(bucket, path)
        if image.checksum_sha256 != checksum:
            raise ApiError(409, "input_checksum_mismatch", "Foto sumber telah berubah.", retryable=False)
        return data, image.mime_type

    async def upload_glb(self, bucket: str, path: str, data: bytes) -> None:
        url = f"{self.supabase_url}/storage/v1/object/{quote(bucket, safe='')}/{quote(path, safe='/')}"
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(url, content=data, headers={
                    "apikey": self.service_role_key,
                    "Authorization": f"Bearer {self.service_role_key}",
                    "Content-Type": "model/gltf-binary", "x-upsert": "true",
                })
                response.raise_for_status()
        except httpx.HTTPError as exc:
            raise ApiError(502, "mesh_upload_failed", "Model 3D belum dapat disimpan.", retryable=True) from exc
