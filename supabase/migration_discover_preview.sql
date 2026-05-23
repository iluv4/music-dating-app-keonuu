-- ============================================================
-- 게스트(비로그인) 둘러보기 미리보기 RPC (추가 전용, idempotent)
-- 비로그인 방문자에게 회원 "활동감"만 보여주기 위한 익명화 미리보기.
-- 이름·학교·user_id 등 식별 정보는 절대 반환하지 않음 (PII 보호).
-- 성별 + 선택 곡 수만 반환. anon 역할에 실행 권한 부여.
-- Supabase Dashboard → SQL Editor 에서 실행.
-- ============================================================

create or replace function public.list_discover_preview()
returns table (
  gender     text,
  song_count bigint
)
language sql
security definer
set search_path = public
as $$
  select p.gender::text, count(us.id) as song_count
  from public.profiles p
  left join public.user_songs us on us.user_id = p.user_id
  where p.is_approved
  group by p.user_id, p.gender
  order by random()
  limit 12;
$$;

grant execute on function public.list_discover_preview() to anon, authenticated;
