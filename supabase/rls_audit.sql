-- ============================================================
-- RLS 감사 + 권장 베이스라인 정책
-- 보안 감사 결과: profiles/matches/messages/user_songs 의 RLS 정책이
-- repo 에 정의돼 있지 않음 (notifications 만 migration.sql 에 존재).
-- 앱 보안이 전적으로 "보이지 않는" 라이브 RLS 에 의존 중.
--
-- ⚠️ 아래 1) 감사 쿼리는 읽기 전용 — SQL Editor 에서 먼저 돌려
--    실제 정책 상태를 확인하세요.
--    2) 권장 정책은 전부 주석 처리됨. 누락된 것만 골라 적용하세요.
--    이미 동작하는 정책을 통째로 덮어쓰지 마세요.
-- ============================================================

-- 1) 현재 RLS 상태 + 정책 목록 (읽기 전용) ----------------------
select c.relname as table_name,
       c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('profiles','matches','messages','user_songs','notifications')
order by c.relname;

select schemaname, tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('profiles','matches','messages','user_songs','notifications')
order by tablename, cmd;

-- ============================================================
-- 2) 권장 베이스라인 (누락 시에만 적용 — 주석 해제)
--    핵심: 각 테이블 RLS 활성 + 본인/참여자만 접근.
-- ============================================================

-- ---- profiles ----
-- alter table public.profiles enable row level security;
-- create policy "profiles_select_all_authenticated" on public.profiles
--   for select to authenticated using (true);  -- 탐색에서 승인회원 노출 필요. 더 좁히려면 is_approved 조건.
-- create policy "profiles_modify_own" on public.profiles
--   for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- 주의: is_approved 자가변경은 guard_approval_change 트리거가 별도로 차단.

-- ---- user_songs ----
-- alter table public.user_songs enable row level security;
-- create policy "user_songs_select_all" on public.user_songs
--   for select to authenticated using (true);  -- 매칭 로직이 곡 비교에 필요. 민감정보 아님.
-- create policy "user_songs_modify_own" on public.user_songs
--   for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---- matches ----
-- alter table public.matches enable row level security;
-- create policy "matches_select_participant" on public.matches
--   for select to authenticated using (auth.uid() = user_a or auth.uid() = user_b);
-- INSERT/UPDATE 는 find_or_create_match / end_match (SECURITY DEFINER) 로만.
-- 직접 INSERT/UPDATE 정책은 만들지 말 것 (RPC 우회 방지).

-- ---- messages (가장 중요) ----
-- alter table public.messages enable row level security;
-- create policy "messages_select_participant" on public.messages
--   for select to authenticated using (
--     exists (select 1 from public.matches m
--             where m.id = messages.match_id
--               and (m.user_a = auth.uid() or m.user_b = auth.uid())));
-- create policy "messages_insert_participant_active" on public.messages
--   for insert to authenticated with check (
--     sender_id = auth.uid()
--     and exists (select 1 from public.matches m
--                 where m.id = match_id
--                   and m.status = 'active'
--                   and (m.user_a = auth.uid() or m.user_b = auth.uid())));
-- create policy "messages_update_read_participant" on public.messages
--   for update to authenticated using (
--     exists (select 1 from public.matches m
--             where m.id = messages.match_id
--               and (m.user_a = auth.uid() or m.user_b = auth.uid())));
--   -- read_at 갱신용. (sender 가 아닌 쪽이 읽음 처리)

-- ---- 검증 후 재실행하여 rls_enabled = true 확인 ----
</content>
