-- Append-only log of every application status change. Powers the
-- time-to-first-response and time-in-stage dashboard metrics. Rows are written
-- ONLY by the trigger below; users can read their own rows and nothing else.

create table public.application_events (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index application_events_user_app_idx
  on public.application_events (user_id, application_id, changed_at);

create or replace function public.tg_applications_log_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.application_events
      (application_id, user_id, from_status, to_status, changed_at)
    values
      (new.id, new.user_id, null, new.status, new.application_date::timestamptz);
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    insert into public.application_events
      (application_id, user_id, from_status, to_status, changed_at)
    values
      (new.id, new.user_id, old.status, new.status, now());
  end if;
  return new;
end;
$$;

create trigger applications_log_event
after insert or update on public.applications
for each row execute function public.tg_applications_log_event();

-- Backfill: one seed event per existing application, at its application_date.
-- Historical transition dates are unknown, so existing applications only start
-- contributing to time-based metrics once they change status again.
insert into public.application_events
  (application_id, user_id, from_status, to_status, changed_at)
select id, user_id, null, 'Applied', application_date::timestamptz
from public.applications;

alter table public.application_events enable row level security;

create policy "application_events_select_own"
  on public.application_events for select
  using (auth.uid() = user_id);
