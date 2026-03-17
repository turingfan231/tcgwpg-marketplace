alter table public.profiles add column if not exists username text;
create unique index if not exists profiles_username_key on public.profiles (username);
alter table public.reviews add column if not exists image_url text;
