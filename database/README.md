# Database and Storage

Apply `migrations/0001_initial_schema.sql`, then `migrations/0002_project_upload_idempotency.sql`, to the BEKAS Supabase Postgres project through the SQL editor or Supabase CLI. Migrations create only `projects`, `jobs`, and `assets`; they do not create auth/user tables or user ownership fields. RLS is enabled with no client policies, and direct `anon`/`authenticated` table privileges are revoked.

Create one private Storage bucket before using upload endpoints:

- `bekas-assets` for normalized photos, GLBs, and step illustrations.
- Use paths under `projects/<project_id>/input/`, `mesh/`, and `illustrations/` to keep assets grouped.
- Set the bucket's maximum file size to 10 MiB and allow `image/jpeg`, `image/png`, and `model/gltf-binary`. API enforces a stricter 5 MiB limit for input photos.

The backend owns database access and creates short-lived signed upload/download URLs. The mobile app must never receive the Supabase service-role key. Keep bucket paths and metadata in `assets`; do not store signed URLs as durable identifiers.

Bucket limits, allowed MIME types, and signed URL lifetimes must match the API validators before integration.
