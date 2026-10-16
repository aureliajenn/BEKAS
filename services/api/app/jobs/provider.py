from __future__ import annotations

import base64
from dataclasses import dataclass
from typing import Any

from openai import AsyncOpenAI, ContentFilterFinishReasonError, LengthFinishReasonError
from pydantic import BaseModel, ValidationError

from app.prompts.guide import GUIDE_SYSTEM_PROMPT, build_guide_user_prompt
from app.prompts.ideas import IDEAS_SYSTEM_PROMPT, IDEAS_USER_PROMPT
from app.schemas.ai import CraftIdea, GuideResult, IdeasResult, ObjectProfile


class StructuredOutputError(Exception):
    def __init__(
        self,
        code: str,
        message: str,
        *,
        retryable: bool,
        fallback_eligible: bool,
        fallback_reason: str | None = None,
        request_id: str | None = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.retryable = retryable
        self.fallback_eligible = fallback_eligible
        self.fallback_reason = fallback_reason
        self.request_id = request_id


@dataclass(frozen=True)
class GeneratedText[ResultT: BaseModel]:
    value: ResultT
    model: str
    request_id: str | None
    usage: dict[str, Any]
    fallback_used: bool
    fallback_reason: str | None = None


class OpenAITextProvider:
    def __init__(self, client: AsyncOpenAI) -> None:
        self.client = client

    async def generate_ideas(
        self,
        *,
        model: str,
        fallback_model: str,
        image: bytes,
        mime_type: str,
        timeout_seconds: int,
    ) -> GeneratedText[IdeasResult]:
        encoded = base64.b64encode(image).decode("ascii")
        image_url = f"data:{mime_type};base64,{encoded}"

        async def call(selected_model: str) -> tuple[IdeasResult, Any]:
            response = await self.client.responses.parse(
                model=selected_model,
                input=[
                    {"role": "system", "content": IDEAS_SYSTEM_PROMPT},
                    {
                        "role": "user",
                        "content": [
                            {"type": "input_text", "text": IDEAS_USER_PROMPT},
                            {"type": "input_image", "image_url": image_url, "detail": "high"},
                        ],
                    },
                ],
                text_format=IdeasResult,
                max_output_tokens=2600,
                store=False,
                timeout=timeout_seconds,
            )
            return _structured_value(response), response

        return await self._with_schema_fallback(call, model=model, fallback_model=fallback_model)

    async def generate_guide(
        self,
        *,
        model: str,
        fallback_model: str,
        object_profile: ObjectProfile,
        idea: CraftIdea,
        timeout_seconds: int,
    ) -> GeneratedText[GuideResult]:
        user_prompt = build_guide_user_prompt(object_profile=object_profile, idea=idea)

        async def call(selected_model: str) -> tuple[GuideResult, Any]:
            response = await self.client.responses.parse(
                model=selected_model,
                input=[
                    {"role": "system", "content": GUIDE_SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                text_format=GuideResult,
                max_output_tokens=4000,
                store=False,
                timeout=timeout_seconds,
            )
            guide = _structured_value(response)
            if guide.idea_id != idea.id:
                raise StructuredOutputError(
                    "guide_idea_mismatch",
                    "Model returned a guide for a different idea.",
                    retryable=False,
                    fallback_eligible=True,
                    request_id=_request_id(response),
                )
            if guide.estimated_minutes != idea.estimated_minutes:
                raise StructuredOutputError(
                    "guide_estimate_mismatch",
                    "Model returned an estimate inconsistent with the selected idea.",
                    retryable=False,
                    fallback_eligible=True,
                    request_id=_request_id(response),
                )
            return guide, response

        return await self._with_schema_fallback(call, model=model, fallback_model=fallback_model)

    async def _with_schema_fallback(
        self,
        call: Any,
        *,
        model: str,
        fallback_model: str,
    ) -> GeneratedText[Any]:
        try:
            value, response = await _call_parse_checked(call, model)
            return _generated(value, model, response, fallback_used=False)
        except StructuredOutputError as first_error:
            if not first_error.fallback_eligible or not fallback_model or fallback_model == model:
                raise
            try:
                value, response = await _call_parse_checked(call, fallback_model)
                return _generated(
                    value,
                    fallback_model,
                    response,
                    fallback_used=True,
                    fallback_reason=first_error.code,
                )
            except StructuredOutputError as fallback_error:
                raise StructuredOutputError(
                    fallback_error.code,
                    fallback_error.message,
                    retryable=fallback_error.retryable,
                    fallback_eligible=False,
                    fallback_reason=first_error.code,
                    request_id=fallback_error.request_id,
            ) from first_error


async def _call_parse_checked(call: Any, model: str) -> tuple[Any, Any]:
    try:
        value, response = await call(model)
        return value, response
    except LengthFinishReasonError as exc:
        raise StructuredOutputError(
            "output_truncated",
            "Model response was truncated before producing a complete result.",
            retryable=True,
            fallback_eligible=True,
            request_id=_request_id(getattr(exc, "response", None)),
        ) from exc
    except ContentFilterFinishReasonError as exc:
        raise StructuredOutputError(
            "provider_refusal",
            "Model declined to generate this result.",
            retryable=False,
            fallback_eligible=False,
            request_id=_request_id(getattr(exc, "response", None)),
        ) from exc
    except ValidationError as exc:
        raise StructuredOutputError(
            "invalid_model_output",
            "Model response did not satisfy the application schema.",
            retryable=True,
            fallback_eligible=True,
            request_id=_request_id(getattr(exc, "response", None)),
        ) from exc


def _structured_value(response: Any) -> Any:
    if getattr(response, "status", "completed") != "completed":
        incomplete = getattr(response, "incomplete_details", None)
        reason = getattr(incomplete, "reason", None)
        if reason == "max_output_tokens":
            raise StructuredOutputError(
                "output_truncated",
                "Model response was truncated before producing a complete result.",
                retryable=True,
                fallback_eligible=True,
                request_id=_request_id(response),
            )
        raise StructuredOutputError(
            "provider_incomplete",
            "Model did not complete a structured response.",
            retryable=True,
            fallback_eligible=True,
            request_id=_request_id(response),
        )

    for item in getattr(response, "output", []):
        for content in getattr(item, "content", []):
            if getattr(content, "type", None) == "refusal":
                raise StructuredOutputError(
                    "provider_refusal",
                    "Model declined to generate this result.",
                retryable=False,
                fallback_eligible=False,
                request_id=_request_id(response),
                )

    parsed = getattr(response, "output_parsed", None)
    if parsed is None:
        raise StructuredOutputError(
            "invalid_model_output",
            "Model response did not match the required structured schema.",
            retryable=True,
            fallback_eligible=True,
            request_id=_request_id(response),
        )
    return parsed


def _request_id(response: Any) -> str | None:
    request_id = getattr(response, "_request_id", None) if response is not None else None
    return str(request_id) if request_id else None


def _generated[ResultT: BaseModel](
    value: ResultT,
    model: str,
    response: Any,
    *,
    fallback_used: bool,
    fallback_reason: str | None = None,
) -> GeneratedText[ResultT]:
    usage = getattr(response, "usage", None)
    usage_data = usage.model_dump(mode="json", exclude_none=True) if usage is not None else {}
    return GeneratedText(
        value=value,
        model=model,
        request_id=getattr(response, "_request_id", None),
        usage=usage_data,
        fallback_used=fallback_used,
        fallback_reason=fallback_reason,
    )
