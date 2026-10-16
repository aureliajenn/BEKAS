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

Migration order: `0001_initial_schema.sql`, `0002_project_upload_idempotency.sql`, `0003_job_claim_limits.sql`. Create private `bekas-assets` bucket as described in [`database/README.md`](../database/README.md).

No endpoint authenticates an end user in the MVP. Mobile project endpoints and response shapes are unchanged by hosted SF3D. Mobile calls FastAPI and uses backend-issued signed Storage URLs; it never calls the Space directly. Retired `/worker/jobs/*` endpoints return 404.

## Hosted SF3D processing (backend only)

One internal mesh consumer claims persisted jobs with an attempt token and fixed deadline. It invokes `stabilityai/stable-fast-3d` in an isolated Gradio session, validates/downloads the GLB, stores it in Supabase, then commits result and job together. No HTTP heartbeat/callback or GPU worker credential exists. Space temporary URLs are never exposed as durable assets.

`components.mesh` still uses `queued`, `running`, `retry_wait`, `succeeded`, `failed`. Mesh asset still uses `kind=mesh`, `step_id=null`, `mime_type=model/gltf-binary`, and a fresh signed `url`. Provider quota/access/timeout errors retain `{code,message,retryable}`. Ideas/guide status is independent.

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

`GET /projects/{id}` menambah `components.verification` dan `verification: {approved, reason, points} | null`. Mobile sudah memakai bentuk ini di mode fixture (`apps/mobile/src/lib/rewards.ts`).
