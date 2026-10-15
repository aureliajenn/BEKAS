-- Idempotent upload-project creation and expiry for abandoned uploads.

alter table public.projects
    add column if not exists idempotency_key text,
    add column if not exists upload_expires_at timestamptz;

update public.projects
   set upload_expires_at = created_at + interval '30 minutes'
 where status = 'upload_pending'
   and upload_expires_at is null;

create unique index if not exists projects_idempotency_key_idx
    on public.projects (idempotency_key)
    where idempotency_key is not null;

create index if not exists projects_upload_expiry_idx
    on public.projects (upload_expires_at)
    where status = 'upload_pending';
