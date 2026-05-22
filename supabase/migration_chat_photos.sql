-- ============================================================
-- 채팅 사진 업로드 (추가 전용)
-- Supabase Dashboard → SQL Editor 에서 실행. idempotent.
--
-- 구성: 1) messages.image_url 컬럼  2) chat-images 스토리지 버킷
--       3) 스토리지 RLS 정책  4) 알림 트리거 사진 대응
-- ============================================================

-- 1) 메시지 이미지 URL 컬럼 ------------------------------------
alter table public.messages
  add column if not exists image_url text;

-- 2) 스토리지 버킷 (공개 읽기) ---------------------------------
insert into storage.buckets (id, name, public)
values ('chat-images', 'chat-images', true)
on conflict (id) do update set public = true;

-- 3) 스토리지 RLS 정책 ----------------------------------------
-- 읽기: 공개 (채팅 이미지 URL 직접 접근). 쓰기: 인증 사용자만 chat-images 에.
drop policy if exists "chat_images_public_read" on storage.objects;
create policy "chat_images_public_read"
  on storage.objects for select
  using (bucket_id = 'chat-images');

drop policy if exists "chat_images_authenticated_insert" on storage.objects;
create policy "chat_images_authenticated_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'chat-images');

-- 4) 알림 트리거 — 사진 메시지면 본문을 "사진을 보냈어요" 로 -----
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
  select case when m.user_a = new.sender_id then m.user_b else m.user_a end
    into v_recipient
  from public.matches m
  where m.id = new.match_id;

  if v_recipient is null then
    return new;
  end if;

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
    case
      when coalesce(new.content, '') = '' then '사진을 보냈어요'
      else left(new.content, 50)
    end,
    '/chat/' || new.match_id
  );

  return new;
end;
$$;

-- 트리거는 기존 messages_notify 재사용 (함수만 교체됨).
</content>
