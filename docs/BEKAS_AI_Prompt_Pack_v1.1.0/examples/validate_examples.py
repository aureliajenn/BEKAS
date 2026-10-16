"""Offline checks only. No credentials, API calls or server startup required."""
from __future__ import annotations

import json
from copy import deepcopy
from pathlib import Path

from jsonschema import Draft202012Validator
from responses_api import check_guide

from app.schemas.ai import CraftIdea, GuideResult, GuideStep, IdeasResult, ObjectProfile

ROOT = Path(__file__).resolve().parent.parent


def load(path: str):
    return json.loads((ROOT / path).read_text(encoding="utf-8"))


def main():
    scan = load("examples/example_scan.json")
    plan = load("examples/example_plan.json")
    context = load("examples/example_context.json")
    for name, result in (("scan", scan), ("plan", plan)):
        schema = load(f"schemas/{name}.schema.json")
        Draft202012Validator.check_schema(schema)
        Draft202012Validator(schema).validate(result)
        # Strict Structured Outputs requires all object properties required and
        # additionalProperties=false, including nested definitions.
        def strict_objects(node):
            if isinstance(node, dict):
                if node.get("type") == "object":
                    assert node.get("additionalProperties") is False
                    assert set(node["required"]) == set(node["properties"])
                for value in node.values():
                    strict_objects(value)
            elif isinstance(node, list):
                for value in node:
                    strict_objects(value)
        strict_objects(schema)
    assert set(load("schemas/scan.schema.json")["properties"]) == set(IdeasResult.model_fields)
    assert set(load("schemas/plan.schema.json")["properties"]) == set(GuideResult.model_fields)
    assert set(load("schemas/scan.schema.json")["$defs"]["idea"]["properties"]) == set(CraftIdea.model_fields)
    assert set(load("schemas/scan.schema.json")["$defs"]["object_profile"]["properties"]) == set(ObjectProfile.model_fields)
    assert set(load("schemas/plan.schema.json")["$defs"]["step"]["properties"]) == set(GuideStep.model_fields)
    ideas = IdeasResult.model_validate(scan)
    guide = GuideResult.model_validate(plan)
    assert ideas.object_profile is not None
    selected = next(idea for idea in ideas.ideas if idea.id == guide.idea_id)
    assert CraftIdea.model_validate(context["craft"]) == selected
    assert context["display_name"] == ideas.object_profile.label
    assert not context["ready_for_integration"]  # references are illustrative, not supplied GLBs
    check_guide(guide, ideas.object_profile, selected, context["stages"])

    # Meaningful regression checks: a changed craft, stage order or inventory
    # must be rejected even when the response still has valid JSON fields.
    for change in (
        {"idea_id": "unrelated-craft"},
        {"tools": [*plan["tools"], "Undeclared tool"]},
        {"materials": [*plan["materials"], "Undeclared ribbon"]},
    ):
        bad = GuideResult.model_validate({**plan, **change})
        try:
            check_guide(bad, ideas.object_profile, selected, context["stages"])
        except ValueError:
            pass
        else:
            raise AssertionError(f"Invalid guide accepted: {change}")
    wrong_stages = deepcopy(context["stages"])
    wrong_stages[0], wrong_stages[1] = wrong_stages[1], wrong_stages[0]
    try:
        check_guide(guide, ideas.object_profile, selected, wrong_stages)
    except ValueError:
        pass
    else:
        raise AssertionError("Mismatched curated stage order accepted")
    print("PASS: strict schemas, backend contracts, craft inventory and curated stage binding")


if __name__ == "__main__":
    main()
