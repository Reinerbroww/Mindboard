-- Storage bucket for original PDF materials.
insert into storage.buckets (id, name, public)
values ('materials', 'materials', false)
on conflict (id) do nothing;

-- Users can only access files inside their own user_id folder.
create policy "Users can read own material files"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'materials'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can upload own material files"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'materials'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete own material files"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'materials'
    and (storage.foldername(name))[1] = auth.uid()::text
  );