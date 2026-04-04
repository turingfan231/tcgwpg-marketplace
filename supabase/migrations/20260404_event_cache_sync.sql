alter table public.manual_events
  add column if not exists external_key text,
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists manual_events_external_key_unique
  on public.manual_events (external_key)
  where external_key is not null;

create index if not exists manual_events_source_type_date_idx
  on public.manual_events (source_type, date_str, published);
