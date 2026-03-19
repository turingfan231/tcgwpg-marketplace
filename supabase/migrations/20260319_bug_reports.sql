create table if not exists public.bug_reports (
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

alter table public.bug_reports enable row level security;

drop policy if exists "beta testers or admins can read bug reports" on public.bug_reports;
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

drop policy if exists "beta testers or admins can insert bug reports" on public.bug_reports;
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

drop policy if exists "admins can update bug reports" on public.bug_reports;
create policy "admins can update bug reports"
on public.bug_reports for update using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);
