-- One-off data fix. An earlier spreadsheet import parsed year-less dates
-- (e.g. "Jan 5" or "1/5") with the JS engine's default year of 2001.
-- Normalise every applied date to 2026, preserving month and day, and
-- re-sync the backfilled "Applied" seed events to match.

update public.applications
set application_date =
  case
    when extract(month from application_date) = 2 and extract(day from application_date) = 29
      then date '2026-02-28'
    else make_date(
      2026,
      extract(month from application_date)::int,
      extract(day from application_date)::int
    )
  end
where extract(year from application_date) <> 2026;

update public.application_events e
set changed_at = a.application_date::timestamptz
from public.applications a
where e.application_id = a.id
  and e.from_status is null
  and e.changed_at::date <> a.application_date;
