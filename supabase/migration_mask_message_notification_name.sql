-- 채팅 메시지 알림(종모양/인앱) 제목에 상대 실명이 그대로 노출되던 문제 수정.
-- 채팅방은 maskName(홍길동 → 홍**)으로 마스킹하지만 알림 제목만 실명이라 익명 정책과 충돌했음.
-- 트리거에서 앱의 maskName 규칙과 동일하게 마스킹: 빈값→'익명', 1글자→'X*', N글자→앞1글자+'*'×(N-1).
create or replace function public.notify_on_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recipient   uuid;
  v_sender_name text;
  v_masked      text;
begin
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

  -- maskName 규칙과 동일하게 마스킹 (실명 노출 방지)
  v_masked := case
    when v_sender_name is null or btrim(v_sender_name) = '' then '익명'
    else left(btrim(v_sender_name), 1)
         || repeat('*', greatest(char_length(btrim(v_sender_name)) - 1, 1))
  end;

  insert into public.notifications (user_id, type, title, body, link)
  values (
    v_recipient,
    'message',
    v_masked || '님의 새 메시지',
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

-- 기존에 실명이 박혀 있던 message 알림도 일괄 마스킹 (이미 '*' 포함 시 건너뜀).
with src as (
  select id, regexp_replace(title, '님의 새 메시지$', '') as nm
  from public.notifications
  where type = 'message' and title ~ '님의 새 메시지$'
)
update public.notifications t
set title = (case
    when src.nm = '' or src.nm = '상대' then '익명'
    else left(src.nm, 1) || repeat('*', greatest(char_length(src.nm) - 1, 1))
  end) || '님의 새 메시지'
from src
where t.id = src.id
  and src.nm !~ '\*';
