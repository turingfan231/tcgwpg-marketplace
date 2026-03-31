create table if not exists public.admin_audit_log (
  id text primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  actor_name text not null default 'Admin',
  action text not null default 'updated',
  title text not null default 'Admin action',
  details text not null default '',
  target_id text,
  target_type text not null default 'record',
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_log_created_at_idx
on public.admin_audit_log (created_at desc);

alter table public.admin_audit_log enable row level security;

drop policy if exists "admins can read admin audit log" on public.admin_audit_log;
create policy "admins can read admin audit log"
on public.admin_audit_log for select using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "admins can insert admin audit log" on public.admin_audit_log;
create policy "admins can insert admin audit log"
on public.admin_audit_log for insert with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);
