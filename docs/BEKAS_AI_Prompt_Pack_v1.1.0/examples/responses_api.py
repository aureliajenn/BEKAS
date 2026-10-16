"""Reference helpers for the existing Python backend; not a second server.

Requires the installed services/api package. Caller supplies validated image data
URLs, stored metadata and its configured model. No API call runs on import.
"""
from __future__ import annotations

import asyncio
import json
from pathlib import Path
from typing import TYPE_CHECKING, Any

from app.schemas.ai import CraftIdea, GuideResult, IdeasResult, ObjectProfile

if TYPE_CHECKING:
    from openai import AsyncOpenAI

ROOT = Path(__file__).resolve().parent.parent


def make_client(api_key: str) -> AsyncOpenAI:
    from openai import AsyncOpenAI

    # Retry belongs to the existing job queue, not a second nested retry loop.
    return AsyncOpenAI(api_key=api_key, timeout=60, max_retries=0)


def check_guide(guide: GuideResult, profile: ObjectProfile, idea: CraftIdea,
                stages: list[dict[str, Any]] | None = None) -> None:
    """Small cross-response checks in addition to Pydantic's shape/order checks."""
    if (guide.idea_id, guide.title, guide.estimated_minutes) != (idea.id, idea.title, idea.estimated_minutes):
        raise ValueError("Selected craft or estimate changed")
    if set(guide.materials) != {profile.label, *idea.extra_materials}:
        raise ValueError("Guide must declare the source and selected extra materials only")
    if set(guide.tools) != set(idea.tools):
        raise ValueError("Guide tool inventory changed")
    if not set(idea.safety_notes).issubset(guide.safety_notes):
        raise ValueError("Selected safety notes must be retained")
    if stages:
        expected = [(stage["id"], stage["order"], stage["title"]) for stage in stages]
        actual = [(step.id, step.order, step.title) for step in guide.steps]
        if actual != expected:
            raise ValueError("Guide does not match curated stage identities/order")
    # Text/visual agreement and undeclared supplies mentioned inside prose still
    # require review; ID/name checks do not prove physical or visual correctness.


async def _parse(client: AsyncOpenAI, model: str, prompt: str, payload: dict,
                 image_data_urls: list[str], result_type):
    if not image_data_urls:
        raise ValueError("Attach actual reference images, not just their filenames")
    instructions = (ROOT / "prompts" / prompt).read_text(encoding="utf-8")
    content = [{"type": "input_text", "text": json.dumps(payload, ensure_ascii=False)}]
    content.extend({"type": "input_image", "image_url": url, "detail": "high"} for url in image_data_urls)
    async with asyncio.timeout(75):
        response = await client.responses.parse(
            model=model, instructions=instructions,
            input=[{"role": "user", "content": content}], text_format=result_type,
            max_output_tokens=4000, timeout=60, store=False,
        )
    if response.status != "completed" or response.output_parsed is None:
        raise ValueError("Provider returned refusal, incomplete or missing structured output")
    return response.output_parsed


async def generate_ideas(*, client: AsyncOpenAI, model: str, profile: ObjectProfile,
                         image_data_urls: list[str], constraints: dict) -> IdeasResult:
    """Mode A only: intact-object references with no fixed craft/stage mapping."""
    result = await _parse(client, model, "01_scan_ideation.md", {
        "object_profile": profile.model_dump(mode="json"), "constraints": constraints,
    }, image_data_urls, IdeasResult)
    if result.input_status == "accepted" and result.object_profile != profile:
        raise ValueError("Curated object metadata changed; correct metadata rather than inventing facts")
    return result


async def generate_guide(*, client: AsyncOpenAI, model: str, profile: ObjectProfile,
                         selected_idea: CraftIdea, image_data_urls: list[str],
                         stages: list[dict[str, Any]] | None = None) -> GuideResult:
    """Mode A/B: selected idea comes from stored validated data, never mobile JSON."""
    stages = stages or []
    if stages:
        if not 4 <= len(stages) <= 6:
            raise ValueError("Prepare 4–6 curated stages before generation")
        ids = [stage["id"] for stage in stages]
        if len(set(ids)) != len(ids) or [stage["order"] for stage in stages] != list(range(1, len(stages) + 1)):
            raise ValueError("Curated stages need unique IDs and consecutive order")
        if any(not set(stage.get("tools", [])).issubset(selected_idea.tools) for stage in stages):
            raise ValueError("Stage tools must already be declared in the selected craft")
    # File paths/model identities remain in backend; AI gets descriptive context.
    stage_context = [{key: stage[key] for key in (
        "id", "order", "title", "action", "before", "after", "tools", "safety_notes",
    )} for stage in stages]
    guide = await _parse(client, model, "02_craft_plan.md", {
        "object_profile": profile.model_dump(mode="json"),
        "selected_idea": selected_idea.model_dump(mode="json"), "stages": stage_context,
    }, image_data_urls, GuideResult)
    check_guide(guide, profile, selected_idea, stages)
    return guide
