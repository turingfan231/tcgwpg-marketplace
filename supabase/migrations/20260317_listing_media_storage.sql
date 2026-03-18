insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'listing-media',
  'listing-media',
  true,
  1572864,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Public can read listing media'
  ) then
    create policy "Public can read listing media"
    on storage.objects for select
    to public
    using (bucket_id = 'listing-media');
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Authenticated users can upload own listing media'
  ) then
    create policy "Authenticated users can upload own listing media"
    on storage.objects for insert
    to authenticated
    with check (
      bucket_id = 'listing-media'
      and (storage.foldername(name))[1] = 'avatars'
      and (storage.foldername(name))[2] = auth.uid()::text
    );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Users can update own listing media'
  ) then
    create policy "Users can update own listing media"
    on storage.objects for update
    to authenticated
    using (
      bucket_id = 'listing-media'
      and owner_id = auth.uid()
    )
    with check (
      bucket_id = 'listing-media'
      and (storage.foldername(name))[1] = 'avatars'
      and (storage.foldername(name))[2] = auth.uid()::text
    );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Users can delete own listing media'
  ) then
    create policy "Users can delete own listing media"
    on storage.objects for delete
    to authenticated
    using (
      bucket_id = 'listing-media'
      and owner_id = auth.uid()
    );
  end if;
end
$$;
