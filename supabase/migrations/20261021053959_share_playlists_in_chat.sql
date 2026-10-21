-- Allow friends to share a bounded playlist snapshot in private chat.
alter table public.chat_messages
  drop constraint if exists chat_messages_message_type_check;

alter table public.chat_messages
  add constraint chat_messages_message_type_check
  check (
    (message_type = 'text' and song is null)
    or (message_type = 'song' and song is not null)
    or (
      message_type = 'playlist'
      and jsonb_typeof(song) = 'object'
      and case
        when jsonb_typeof(song -> 'tracks') = 'array'
          then jsonb_array_length(song -> 'tracks') between 1 and 100
        else false
      end
    )
  ) not valid;

drop policy if exists "Friends can send chat messages" on public.chat_messages;
create policy "Friends can send chat messages"
  on public.chat_messages for insert to authenticated
  with check (
    auth.uid() = sender_id
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
