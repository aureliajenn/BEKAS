# BEKAS — Reference-Based Step Illustration

Prompt version: `bekas-curated-v1`.

Use after guide validation. Backend fills placeholders from stored metadata, validated guide and matching team stage. Attach the actual reference images to the image-generation request; filenames in text are not visual references.

```text
Create ONE instructional illustration for BEKAS showing the state AFTER the supplied step.

CURATED SOURCE OBJECT: {{object_description}}
SELECTED CRAFT: {{craft_title}}
DECLARED MATERIALS: {{materials}}
STEP: {{step_title}}
ACTION: {{instruction}}
EXPECTED RESULT: {{expected_result}}
STEP VISUAL DESCRIPTION: {{illustration_prompt}}
TEAM BEFORE/AFTER DESCRIPTION, IF AVAILABLE: {{stage_before_after}}

Reference images attached:
- Original object render.
- Matching team-authored after-stage render, if available.
- Optional reviewed preceding illustration for continuity; it must not override the team render.

Keep source object shape, visible material, proportions, and existing decorations consistent with references.
Depict only changes performed up to this step. No future changes, undeclared decoration or additional components.
When an after-stage render exists, follow that geometry; do not redesign it or replace it with a different manufactured item.
Keep three-quarter viewpoint, framing, neutral background and clear lighting consistent across steps.
Do not show hands/tools unless needed to explain this step; any shown tool must be declared in the guide.
No captions, numbers, labels, dimensions, watermarks or generated cutting overlays. App supplies captions; team supplies any diagram overlay.
This is a visual aid, not calibrated CAD or an exact cutting template.
```

If only an intact-object render exists, generated after-state appearance is illustrative and may vary; do not claim an exact match to an absent stage model. One failed image must not block guide text or other completed steps. No separate state/material graph is required.
