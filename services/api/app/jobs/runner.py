from __future__ import annotations

import asyncio
import logging
import time
from datetime import UTC, datetime
from email.utils import parsedate_to_datetime
from typing import Any
from uuid import UUID

import asyncpg
from openai import (
    APIConnectionError,
    APIStatusError,
    APITimeoutError,
    AsyncOpenAI,
    AuthenticationError,
    InternalServerError,
    PermissionDeniedError,
    RateLimitError,
)
from pydantic import ValidationError

from app.config import Settings
from app.errors import ApiError
from app.jobs.provider import OpenAITextProvider, StructuredOutputError
from app.prompts.guide import GUIDE_PROMPT_VERSION
from app.prompts.ideas import IDEAS_PROMPT_VERSION
from app.repositories.projects import ProjectRepository, _json_value
from app.schemas.ai import IdeasResult
from app.services.storage import SupabaseStorageService

logger = logging.getLogger("bekas.text_runner")


class ProviderFailure(Exception):
    def __init__(
        self,
        code: str,
        message: str,
        *,
        retryable: bool,
        retry_after_seconds: int | None = None,
        request_id: str | None = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.retryable = retryable
        self.retry_after_seconds = retry_after_seconds
        self.request_id = request_id


class TextJobRunner:
    """DB-backed consumers. Job rows and leases remain the source of truth."""

    def __init__(
        self,
        *,
        pool: asyncpg.Pool,
        storage: SupabaseStorageService,
        settings: Settings,
        openai_client: AsyncOpenAI | None = None,
    ) -> None:
        self.settings = settings
        self.repository = ProjectRepository(pool)
        self.storage = storage
        self.client = openai_client or AsyncOpenAI(
            api_key=settings.openai_api_key,
            timeout=settings.openai_request_timeout_seconds,
            max_retries=0,
        )
        self.provider = OpenAITextProvider(self.client)
        self._task: asyncio.Task[None] | None = None
        self._stopping = asyncio.Event()

    def start(self) -> None:
        if self._task is None:
            self._task = asyncio.create_task(self._run(), name="bekas-text-runner")

    async def stop(self) -> None:
        self._stopping.set()
        if self._task is not None:
            self._task.cancel()
            await asyncio.gather(self._task, return_exceptions=True)
            self._task = None
        await self.client.close()

    async def _run(self) -> None:
        consumers = min(self.settings.max_active_text_jobs, 2)
        async with asyncio.TaskGroup() as task_group:
            for index in range(consumers):
                task_group.create_task(self._consume(index), name=f"bekas-text-consumer-{index + 1}")

    async def _consume(self, consumer_index: int) -> None:
        while not self._stopping.is_set():
            try:
                job = await self.repository.claim_text_job(
                    max_active_jobs=self.settings.max_active_text_jobs,
                    max_attempts=self.settings.max_job_attempts,
                    lease_seconds=self.settings.worker_lease_seconds,
                    max_claim_seconds=self.settings.text_job_max_claim_seconds,
                )
            except asyncio.CancelledError:
                raise
            except Exception as exc:  # noqa: BLE001 - a transient DB failure must not terminate the consumer loop
                logger.error(
                    "Text job claim failed consumer=%s error_type=%s",
                    consumer_index + 1,
                    type(exc).__name__,
                )
                await self._wait(self.settings.text_job_poll_seconds)
                continue

            if job is None:
                await self._wait(self.settings.text_job_poll_seconds)
                continue
            try:
                await self._process(job)
            except asyncio.CancelledError:
                raise
            except Exception as exc:  # noqa: BLE001 - isolate one job failure from other persistent consumers
                logger.error(
                    "Text consumer recovered from processing error job_id=%s error_type=%s",
                    job.get("job_id"),
                    type(exc).__name__,
                )
                await self._wait(self.settings.text_job_poll_seconds)

    async def _wait(self, seconds: float) -> None:
        try:
            await asyncio.wait_for(self._stopping.wait(), timeout=seconds)
        except TimeoutError:
            pass

    async def _process(self, job: dict[str, Any]) -> None:
        job_id = UUID(str(job["job_id"]))
        claim_token = UUID(str(job["claim_token"]))
        heartbeat = asyncio.create_task(self._heartbeat(job_id, claim_token), name=f"text-heartbeat-{job_id}")
        started_at = time.perf_counter()
        created_at = job.get("created_at")
        queue_ms = max(0, int((datetime.now(UTC) - created_at).total_seconds() * 1000)) if created_at else 0
        timing: dict[str, int] = {"queue_ms": queue_ms}
        provider_request_id: str | None = None
        fallback_reason: str | None = None

        try:
            if job["kind"] == "ideas":
                result, usage, selected_model, prompt_version, provider_request_id, stage_timing = await self._make_ideas(job)
                object_profile = result.object_profile.model_dump(mode="json") if result.object_profile else None
            elif job["kind"] == "guide":
                result, usage, selected_model, prompt_version, provider_request_id, stage_timing = await self._make_guide(job)
                object_profile = None
            else:
                raise ProviderFailure("unsupported_text_job", "Jenis pekerjaan teks tidak didukung.", retryable=False)

            timing.update(stage_timing)
            timing["total_ms"] = round((time.perf_counter() - started_at) * 1000)
            completed = await self.repository.complete_text_job(
                job_id=job_id,
                claim_token=claim_token,
                result=result.model_dump(mode="json"),
                object_profile=object_profile,
                prompt_version=prompt_version,
                model=selected_model,
                usage={
                    **usage,
                    "provider": "openai",
                    "model": selected_model,
                    "prompt_version": prompt_version,
                    "schema_version": result.schema_version,
                    "provider_request_id": provider_request_id,
                },
                timing=timing,
                max_claim_seconds=self.settings.text_job_max_claim_seconds,
            )
            if not completed:
                logger.info("Text job completion rejected as stale job_id=%s attempt=%s", job_id, job["attempt"])
                return
            logger.info(
                "Text job succeeded project_id=%s job_id=%s kind=%s attempt=%s model=%s fallback=%s elapsed_ms=%s",
                job["project_id"],
                job_id,
                job["kind"],
                job["attempt"],
                selected_model,
                usage.get("fallback_used", False),
                timing["total_ms"],
            )
        except asyncio.CancelledError:
            await self._fail(
                job_id,
                claim_token,
                code="runner_shutdown",
                message="Runner berhenti; pekerjaan akan dicoba kembali.",
                retryable=True,
                retry_after_seconds=0,
                attempt=int(job["attempt"]),
                provider_request_id=provider_request_id,
            )
            raise
        except (ProviderFailure, StructuredOutputError, ApiError) as exc:
            if isinstance(exc, ProviderFailure):
                code, message, retryable = exc.code, exc.message, exc.retryable
                retry_after = exc.retry_after_seconds
                provider_request_id = exc.request_id or provider_request_id
            elif isinstance(exc, StructuredOutputError):
                code, message, retryable = exc.code, exc.message, exc.retryable
                retry_after = None
                provider_request_id = exc.request_id or provider_request_id
                fallback_reason = exc.fallback_reason
            else:
                code, message, retryable = exc.code, exc.message, exc.retryable
                retry_after = None
            await self._fail(
                job_id,
                claim_token,
                code=code,
                message=message,
                retryable=retryable,
                retry_after_seconds=retry_after,
                attempt=int(job["attempt"]),
                provider_request_id=provider_request_id,
                fallback_reason=fallback_reason,
            )
            logger.warning(
                "Text job failed project_id=%s job_id=%s kind=%s attempt=%s code=%s retryable=%s",
                job["project_id"],
                job_id,
                job["kind"],
                job["attempt"],
                code,
                retryable,
            )
        except Exception as exc:  # noqa: BLE001 - map unexpected job errors to a bounded retry/final failure
            logger.error(
                "Text job crashed project_id=%s job_id=%s kind=%s attempt=%s error_type=%s",
                job["project_id"],
                job_id,
                job["kind"],
                job["attempt"],
                type(exc).__name__,
            )
            await self._fail(
                job_id,
                claim_token,
                code="text_runner_internal_error",
                message="Pemrosesan teks gagal. Sistem akan mencoba kembali bila masih tersedia.",
                retryable=True,
                retry_after_seconds=None,
                attempt=int(job["attempt"]),
                provider_request_id=provider_request_id,
            )
        finally:
            heartbeat.cancel()
            await asyncio.gather(heartbeat, return_exceptions=True)

    async def _make_ideas(self, job: dict[str, Any]):
        if not job.get("input_bucket") or not job.get("input_path") or not job.get("input_checksum_sha256"):
            raise ApiError(404, "input_asset_missing", "Foto sumber tidak ditemukan")
        download_started = time.perf_counter()
        image, mime_type = await self.storage.read_uploaded_image(
            str(job["input_bucket"]),
            str(job["input_path"]),
            str(job["input_checksum_sha256"]),
        )
        download_ms = round((time.perf_counter() - download_started) * 1000)
        provider_started = time.perf_counter()
        generated = await self._provider_call(
            self.provider.generate_ideas(
                model=self.settings.text_model,
                fallback_model=self.settings.text_fallback_model,
                image=image,
                mime_type=mime_type,
                timeout_seconds=self.settings.openai_request_timeout_seconds,
            )
        )
        return (
            generated.value,
            {
                **generated.usage,
                "fallback_used": generated.fallback_used,
                "fallback_reason": generated.fallback_reason,
            },
            generated.model,
            IDEAS_PROMPT_VERSION,
            generated.request_id,
            {
                "input_download_ms": download_ms,
                "provider_ms": round((time.perf_counter() - provider_started) * 1000),
            },
        )

    async def _make_guide(self, job: dict[str, Any]):
        ideas_data = _json_value(job.get("ideas"))
        if not isinstance(ideas_data, dict):
            raise ApiError(409, "ideas_not_ready", "Ide belum tersedia untuk proyek ini", retryable=True)
        ideas = IdeasResult.model_validate(ideas_data)
        if ideas.input_status != "accepted" or not ideas.object_profile:
            raise ApiError(409, "ideas_not_ready", "Ide belum siap untuk panduan", retryable=True)
        selected_idea_id = job.get("selected_idea_id")
        selected_idea = next((idea for idea in ideas.ideas if idea.id == selected_idea_id), None)
        if selected_idea is None:
            raise ApiError(422, "idea_not_in_project", "Ide terpilih tidak tersedia pada proyek ini")

        provider_started = time.perf_counter()
        generated = await self._provider_call(
            self.provider.generate_guide(
                model=self.settings.text_model,
                fallback_model=self.settings.text_fallback_model,
                object_profile=ideas.object_profile,
                idea=selected_idea,
                timeout_seconds=self.settings.openai_request_timeout_seconds,
            )
        )
        return (
            generated.value,
            {
                **generated.usage,
                "fallback_used": generated.fallback_used,
                "fallback_reason": generated.fallback_reason,
            },
            generated.model,
            GUIDE_PROMPT_VERSION,
            generated.request_id,
            {"provider_ms": round((time.perf_counter() - provider_started) * 1000)},
        )

    @staticmethod
    async def _provider_call(call: Any):
        try:
            return await call
        except StructuredOutputError:
            raise
        except (AuthenticationError, PermissionDeniedError) as exc:
            raise ProviderFailure(
                "provider_auth_failed",
                "OpenAI API menolak kredensial atau akses project.",
                retryable=False,
                request_id=getattr(exc, "request_id", None),
            ) from exc
        except RateLimitError as exc:
            provider_code = _provider_error_code(exc)
            quota = provider_code in {"insufficient_quota", "billing_hard_limit_reached"}
            raise ProviderFailure(
                "provider_quota_exhausted" if quota else "provider_rate_limited",
                "Kuota OpenAI habis." if quota else "OpenAI membatasi permintaan sementara.",
                retryable=not quota,
                retry_after_seconds=_retry_after_seconds(exc),
                request_id=getattr(exc, "request_id", None),
            ) from exc
        except (APITimeoutError, APIConnectionError, InternalServerError) as exc:
            raise ProviderFailure(
                "provider_temporarily_unavailable",
                "OpenAI belum dapat memproses permintaan sementara.",
                retryable=True,
                retry_after_seconds=_retry_after_seconds(exc),
                request_id=getattr(exc, "request_id", None),
            ) from exc
        except APIStatusError as exc:
            status_code = exc.status_code
            retryable = status_code in {408, 409} or status_code >= 500
            raise ProviderFailure(
                "provider_request_failed" if retryable else "provider_request_rejected",
                "OpenAI gagal memproses permintaan." if retryable else "OpenAI menolak permintaan untuk model atau input ini.",
                retryable=retryable,
                retry_after_seconds=_retry_after_seconds(exc),
                request_id=getattr(exc, "request_id", None),
            ) from exc
        except ValidationError as exc:
            raise StructuredOutputError(
                "invalid_model_output",
                "Hasil model tidak memenuhi schema aplikasi.",
                retryable=True,
                fallback_eligible=True,
            ) from exc

    async def _heartbeat(self, job_id: UUID, claim_token: UUID) -> None:
        try:
            while not self._stopping.is_set():
                await asyncio.sleep(self.settings.text_job_heartbeat_seconds)
                active = await self.repository.heartbeat_text_job(
                    job_id=job_id,
                    claim_token=claim_token,
                    lease_seconds=self.settings.worker_lease_seconds,
                    max_claim_seconds=self.settings.text_job_max_claim_seconds,
                )
                if not active:
                    logger.info("Text claim no longer active job_id=%s", job_id)
                    return
        except asyncio.CancelledError:
            raise
        except Exception as exc:  # noqa: BLE001 - heartbeat DB errors leave lease recovery to Postgres
            logger.warning("Text heartbeat failed job_id=%s error_type=%s", job_id, type(exc).__name__)

    async def _fail(
        self,
        job_id: UUID,
        claim_token: UUID,
        *,
        code: str,
        message: str,
        retryable: bool,
        retry_after_seconds: int | None,
        attempt: int,
        provider_request_id: str | None,
        fallback_reason: str | None = None,
    ) -> None:
        delay = _retry_delay(
            retry_after_seconds,
            settings=self.settings,
            attempt=attempt,
        ) if retryable else 0
        await self.repository.fail_text_job(
            job_id=job_id,
            claim_token=claim_token,
            error={
                "code": code,
                "message": message,
                "retryable": retryable,
                **({"provider_request_id": provider_request_id} if provider_request_id else {}),
                **({"fallback_reason": fallback_reason} if fallback_reason else {}),
            },
            retryable=retryable,
            retry_delay_seconds=delay,
            max_attempts=self.settings.max_job_attempts,
            max_claim_seconds=self.settings.text_job_max_claim_seconds,
        )


def _provider_error_code(error: Exception) -> str | None:
    body = getattr(error, "body", None)
    if isinstance(body, dict):
        details = body.get("error", body)
        if isinstance(details, dict):
            code = details.get("code") or details.get("type")
            return str(code) if code else None
    return getattr(error, "code", None)


def _retry_after_seconds(error: Exception) -> int | None:
    response = getattr(error, "response", None)
    headers = getattr(response, "headers", {})
    value = headers.get("retry-after") if headers else None
    if not value:
        return None
    try:
        return max(0, int(float(value)))
    except (ValueError, TypeError):
        try:
            date = parsedate_to_datetime(str(value))
            if date.tzinfo is None:
                date = date.replace(tzinfo=UTC)
            return max(0, int((date - datetime.now(UTC)).total_seconds()))
        except (TypeError, ValueError, OverflowError):
            return None


def _retry_delay(
    retry_after_seconds: int | None,
    *,
    settings: Settings,
    attempt: int,
) -> int:
    exponential = min(
        settings.text_retry_max_delay_seconds,
        settings.text_retry_base_seconds * (2 ** max(0, attempt - 1)),
    )
    requested = max(exponential, retry_after_seconds or 0)
    return min(requested, 86_400)
