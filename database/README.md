# Database and Storage

Apply `0001_initial_schema.sql`, `0002_project_upload_idempotency.sql`, then `0003_job_claim_limits.sql` from `migrations/` to Supabase Postgres. Migration 0003 is required by the internal hosted-SF3D consumer: it records claim start and derives project processing status from non-terminal jobs. Keep existing migration history; no table/column removal is required for replacing the remote worker. Migrations create only `projects`, `jobs`, and `assets`; RLS denies direct client table access.

Create one private Storage bucket before using upload endpoints:

- `bekas-assets` for normalized photos, GLBs, and step illustrations.
- Use paths under `projects/<project_id>/input/`, `mesh/`, and `illustrations/` to keep assets grouped.
- Set the bucket's maximum file size to 10 MiB and allow `image/jpeg`, `image/png`, and `model/gltf-binary`. API enforces a stricter 5 MiB limit for input photos.

The backend owns database access and creates short-lived signed upload/download URLs. The mobile app must never receive the Supabase service-role key. Keep bucket paths and metadata in `assets`; do not store signed URLs as durable identifiers.

Bucket limits, allowed MIME types, and signed URL lifetimes must match the API validators before integration.
