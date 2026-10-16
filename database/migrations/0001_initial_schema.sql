-- BEKAS MVP: shared demo space, no user or auth tables.

create table if not exists public.projects (
    id uuid primary key default gen_random_uuid(),
    input_asset_id uuid,
    object_profile jsonb,
    ideas jsonb,
    selected_idea_id text,
    guide jsonb,
    schema_version text,
    prompt_version text,
    text_model text,
    image_model text,
    status text not null default 'upload_pending'
        check (status in ('upload_pending', 'active', 'completed', 'expired')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.jobs (
    id uuid primary key default gen_random_uuid(),
    project_id uuid not null references public.projects(id) on delete cascade,
    kind text not null check (kind in ('mesh', 'ideas', 'guide', 'illustration')),
    step_id text,
    status text not null default 'queued'
        check (status in ('queued', 'running', 'succeeded', 'retry_wait', 'failed')),
    attempt integer not null default 0 check (attempt >= 0),
    claim_token uuid,
    lease_expires_at timestamptz,
    next_run_at timestamptz not null default now(),
    idempotency_key text unique,
    error jsonb,
    timing jsonb not null default '{}'::jsonb,
    usage jsonb not null default '{}'::jsonb,
    started_at timestamptz,
    completed_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint jobs_step_kind_check check (
        (kind = 'illustration' and step_id is not null)
        or (kind <> 'illustration' and step_id is null)
    )
);

create index if not exists jobs_queue_idx
    on public.jobs (status, next_run_at, created_at);
create index if not exists jobs_project_idx
    on public.jobs (project_id, created_at);
create unique index if not exists jobs_logical_job_idx
    on public.jobs (project_id, kind, coalesce(step_id, ''));

create table if not exists public.assets (
    id uuid primary key default gen_random_uuid(),
    project_id uuid not null references public.projects(id) on delete cascade,
    kind text not null check (kind in ('input', 'mesh', 'illustration')),
    step_id text,
    bucket text not null,
    path text not null,
    mime_type text not null,
    byte_size bigint not null check (byte_size > 0),
    checksum_sha256 text not null,
    source_job_id uuid references public.jobs(id) on delete set null,
    source_attempt integer check (source_attempt is null or source_attempt >= 0),
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    constraint assets_step_kind_check check (
        (kind = 'illustration' and step_id is not null)
        or (kind <> 'illustration' and step_id is null)
    ),
    constraint assets_bucket_path_unique unique (bucket, path)
);

create index if not exists assets_project_idx
    on public.assets (project_id, kind);
create unique index if not exists assets_one_active_result_idx
    on public.assets (project_id, kind, coalesce(step_id, ''))
    where is_active;

alter table public.projects
    add constraint projects_input_asset_fk
    foreign key (input_asset_id) references public.assets(id) on delete set null;

-- Clients have no direct table access. Backend uses server credentials.
alter table public.projects enable row level security;
alter table public.jobs enable row level security;
alter table public.assets enable row level security;

revoke all on public.projects, public.jobs, public.assets from anon, authenticated;
