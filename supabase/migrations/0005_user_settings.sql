-- Per-user preferences. Currently just the weekly application goal.

create table public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  weekly_goal integer not null default 5 check (weekly_goal between 1 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.tg_user_settings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger user_settings_updated_at
before update on public.user_settings
for each row execute function public.tg_user_settings_updated_at();

alter table public.user_settings enable row level security;

create policy "user_settings_select_own"
  on public.user_settings for select
  using (auth.uid() = user_id);

create policy "user_settings_insert_own"
  on public.user_settings for insert
  with check (auth.uid() = user_id);

create policy "user_settings_update_own"
  on public.user_settings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
