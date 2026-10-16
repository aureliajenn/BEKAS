from app.prompts.illustration import (
    ILLUSTRATION_PROMPT_VERSION,
    build_step_illustration_prompt,
)
from app.schemas.ai import GuideStep, ObjectProfile


def test_illustration_prompt_keeps_fixed_2d_style_and_serializes_step() -> None:
    profile = ObjectProfile(
        label="Botol plastik",
        visible_parts=["Badan botol", "Tutup hijau"],
        material_guess="Plastik, jenis resin belum diketahui",
        uncertainties=["Ukuran tidak diketahui"],
    )
    step = GuideStep(
        id="cut-body",
        order=2,
        title="Potong mengikuti garis",
        instruction="Gunting perlahan mengikuti garis spidol.",
        expected_result="Badan botol menjadi wadah terbuka.",
        illustration_prompt="Gambar satu tangan menggunakan gunting.",
    )

    prompt = build_step_illustration_prompt(
        object_profile=profile,
        guide_title="Wadah alat tulis",
        step=step,
    )

    assert ILLUSTRATION_PROMPT_VERSION == "bekas-illustration-2d-v1"
    assert "2D flat tutorial illustration" in prompt
    assert "#073B32" in prompt and "#B8EC3D" in prompt
    assert "exactly one 4:3 panel" in prompt
    assert '"order":2' in prompt
    assert "Potong mengikuti garis" in prompt
    assert "No written words" in prompt
