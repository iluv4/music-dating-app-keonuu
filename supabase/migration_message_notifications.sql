-- ============================================================
-- 채팅 메시지 알림 트리거 (추가 전용)
-- Supabase Dashboard → SQL Editor 에 붙여넣고 실행하세요.
-- 여러 번 실행해도 안전합니다 (idempotent).
--
-- 동작: messages INSERT 시, 매칭 상대(보낸 사람이 아닌 쪽)에게
--       type='message' 알림을 생성. notifications 직접 insert 는
--       막혀 있으므로 SECURITY DEFINER 트리거로 수행.
-- 스팸 방지: 같은 채팅에 아직 안 읽은 메시지 알림이 있으면 새로 만들지 않음.
-- ============================================================

create or replace function public.notify_on_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recipient   uuid;
  v_sender_name text;
begin
  -- 수신자 = 매칭에서 보낸 사람이 아닌 쪽
  select case when m.user_a = new.sender_id then m.user_b else m.user_a end
    into v_recipient
  from public.matches m
  where m.id = new.match_id;

  if v_recipient is null then
    return new;
  end if;

  -- 같은 채팅에 안 읽은 메시지 알림이 이미 있으면 중복 생성 안 함
  if exists (
    select 1 from public.notifications
    where user_id = v_recipient
      and type = 'message'
      and link = '/chat/' || new.match_id
      and is_read = false
  ) then
    return new;
  end if;

  select name into v_sender_name
  from public.profiles
  where user_id = new.sender_id;

  insert into public.notifications (user_id, type, title, body, link)
  values (
    v_recipient,
    'message',
    coalesce(nullif(v_sender_name, ''), '상대') || '님의 새 메시지',
    left(new.content, 50),
    '/chat/' || new.match_id
  );

  return new;
end;
$$;

drop trigger if exists messages_notify on public.messages;
create trigger messages_notify
  after insert on public.messages
  for each row execute function public.notify_on_message();
