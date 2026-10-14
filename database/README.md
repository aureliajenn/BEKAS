# Database and Storage

Apply `migrations/0001_initial_schema.sql` to the BEKAS Supabase Postgres project through the SQL editor or Supabase CLI. Migration creates only `projects`, `jobs`, and `assets`; it does not create auth/user tables or user ownership fields. RLS is enabled with no client policies, and direct `anon`/`authenticated` table privileges are revoked.

Create private Storage buckets before using upload endpoints:

- `bekas-input` for normalized source photos.
- `bekas-output` for GLBs and step illustrations.

The backend owns database access and creates short-lived signed upload/download URLs. The mobile app must never receive the Supabase service-role key. Keep bucket paths and metadata in `assets`; do not store signed URLs as durable identifiers.

Bucket limits, allowed MIME types, and signed URL lifetimes must match the API validators before integration.
