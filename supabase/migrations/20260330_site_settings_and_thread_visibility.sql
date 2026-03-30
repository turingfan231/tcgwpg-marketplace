alter table public.message_threads
add column if not exists hidden_by jsonb not null default '{}'::jsonb;

create table if not exists public.site_settings (
  key text primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.site_settings enable row level security;

drop policy if exists "site settings are readable by everyone" on public.site_settings;
create policy "site settings are readable by everyone"
on public.site_settings for select using (true);

drop policy if exists "admins can insert site settings" on public.site_settings;
create policy "admins can insert site settings"
on public.site_settings for insert with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "admins can update site settings" on public.site_settings;
create policy "admins can update site settings"
on public.site_settings for update using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

insert into public.site_settings (key, payload, updated_at)
values (
  'global',
  '{}'::jsonb,
  now()
)
on conflict (key) do nothing;
