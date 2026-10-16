from __future__ import annotations

import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from pydantic import ValidationError

from app.jobs.provider import OpenAITextProvider, StructuredOutputError
from app.schemas.ai import CraftIdea, GuideResult, IdeasResult


def ideas_result() -> IdeasResult:
    return IdeasResult.model_validate(
        {
            "schema_version": "1.0",
            "input_status": "accepted",
            "object_profile": {
                "label": "Botol plastik",
                "visible_parts": ["Badan", "Tutup"],
                "material_guess": "Plastik; resin tidak diketahui",
                "uncertainties": ["Ukuran tidak diketahui"],
            },
            "ideas": [
                {
                    "id": f"idea-{index}",
                    "title": f"Ide {index}",
                    "purpose": "Merapikan barang kecil.",
                    "difficulty": "Mudah",
                    "estimated_minutes": 20,
                    "extra_materials": [],
                    "tools": ["Gunting"],
                    "safety_notes": [],
                }
                for index in range(1, 4)
            ],
        }
    )


def guide_result(estimated_minutes: int = 20) -> GuideResult:
    return GuideResult.model_validate(
        {
            "schema_version": "1.0",
            "idea_id": "idea-1",
            "title": "Wadah alat tulis",
            "estimated_minutes": estimated_minutes,
            "materials": ["Botol bersih"],
            "tools": ["Gunting"],
            "safety_notes": ["Lindungi tepi potongan."],
            "steps": [
                {
                    "id": f"step-{index}",
                    "order": index,
                    "title": f"Langkah {index}",
                    "instruction": "Lakukan langkah secara perlahan.",
                    "expected_result": "Hasil terlihat rapi.",
                    "illustration_prompt": "Gambarkan satu aksi aman.",
                }
                for index in range(1, 5)
            ],
        }
    )


def response(parsed: object, *, request_id: str = "req_test") -> SimpleNamespace:
    return SimpleNamespace(
        status="completed",
        output_parsed=parsed,
        output=[],
        usage=SimpleNamespace(model_dump=lambda **_kwargs: {"input_tokens": 44, "output_tokens": 27}),
        _request_id=request_id,
    )


def provider_with_responses(*side_effects: object) -> tuple[OpenAITextProvider, AsyncMock]:
    parse = AsyncMock(side_effect=list(side_effects))
    return OpenAITextProvider(SimpleNamespace(responses=SimpleNamespace(parse=parse))), parse


def test_ideas_provider_sends_original_photo_as_data_url_and_persists_usage() -> None:
    provider, parse = provider_with_responses(response(ideas_result()))

    generated = asyncio.run(
        provider.generate_ideas(
            model="primary-model",
            fallback_model="fallback-model",
            image=b"photo-bytes",
            mime_type="image/jpeg",
            timeout_seconds=60,
        )
    )

    request = parse.await_args.kwargs
    user_parts = request["input"][1]["content"]
    assert user_parts[1]["type"] == "input_image"
    assert user_parts[1]["image_url"].startswith("data:image/jpeg;base64,")
    assert request["model"] == "primary-model"
    assert request["store"] is False
    assert generated.value == ideas_result()
    assert generated.request_id == "req_test"
    assert generated.usage["input_tokens"] == 44
    assert generated.fallback_used is False


def test_schema_failure_uses_configured_fallback_once() -> None:
    with pytest.raises(ValidationError) as validation:
        IdeasResult.model_validate({})
    provider, parse = provider_with_responses(validation.value, response(ideas_result(), request_id="req_fallback"))

    generated = asyncio.run(
        provider.generate_ideas(
            model="primary-model",
            fallback_model="fallback-model",
            image=b"photo",
            mime_type="image/jpeg",
            timeout_seconds=60,
        )
    )

    assert [call.kwargs["model"] for call in parse.await_args_list] == ["primary-model", "fallback-model"]
    assert generated.model == "fallback-model"
    assert generated.fallback_used is True
    assert generated.fallback_reason == "invalid_model_output"


def test_guide_rejects_estimate_different_from_selected_idea() -> None:
    provider, parse = provider_with_responses(response(guide_result(21)))

    with pytest.raises(StructuredOutputError, match="inconsistent") as error:
        asyncio.run(
            provider.generate_guide(
                model="same-model",
                fallback_model="",
                object_profile=ideas_result().object_profile,
                idea=CraftIdea.model_validate(ideas_result().ideas[0].model_dump()),
                timeout_seconds=60,
            )
        )
    assert error.value.code == "guide_estimate_mismatch"
    assert parse.await_count == 1


def test_refusal_is_permanent_and_not_sent_to_fallback() -> None:
    refusal = SimpleNamespace(type="refusal")
    result = SimpleNamespace(status="completed", output=[SimpleNamespace(content=[refusal])], output_parsed=None)
    provider, parse = provider_with_responses(result)

    with pytest.raises(StructuredOutputError) as error:
        asyncio.run(
            provider.generate_ideas(
                model="primary-model",
                fallback_model="fallback-model",
                image=b"photo",
                mime_type="image/jpeg",
                timeout_seconds=60,
            )
        )
    assert error.value.code == "provider_refusal"
    assert error.value.retryable is False
    assert parse.await_count == 1
