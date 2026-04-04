alter table public.profiles
  add column if not exists followed_store_slugs text[] not null default '{}';

create table if not exists public.collection_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  game text not null,
  language text not null default 'english',
  title text not null,
  set_name text not null default '',
  print_label text not null default '',
  rarity text not null default '',
  condition text not null default 'NM',
  quantity integer not null default 1,
  market_price numeric(10,2) not null default 0,
  market_price_currency text not null default 'CAD',
  source_label text not null default 'Manual entry',
  image_url text not null default '',
  notes text not null default '',
  added_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.collection_items enable row level security;

drop policy if exists "users manage own collection items" on public.collection_items;
create policy "users manage own collection items"
on public.collection_items for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create table if not exists public.user_event_preferences (
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_id text not null,
  reminder_enabled boolean not null default false,
  attendance_intent text,
  updated_at timestamptz not null default now(),
  primary key (user_id, event_id)
);

alter table public.user_event_preferences enable row level security;

drop policy if exists "users manage own event preferences" on public.user_event_preferences;
create policy "users manage own event preferences"
on public.user_event_preferences for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
