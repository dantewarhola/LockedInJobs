-- Favorite (pin) flag for applications. Favorited applications are shown
-- pinned at the top of the active applications list; clearing the flag drops
-- the row back to its natural position.

alter table public.applications
  add column favorite boolean not null default false;

create index applications_user_favorite_idx
  on public.applications (user_id, favorite);
