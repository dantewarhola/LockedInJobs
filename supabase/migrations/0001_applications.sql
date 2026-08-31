-- Job tracking: applications table, constraints, trigger, RLS.

create extension if not exists pgcrypto;

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  company_name text not null check (length(trim(company_name)) > 0),
  job_title text not null check (length(trim(job_title)) > 0),
  location text,
  salary_min integer check (salary_min is null or salary_min >= 0),
  salary_max integer check (salary_max is null or salary_max >= 0),
  application_date date not null default current_date,
  status text not null default 'Applied' check (
    status in ('Applied', 'Online Assessment', 'Interview', 'Offer', 'Rejected', 'Withdrawn', 'Ghosted')
  ),
  dashboard_url text,
  notes text,
  rejected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint salary_order check (
    salary_min is null or salary_max is null or salary_max >= salary_min
  )
);

create index applications_user_status_idx on public.applications (user_id, status);
create index applications_user_date_idx on public.applications (user_id, application_date desc);

create or replace function public.tg_applications_maintain()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  if new.status = 'Rejected' then
    if new.rejected_at is null then
      new.rejected_at := now();
    end if;
  else
    new.rejected_at := null;
  end if;
  return new;
end;
$$;

create trigger applications_maintain
before insert or update on public.applications
for each row execute function public.tg_applications_maintain();

alter table public.applications enable row level security;

create policy "applications_select_own"
  on public.applications for select
  using (auth.uid() = user_id);

create policy "applications_insert_own"
  on public.applications for insert
  with check (auth.uid() = user_id);

create policy "applications_update_own"
  on public.applications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "applications_delete_own"
  on public.applications for delete
  using (auth.uid() = user_id);
