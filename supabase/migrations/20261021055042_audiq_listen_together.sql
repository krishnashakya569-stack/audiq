-- Limit Audiq private listening-room broadcasts and presence to an accepted friend pair.
drop policy if exists "Accepted friends can receive Audiq room updates" on realtime.messages;
create policy "Accepted friends can receive Audiq room updates"
  on realtime.messages for select to authenticated
  using (
    extension in ('broadcast', 'presence')
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

drop policy if exists "Accepted friends can send Audiq room updates" on realtime.messages;
create policy "Accepted friends can send Audiq room updates"
  on realtime.messages for insert to authenticated
  with check (
    extension = 'broadcast'
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
