from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, model_validator


class ObjectProfile(BaseModel):
    label: str = Field(min_length=1, max_length=120)
    visible_parts: list[str] = Field(min_length=1, max_length=20)
    material_guess: str = Field(min_length=1, max_length=200)
    uncertainties: list[str] = Field(max_length=20)


class CraftIdea(BaseModel):
    id: str = Field(min_length=1, max_length=100)
    title: str = Field(min_length=1, max_length=160)
    purpose: str = Field(min_length=1, max_length=500)
    difficulty: str = Field(min_length=1, max_length=40)
    estimated_minutes: int = Field(gt=0, le=600)
    extra_materials: list[str] = Field(max_length=30)
    tools: list[str] = Field(max_length=30)
    safety_notes: list[str] = Field(max_length=30)


class IdeasResult(BaseModel):
    schema_version: str = Field(min_length=1, max_length=40)
    input_status: Literal["accepted", "needs_new_photo"]
    explanation: str | None = Field(default=None, max_length=500)
    object_profile: ObjectProfile | None = None
    ideas: list[CraftIdea] = Field(default_factory=list, max_length=3)

    @model_validator(mode="after")
    def validate_result_contract(self) -> IdeasResult:
        if self.input_status == "accepted":
            if self.object_profile is None:
                raise ValueError("accepted input requires object_profile")
            if len(self.ideas) != 3:
                raise ValueError("accepted input requires exactly three ideas")
            if len({idea.id for idea in self.ideas}) != 3:
                raise ValueError("idea IDs must be distinct")
        else:
            if not self.explanation:
                raise ValueError("needs_new_photo requires an explanation")
            if self.ideas:
                raise ValueError("needs_new_photo must not contain ideas")
        return self


class GuideStep(BaseModel):
    id: str = Field(min_length=1, max_length=100)
    order: int = Field(gt=0, le=6)
    title: str = Field(min_length=1, max_length=160)
    instruction: str = Field(min_length=1, max_length=1500)
    expected_result: str = Field(min_length=1, max_length=500)
    illustration_prompt: str = Field(min_length=1, max_length=1200)


class GuideResult(BaseModel):
    schema_version: str = Field(min_length=1, max_length=40)
    idea_id: str = Field(min_length=1, max_length=100)
    title: str = Field(min_length=1, max_length=160)
    estimated_minutes: int | None = Field(default=None, gt=0, le=600)
    materials: list[str] = Field(max_length=40)
    tools: list[str] = Field(max_length=40)
    safety_notes: list[str] = Field(max_length=40)
    steps: list[GuideStep] = Field(min_length=4, max_length=6)

    @model_validator(mode="after")
    def validate_step_order(self) -> GuideResult:
        step_ids = [step.id for step in self.steps]
        step_order = [step.order for step in self.steps]
        if len(set(step_ids)) != len(step_ids):
            raise ValueError("step IDs must be distinct")
        if step_order != list(range(1, len(self.steps) + 1)):
            raise ValueError("steps must be ordered consecutively starting at 1")
        return self
