from __future__ import annotations

import asyncio
from types import SimpleNamespace

import httpx
import pytest
from openai import RateLimitError

from app.config import Settings
from app.jobs.provider import GeneratedText
from app.jobs.runner import ProviderFailure, TextJobRunner, _retry_after_seconds, _retry_delay
from app.schemas.ai import GuideResult


def test_guide_job_uses_selected_idea_and_keeps_estimated_time() -> None:
    class FakeProvider:
        async def generate_guide(self, **kwargs):
            assert kwargs["idea"].id == "idea-2"
            assert kwargs["idea"].estimated_minutes == 30
            return GeneratedText(
                value=GuideResult.model_validate(
                    {
                        "schema_version": "1.0",
                        "idea_id": "idea-2",
                        "title": "Pot semai mini",
                        "estimated_minutes": 30,
                        "materials": ["Botol plastik bersih", "Media tanam"],
                        "tools": ["Gunting"],
                        "safety_notes": ["Minta bantuan orang dewasa."],
                        "steps": [
                            {
                                "id": f"step-{index}",
                                "order": index,
                                "title": f"Langkah {index}",
                                "instruction": "Lakukan tindakan aman ini.",
                                "expected_result": "Bentuk berubah sesuai panduan.",
                                "illustration_prompt": "Satu aksi sederhana.",
                            }
                            for index in range(1, 5)
                        ],
                    }
                ),
                model="test-model",
                request_id="req_guide",
                usage={"input_tokens": 100, "output_tokens": 50},
                fallback_used=False,
            )

    settings = Settings(_env_file=None, openai_api_key="test", max_active_text_jobs=2)
    runner = TextJobRunner(
        pool=object(),
        storage=object(),
        settings=settings,
        openai_client=SimpleNamespace(close=lambda: asyncio.sleep(0)),
    )
    runner.provider = FakeProvider()
    job = {
        "selected_idea_id": "idea-2",
        "ideas": {
            "schema_version": "1.0",
            "input_status": "accepted",
            "object_profile": {
                "label": "Botol plastik",
                "visible_parts": ["Badan"],
                "material_guess": "Plastik, resin tidak diketahui",
                "uncertainties": ["Ukuran tidak diketahui"],
            },
            "ideas": [
                {
                    "id": f"idea-{index}",
                    "title": f"Ide {index}",
                    "purpose": "Kegunaan sederhana.",
                    "difficulty": "Mudah",
                    "estimated_minutes": 20 if index == 1 else 30,
                    "extra_materials": [],
                    "tools": ["Gunting"],
                    "safety_notes": [],
                }
                for index in range(1, 4)
            ],
        },
    }

    generated, usage, model, prompt_version, request_id, timing = asyncio.run(runner._make_guide(job))

    assert generated.idea_id == "idea-2"
    assert generated.estimated_minutes == 30
    assert usage["fallback_used"] is False
    assert model == "test-model"
    assert prompt_version == "bekas-guide-v1"
    assert request_id == "req_guide"
    assert timing["provider_ms"] >= 0


def test_retry_delay_uses_exponential_backoff_and_respects_retry_after() -> None:
    settings = Settings(_env_file=None, text_retry_base_seconds=5, text_retry_max_delay_seconds=300)
    assert _retry_delay(None, settings=settings, attempt=1) == 5
    assert _retry_delay(None, settings=settings, attempt=3) == 20
    assert _retry_delay(80, settings=settings, attempt=1) == 80
    assert _retry_delay(100_000, settings=settings, attempt=1) == 86_400


def test_provider_rate_limit_respects_retry_after_and_quota_is_permanent() -> None:
    settings = Settings(_env_file=None, openai_api_key="test")
    runner = TextJobRunner(
        pool=object(),
        storage=object(),
        settings=settings,
        openai_client=SimpleNamespace(close=lambda: asyncio.sleep(0)),
    )

    response = httpx.Response(
        429,
        headers={"retry-after": "37"},
        request=httpx.Request("POST", "https://api.openai.com/v1/responses"),
    )
    limited = RateLimitError("limited", response=response, body={"error": {"code": "rate_limit"}})
    assert _retry_after_seconds(limited) == 37
    with pytest.raises(ProviderFailure) as error:
        asyncio.run(runner._provider_call(_raise(limited)))
    assert error.value.retryable is True
    assert error.value.retry_after_seconds == 37

    quota = RateLimitError("quota", response=response, body={"error": {"code": "insufficient_quota"}})
    with pytest.raises(ProviderFailure) as error:
        asyncio.run(runner._provider_call(_raise(quota)))
    assert error.value.retryable is False


async def _raise(error: Exception) -> None:
    raise error
