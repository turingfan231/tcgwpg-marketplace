drop policy if exists "event attendance is readable by everyone" on public.user_event_preferences;

create policy "event attendance is readable by everyone"
on public.user_event_preferences
for select
using (true);
