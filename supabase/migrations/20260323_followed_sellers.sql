alter table public.profiles
add column if not exists followed_seller_ids uuid[] not null default '{}';
