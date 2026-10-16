from __future__ import annotations

from pydantic import Field, SecretStr
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

    sf3d_space_id: str = "stabilityai/stable-fast-3d"
    hf_token: SecretStr | None = None
    mesh_job_timeout_seconds: int = Field(default=600, ge=30, le=1800)
    mesh_poll_seconds: float = Field(default=3, gt=0)
    mesh_retry_seconds: int = Field(default=15, ge=1)
    mesh_enabled: bool = True
    openai_api_key: str | None = None
    text_model: str = "gpt-6-luna"
    text_fallback_model: str = "gpt-6.1-sol"
    image_model: str = "gpt-image-2.5-flare"
    openai_request_timeout_seconds: int = Field(default=60, gt=0)
    text_retry_base_seconds: int = Field(default=5, gt=0)
    text_retry_max_delay_seconds: int = Field(default=300, gt=0)
