# API contract baseline

Contract source: [PRD](../PRD.md), sections 8–10. JSON keys use `snake_case` on the wire.

## Core values

- Job kinds: `mesh`, `ideas`, `guide`, `illustration`.
- Job states: `queued`, `running`, `succeeded`, `retry_wait`, `failed`.
- Asset kinds: `input`, `mesh`, `illustration`.
- `IdeasResult`: schema version, input status, object profile, and exactly three ideas for accepted input. `needs_new_photo` includes an explanation and does not force ideas.
- `GuideResult`: selected idea ID, materials, tools, safety notes, and 4–6 ordered steps.
- Illustration status belongs to each step; guide text is available before illustrations finish.
- Error shape: `code`, `message`, `retryable`, and `job_id` when relevant.

## Planned endpoints

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/projects` | Create upload-pending project and signed upload target |
| `POST` | `/projects/{id}/start` | Validate input; enqueue mesh and ideas |
| `GET` | `/projects/{id}` | Return component status, valid results, and fresh asset URLs |
| `POST` | `/projects/{id}/guide` | Create or reuse a guide job for a project idea |
| `POST` | `/projects/{id}/retry` | Retry an eligible failed job within its attempt budget |
| `POST` | `/worker/jobs/claim` | Internal CLI claim for one eligible mesh job |
| `POST` | `/worker/jobs/{id}/heartbeat` | Renew an active CLI lease and transfer URLs |
| `POST` | `/worker/jobs/{id}/complete` | Validate and activate imported assets idempotently |
| `POST` | `/worker/jobs/{id}/fail` | Report structured failure; backend decides retry |
| `GET` | `/health` | API process health check |

No endpoint authenticates an end user in the MVP. Worker endpoints require the internal worker token and an active claim. Mobile calls the API, never Supabase tables directly.
