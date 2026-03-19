drop policy if exists "admins can delete reviews" on public.reviews;

create policy "admins can delete reviews"
on public.reviews for delete using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);
