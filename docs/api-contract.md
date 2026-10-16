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

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/projects` | Create idempotent upload-pending project and signed upload target |
| `POST` | `/projects/{id}/start` | Verify uploaded image; atomically enqueue mesh and ideas |
| `GET` | `/projects/{id}` | Return component status, results, and fresh asset URLs |
| `POST` | `/projects/{id}/guide` | Create/reuse a guide job after ideas exist |
| `POST` | `/projects/{id}/retry` | Requeue an eligible failed job within its attempt budget |
| `POST` | `/worker/jobs/claim` | Vast.ai worker claims next eligible mesh job; `204` if queue empty |
| `POST` | `/worker/jobs/{id}/heartbeat` | Renew GPU lease and optionally refresh upload URL |
| `POST` | `/worker/jobs/{id}/complete` | Verify uploaded GLB, then activate asset idempotently |
| `POST` | `/worker/jobs/{id}/fail` | Report structured failure; backend decides retry |
| `GET` | `/health` | API process health check |
| `GET` | `/ready` | Database and Storage readiness check |

## Project upload flow

`POST /projects` requires an `Idempotency-Key` header (16–200 characters). It returns the same upload-pending project for a repeated key and a short-lived signed upload target:

```json
{
  "project_id": "<uuid>",
  "status": "upload_pending",
  "upload_target": {
    "bucket": "bekas-assets",
    "path": "projects/<project-id>/input/source.jpg",
    "url": "<temporary signed upload URL>",
    "method": "PUT",
    "headers": {"Content-Type": "image/jpeg"}
  },
  "upload_expires_at": "<RFC 3339 timestamp>"
}
```

The client uploads raw JPEG bytes to the signed URL with the returned method and headers. Then `POST /projects/{id}/start` verifies image MIME, decode, dimensions (≤1,536 px per side), and size (≤5 MB), stores the input asset checksum, and transactionally queues `mesh` and `ideas`. Repeating `start` returns existing jobs without creating duplicates.

`GET /projects/{id}` returns typed `IdeasResult` and `GuideResult` objects when available, `components.mesh`, `components.ideas`, and `components.guide`, plus a per-step `illustrations` map and fresh signed URLs for active assets. Guide creation requires an accepted `IdeasResult` to be stored; until the AI runner is implemented, the endpoint returns `409 ideas_not_ready`.

Migration order: apply `database/migrations/0001_initial_schema.sql`, then `0002_project_upload_idempotency.sql`. Create the private `bekas-assets` bucket as described in [`database/README.md`](../database/README.md).

No endpoint authenticates an end user in the MVP. Worker endpoints require `Authorization: Bearer <WORKER_TOKEN>`; job mutation also requires an active `claim_token`. Mobile calls the API, never Supabase tables directly.

## Vast.ai worker wire format

`POST /worker/jobs/claim` request:

```json
{"worker_id":"vast-gpu-01","supported_kinds":["mesh"]}
```

Successful response:

```json
{
  "job_id":"<uuid>",
  "project_id":"<uuid>",
  "attempt":1,
  "claim_token":"<uuid>",
  "input_url":"<temporary signed download URL>",
  "input_sha256":"<64 hex characters>",
  "output_bucket":"bekas-assets",
  "output_path":"projects/<project-id>/mesh/attempt-1/model.glb",
  "output_upload_url":"<temporary signed upload URL>",
  "lease_expires_at":"<RFC 3339 timestamp>"
}
```

Heartbeat body contains `worker_id`, `claim_token`, and optional `refresh_upload_url`. Completion body contains `claim_token`, output bucket/path, `mime_type`, `byte_size`, `checksum_sha256`, model/version, `fallback_used`, and timing fields. A worker may process one global mesh job at a time; claim uses a Postgres advisory lock plus `FOR UPDATE SKIP LOCKED`.

## Reward endpoints (PRD 1.3, belum diimplementasi backend)

Spesifikasi lengkap ada di [PRD bagian 17.3](../PRD.md#173-endpoint-tambahan). Ringkasan:

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/rws` | Daftar RW dan nama kapten |
| `PUT` | `/participants/{participant_id}` | Upsert peserta anonim (UUID dari HP) + `rw_id` |
| `POST` | `/projects/{id}/verification` | Signed upload target untuk foto sesudah |
| `POST` | `/projects/{id}/verification/start` | Validasi foto, antrekan job `verification`; 202 |
| `GET` | `/participants/{id}/wallet` | Saldo, ledger, pengajuan tukar |
| `GET` | `/rewards` | Katalog hadiah dan stok |
| `POST` | `/participants/{id}/redemptions` | Ajukan tukar hadiah (Idempotency-Key) |
| `GET` | `/leaderboard?month=YYYY-MM` | Peringkat RW + tantangan bulanan |
| `GET` | `/bank-sampah` | Daftar bank sampah mitra |

`GET /participants/{id}/wallet` menambah `weekly_streak` (int) dan `verified_this_week` (bool) sejak PRD 1.4; aturan hitung di PRD 17.2.

`GET /projects/{id}` menambah `components.verification` dan `verification: {approved, reason, points} | null`. Mobile sudah memakai bentuk ini di mode fixture (`apps/mobile/src/lib/rewards.ts`).
