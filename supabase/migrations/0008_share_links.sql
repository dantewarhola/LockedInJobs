-- Read-only "share" links: one per user, lets them hand out a URL that
-- shows their Dashboard/Applications/Rejected pages without signing in.
-- The owner manages their own row via normal RLS below; the
-- security-definer function is the only way to read across users, and it
-- only ever returns data for the account that owns a given, still-existing
-- token.

create table public.share_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  token uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now()
);

alter table public.share_links enable row level security;

create policy "share_links_select_own"
  on public.share_links for select
  using (auth.uid() = user_id);

create policy "share_links_insert_own"
  on public.share_links for insert
  with check (auth.uid() = user_id);

create policy "share_links_delete_own"
  on public.share_links for delete
  using (auth.uid() = user_id);

create or replace function public.get_shared_dashboard_data(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  select user_id into v_user_id from public.share_links where token = p_token;
  if v_user_id is null then
    return null;
  end if;

  return jsonb_build_object(
    'applications', coalesce(
      (select jsonb_agg(a) from public.applications a where a.user_id = v_user_id),
      '[]'::jsonb
    ),
    'events', coalesce(
      (select jsonb_agg(e) from public.application_events e where e.user_id = v_user_id),
      '[]'::jsonb
    ),
    'weeklyGoal', coalesce(
      (select weekly_goal from public.user_settings where user_id = v_user_id),
      5
    )
  );
end;
$$;

grant execute on function public.get_shared_dashboard_data(uuid) to anon, authenticated;
