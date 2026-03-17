create policy "thread participants can update messages"
on public.messages for update using (
  exists (
    select 1
    from public.message_threads t
    where t.id = thread_id and auth.uid() = any(t.participant_ids)
  )
);
