-- ============================================================
-- 함수 보안 강화 (Supabase advisor 대응) — DB 에 이미 적용됨
-- 1) SECURITY DEFINER 함수 search_path 고정 (주입 방지)
-- 2) 트리거 전용 함수 RPC 직접 호출 차단 (anon/authenticated 회수)
-- 3) 앱 RPC 에서 anon 실행권한 회수 (authenticated 만 유지)
-- ============================================================

-- 1) search_path 고정
alter function public.set_approved_at() set search_path = public;
alter function public.check_user_song_limit() set search_path = public;
alter function public.set_match_ended_at() set search_path = public;
alter function public.end_match(uuid) set search_path = public;
alter function public.revoke_approval_on_match() set search_path = public;
alter function public.guard_approval_change() set search_path = public;

-- 2) 트리거 전용 함수 — 직접 호출 차단 (트리거는 소유자 권한으로 계속 동작)
revoke execute on function public.set_approved_at() from public, anon, authenticated;
revoke execute on function public.check_user_song_limit() from public, anon, authenticated;
revoke execute on function public.set_match_ended_at() from public, anon, authenticated;
revoke execute on function public.revoke_approval_on_match() from public, anon, authenticated;
revoke execute on function public.guard_approval_change() from public, anon, authenticated;
revoke execute on function public.notify_on_message() from public, anon, authenticated;

-- 3) 앱 RPC — anon 회수, authenticated 유지
revoke execute on function public.end_match(uuid) from public, anon;
grant  execute on function public.end_match(uuid) to authenticated;
revoke execute on function public.find_or_create_match(uuid) from public, anon;
grant  execute on function public.find_or_create_match(uuid) to authenticated;
revoke execute on function public.get_member_detail(uuid) from public, anon;
grant  execute on function public.get_member_detail(uuid) to authenticated;
revoke execute on function public.list_discover_members(uuid) from public, anon;
grant  execute on function public.list_discover_members(uuid) to authenticated;

-- list_discover_preview() 는 비로그인 둘러보기용 → anon 유지 (의도된 노출)
-- signup_attempts: RLS enabled + 정책 없음 = service_role 전용 (의도됨)
-- 참고(대시보드 수동): Auth → Leaked Password Protection 활성화 권장
</content>
