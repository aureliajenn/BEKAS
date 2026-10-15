from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.schemas.ai import GuideResult, IdeasResult


def ideas_payload(count: int = 3) -> dict:
    return {
        "schema_version": "1.0",
        "input_status": "accepted",
        "object_profile": {
            "label": "Botol plastik",
            "visible_parts": ["Badan", "Tutup"],
            "material_guess": "Plastik",
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
            for index in range(count)
        ],
    }


def guide_payload() -> dict:
    return {
        "schema_version": "1.0",
        "idea_id": "idea-1",
        "title": "Wadah alat tulis",
        "materials": ["Botol bersih"],
        "tools": ["Gunting"],
        "safety_notes": ["Tutup bagian tepi."],
        "steps": [
            {
                "id": f"step-{index}",
                "order": index,
                "title": f"Langkah {index}",
                "instruction": "Lakukan tahap ini dengan hati-hati.",
                "expected_result": "Benda terlihat rapi.",
                "illustration_prompt": "Ilustrasi langkah sederhana.",
            }
            for index in range(1, 5)
        ],
    }


def test_ideas_result_requires_exactly_three_distinct_ideas() -> None:
    result = IdeasResult.model_validate(ideas_payload())
    assert len(result.ideas) == 3

    with pytest.raises(ValidationError, match="exactly three ideas"):
        IdeasResult.model_validate(ideas_payload(count=2))


def test_needs_new_photo_returns_explanation_without_forced_ideas() -> None:
    result = IdeasResult.model_validate(
        {
            "schema_version": "1.0",
            "input_status": "needs_new_photo",
            "explanation": "Foto memuat lebih dari satu objek.",
        }
    )
    assert result.ideas == []
    assert result.object_profile is None


def test_guide_requires_four_to_six_consecutive_steps() -> None:
    result = GuideResult.model_validate(guide_payload())
    assert len(result.steps) == 4

    invalid = guide_payload()
    invalid["steps"][2]["order"] = 4
    with pytest.raises(ValidationError, match="ordered consecutively"):
        GuideResult.model_validate(invalid)
