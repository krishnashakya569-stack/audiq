-- Cache the authenticated user ID once per statement in the chat send policy.
drop policy if exists "Friends can send chat messages" on public.chat_messages;
create policy "Friends can send chat messages"
  on public.chat_messages for insert to authenticated
  with check (
    (select auth.uid()) = sender_id
    and sender_id <> receiver_id
    and length(btrim(body)) between 1 and 2000
    and message_type in ('text', 'song', 'playlist')
    and (message_type = 'text' or song is not null)
    and exists (
      select 1
      from public.friendships f
      where f.status = 'accepted'
        and (
          (f.requester_id = sender_id and f.addressee_id = receiver_id)
          or
          (f.requester_id = receiver_id and f.addressee_id = sender_id)
        )
    )
  );
