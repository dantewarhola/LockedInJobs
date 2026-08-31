-- Add 'N/A' as an allowed status (means: not provided in the application).

-- Drop whichever check constraint currently governs the status column.
do $$
declare
  c text;
begin
  select conname into c
  from pg_constraint
  where conrelid = 'public.applications'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%status%'
  limit 1;

  if c is not null then
    execute format('alter table public.applications drop constraint %I', c);
  end if;
end $$;

alter table public.applications
  add constraint applications_status_check check (
    status in (
      'Applied', 'Online Assessment', 'Interview', 'Offer',
      'Rejected', 'Withdrawn', 'Ghosted', 'N/A'
    )
  );
