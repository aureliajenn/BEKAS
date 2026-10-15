from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str | None = None
    database_ssl: str = "require"
    database_pool_max_size: int = 5

    supabase_url: str | None = None
    supabase_service_role_key: str | None = None
    supabase_storage_bucket: str = "bekas-assets"
    signed_download_url_seconds: int = 900

    upload_pending_ttl_seconds: int = 1800
    max_upload_bytes: int = 5 * 1024 * 1024
    max_image_dimension: int = 1536
    max_glb_bytes: int = 10 * 1024 * 1024
    max_active_projects: int = 2
    max_mesh_attempts: int = 2
    max_job_attempts: int = 3

    worker_token: str | None = None
    openai_api_key: str | None = None
    text_model: str = "gpt-6-luna"
    text_fallback_model: str = "gpt-6.1-sol"
    image_model: str = "gpt-image-2.5-flare"
