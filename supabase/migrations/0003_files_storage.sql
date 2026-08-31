-- Private per-user storage for job-application PDFs.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'application-files',
  'application-files',
  false,
  15728640, -- 15 MB
  array['application/pdf']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Each user may only touch objects under a top-level folder named with their uid.
create policy "application_files_select_own"
  on storage.objects for select
  using (
    bucket_id = 'application-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "application_files_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'application-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "application_files_update_own"
  on storage.objects for update
  using (
    bucket_id = 'application-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'application-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "application_files_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'application-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
