create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'seller' check (role in ('seller', 'admin')),
  name text not null,
  username text unique,
  avatar_url text,
  email text not null unique,
  neighborhood text,
  postal_code text,
  bio text not null default '',
  badges text[] not null default '{}',
  verified boolean not null default false,
  account_status text not null default 'active' check (account_status in ('active', 'suspended')),
  banner_style text not null default 'neutral',
  favorite_games text[] not null default '{}',
  meetup_preferences text not null default '',
  response_time text not null default '~ 1 hour',
  completed_deals integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('WTS', 'WTB', 'WTT')),
  game text not null,
  game_slug text not null,
  title text not null,
  price numeric(10,2) not null default 0,
  price_currency text not null default 'CAD',
  previous_price numeric(10,2),
  market_price numeric(10,2),
  market_price_currency text not null default 'CAD',
  condition text not null default 'NM',
  neighborhood text,
  postal_code text,
  accepts_trade boolean not null default false,
  listing_format text not null default 'single',
  quantity integer not null default 1,
  bundle_items jsonb not null default '[]'::jsonb,
  description text not null default '',
  primary_image text,
  image_gallery jsonb not null default '[]'::jsonb,
  condition_images jsonb not null default '[]'::jsonb,
  status text not null default 'active' check (status in ('active', 'sold', 'removed')),
  featured boolean not null default false,
  flagged boolean not null default false,
  admin_notes text not null default '',
  views integer not null default 0,
  offers integer not null default 0,
  price_history jsonb not null default '[]'::jsonb,
  edit_history jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.wishlists (
  user_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

create table public.listing_drafts (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.message_threads (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.listings(id) on delete set null,
  participant_ids uuid[] not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.message_threads(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  read_by uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  offer_type text not null check (offer_type in ('cash', 'trade', 'cash-trade')),
  cash_amount numeric(10,2) not null default 0,
  trade_items jsonb not null default '[]'::jsonb,
  note text not null default '',
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'countered')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  author_name text not null,
  rating integer not null check (rating between 1 and 5),
  comment text not null,
  image_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists username text;
create unique index if not exists profiles_username_key on public.profiles (username);
alter table public.profiles add column if not exists avatar_url text;
alter table public.reviews add column if not exists image_url text;

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  details text not null,
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  entity_id text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.bug_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  area text not null default 'general',
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high', 'critical')),
  status text not null default 'open' check (status in ('open', 'triaged', 'in-progress', 'fixed', 'closed')),
  page_path text,
  expected_behavior text,
  actual_behavior text not null,
  reproduction_steps text not null,
  environment_label text,
  screenshot_url text,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.manual_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  store text not null,
  source text not null default 'Admin override',
  source_type text not null default 'manual',
  source_url text,
  date_str date not null,
  time text not null,
  game text not null,
  fee text not null default 'TBD',
  neighborhood text,
  note text not null default '',
  published boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.search_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  query text not null,
  game text,
  source text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.wishlists enable row level security;
alter table public.listing_drafts enable row level security;
alter table public.message_threads enable row level security;
alter table public.messages enable row level security;
alter table public.offers enable row level security;
alter table public.reviews enable row level security;
alter table public.reports enable row level security;
alter table public.notifications enable row level security;
alter table public.bug_reports enable row level security;
alter table public.manual_events enable row level security;
alter table public.search_history enable row level security;

create policy "profiles are readable by everyone"
on public.profiles for select using (true);

create policy "users can insert their own profile"
on public.profiles for insert with check (auth.uid() = id);

create policy "users can update their own profile"
on public.profiles for update using (auth.uid() = id);

create policy "admins can update any profile"
on public.profiles for update using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

create policy "active listings are readable by everyone"
on public.listings for select using (true);

create policy "users can insert their own listings"
on public.listings for insert with check (auth.uid() = seller_id);

create policy "owners or admins can update listings"
on public.listings for update using (
  auth.uid() = seller_id
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

create policy "wishlist owner full access"
on public.wishlists for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "draft owner full access"
on public.listing_drafts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "thread participants can read"
on public.message_threads for select using (auth.uid() = any(participant_ids));

create policy "authenticated users can create threads they belong to"
on public.message_threads for insert with check (auth.uid() = any(participant_ids));

create policy "thread participants can update"
on public.message_threads for update using (auth.uid() = any(participant_ids));

create policy "thread participants can read messages"
on public.messages for select using (
  exists (
    select 1
    from public.message_threads t
    where t.id = thread_id and auth.uid() = any(t.participant_ids)
  )
);

create policy "thread participants can insert messages"
on public.messages for insert with check (
  auth.uid() = sender_id
  and exists (
    select 1
    from public.message_threads t
    where t.id = thread_id and auth.uid() = any(t.participant_ids)
  )
);

create policy "thread participants can update messages"
on public.messages for update using (
  exists (
    select 1
    from public.message_threads t
    where t.id = thread_id and auth.uid() = any(t.participant_ids)
  )
);

create policy "offer parties or admins can read offers"
on public.offers for select using (
  auth.uid() = buyer_id
  or auth.uid() = seller_id
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

create policy "buyers can create offers"
on public.offers for insert with check (auth.uid() = buyer_id);

create policy "buyers sellers or admins can update offers"
on public.offers for update using (
  auth.uid() = buyer_id
  or auth.uid() = seller_id
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

create policy "reviews readable by everyone"
on public.reviews for select using (true);

create policy "authenticated users can insert reviews"
on public.reviews for insert with check (auth.uid() = author_id);

create policy "admins can delete reviews"
on public.reviews for delete using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

create policy "reporter or admins can read reports"
on public.reports for select using (
  auth.uid() = reporter_id
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

create policy "authenticated users can insert reports"
on public.reports for insert with check (auth.uid() = reporter_id);

create policy "admins can update reports"
on public.reports for update using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

create policy "notification owner access"
on public.notifications for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "beta testers or admins can read bug reports"
on public.bug_reports for select using (
  auth.uid() = reporter_id
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (p.role = 'admin' or 'beta' = any(p.badges))
  )
);

create policy "beta testers or admins can insert bug reports"
on public.bug_reports for insert with check (
  auth.uid() = reporter_id
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (p.role = 'admin' or 'beta' = any(p.badges))
  )
);

create policy "admins can update bug reports"
on public.bug_reports for update using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

create policy "manual events are publicly readable"
on public.manual_events for select using (
  published = true
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

create policy "admins manage manual events"
on public.manual_events for all using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
) with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

create policy "users manage own search history"
on public.search_history for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

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

create policy "Public can read listing media"
on storage.objects for select
to public
using (bucket_id = 'listing-media');

create policy "Authenticated users can upload own listing media"
on storage.objects for insert
to authenticated
with check (bucket_id = 'listing-media');

create policy "Users can update own listing media"
on storage.objects for update
to authenticated
using (bucket_id = 'listing-media')
with check (bucket_id = 'listing-media');

create policy "Users can delete own listing media"
on storage.objects for delete
to authenticated
using (bucket_id = 'listing-media');
