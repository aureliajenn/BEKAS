-- Track each claim's hard runtime budget independently from renewable leases.
alter table public.jobs
    add column if not exists claim_started_at timestamptz;

update public.jobs
   set claim_started_at = coalesce(started_at, updated_at, now())
 where status = 'running' and claim_started_at is null;

alter table public.jobs
    add constraint jobs_running_claim_started_check
    check (status <> 'running' or claim_started_at is not null) not valid;
alter table public.jobs validate constraint jobs_running_claim_started_check;

create index if not exists projects_processing_status_idx
    on public.projects (status);

create or replace function public.sync_project_processing_status()
returns trigger
language plpgsql
as $$
begin
    update public.projects project
       set status = case
               when exists (
                   select 1 from public.jobs job
                    where job.project_id = new.project_id
                      and job.status in ('queued', 'retry_wait', 'running')
               ) then 'active'
               else 'completed'
           end,
           updated_at = now()
     where project.id = new.project_id
       and project.status <> 'expired';
    return new;
end;
$$;

drop trigger if exists jobs_sync_project_processing_status on public.jobs;
create trigger jobs_sync_project_processing_status
after insert or update of status on public.jobs
for each row execute function public.sync_project_processing_status();

-- Existing active projects with no non-terminal jobs are already finished.
update public.projects project
   set status = 'completed', updated_at = now()
 where project.status = 'active'
   and not exists (
       select 1 from public.jobs job
        where job.project_id = project.id
          and job.status in ('queued', 'retry_wait', 'running')
   );
