-- ============================================================
-- 채팅 고급 기능: 메시지 수정 / 삭제 / 펑(읽으면 소멸) / 한 번만 보기 사진
-- Supabase Dashboard → SQL Editor 에서 실행. idempotent (재실행 안전).
--
-- 구성: 1) messages 컬럼 추가  2) 발신자 수정/삭제 UPDATE 정책
--       3) realtime UPDATE 전파용 replica identity
-- ============================================================

-- 1) 메시지 상태 컬럼 -----------------------------------------
--   edited_at  : 수정 시각 (null = 미수정)
--   deleted_at : 삭제/소멸 시각 (null = 살아있음). soft delete → 양쪽에 "사라진 메시지" 표시
--   view_once  : 한 번만 볼 수 있는 사진 여부
--   viewed_at  : 수신자가 열람한 시각 (view_once / 펑 추적)
--   disappear  : 펑 메시지 (수신자가 읽으면 자동 소멸)
alter table public.messages
  add column if not exists edited_at  timestamptz,
  add column if not exists deleted_at timestamptz,
  add column if not exists view_once  boolean not null default false,
  add column if not exists viewed_at  timestamptz,
  add column if not exists disappear  boolean not null default false;

-- 2) 발신자가 본인 메시지를 수정/삭제할 수 있는 UPDATE 정책 ----
--   기존 정책("Users update read_at on received messages")은 *수신자*의
--   read_at·viewed_at·deleted_at(펑 소멸) 갱신을 담당 → 그대로 두고,
--   *발신자*가 본인 메시지를 고치고 지울 수 있도록 별도 정책을 추가.
drop policy if exists "Users edit own messages" on public.messages;
create policy "Users edit own messages"
  on public.messages for update
  to authenticated
  using (
    (sender_id = (select auth.uid()))
    and exists (
      select 1 from public.matches m
      where m.id = messages.match_id
        and ((m.user_a = (select auth.uid())) or (m.user_b = (select auth.uid())))
    )
  )
  with check (sender_id = (select auth.uid()));

-- 3) realtime UPDATE 페이로드에 전체 new row 가 실리도록 ---------
--   수정/삭제/열람 상태 변경을 상대 클라이언트에 실시간 전파하기 위함.
alter table public.messages replica identity full;
