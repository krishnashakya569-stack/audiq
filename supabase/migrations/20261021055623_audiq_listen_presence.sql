-- Presence updates are a separate Realtime action from broadcast messages.
drop policy if exists "Accepted friends can publish Audiq room presence" on realtime.messages;
create policy "Accepted friends can publish Audiq room presence"
  on realtime.messages for insert to authenticated
  with check (
    extension = 'presence'
    and split_part(realtime.topic(), ':', 1) = 'audiq-listen'
    and (select auth.uid())::text in (
      split_part(realtime.topic(), ':', 2),
      split_part(realtime.topic(), ':', 3)
    )
    and exists (
      select 1
      from public.friendships f
      where f.status = 'accepted'
        and (
          (f.requester_id::text = split_part(realtime.topic(), ':', 2)
            and f.addressee_id::text = split_part(realtime.topic(), ':', 3))
          or
          (f.requester_id::text = split_part(realtime.topic(), ':', 3)
            and f.addressee_id::text = split_part(realtime.topic(), ':', 2))
        )
    )
  );
