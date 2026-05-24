-- ============================================================
-- 동아리(club) — 지인 거르기. ⚠️ Supabase MCP 연결 복구 후 적용 필요.
-- 1) profiles.club 컬럼
-- 2) find_or_create_match 에 같은 동아리 제외 추가
-- ============================================================

-- 1) 컬럼
alter table public.profiles add column if not exists club text;

-- 2) 매칭에서 같은 전공 + 같은 동아리 제외 (find_or_create_match 후보 조건)
--    아래 조건을 후보 WHERE 에 추가:
--    and (v_me.club is null or p.club is null
--         or lower(btrim(p.club)) <> lower(btrim(v_me.club)))
--    (전공 제외 조건은 이미 적용됨. 전체 함수는 기존 정의에 이 한 줄만 추가)
create or replace function public.find_or_create_match(p_user_id uuid)
returns uuid language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_me public.profiles%rowtype; v_candidate uuid; v_match_id uuid; v_a uuid; v_b uuid;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then raise exception 'unauthorized'; end if;
  select * into v_me from public.profiles where user_id = p_user_id;
  if not found or not coalesce(v_me.is_approved, false) then raise exception 'not approved'; end if;

  select id into v_match_id from public.matches
  where status = 'active' and (user_a = p_user_id or user_b = p_user_id) limit 1;
  if v_match_id is not null then return v_match_id; end if;

  select p.user_id into v_candidate
  from public.profiles p
  where p.is_approved
    and p.user_id <> p_user_id
    and (v_me.gender is null or p.gender is null or p.gender <> v_me.gender)
    -- 같은 전공 제외
    and (v_me.major is null or p.major is null
         or lower(btrim(p.major)) <> lower(btrim(v_me.major)))
    -- 같은 동아리 제외 (지인 거르기)
    and (v_me.club is null or p.club is null
         or lower(btrim(p.club)) <> lower(btrim(v_me.club)))
    and exists (select 1 from public.user_songs a
      join public.user_songs b on a.song_no = b.song_no
      where a.user_id = p_user_id and b.user_id = p.user_id)
    and not exists (select 1 from public.matches m
      where (m.user_a = p_user_id and m.user_b = p.user_id)
         or (m.user_a = p.user_id and m.user_b = p_user_id))
  order by random() limit 1;

  if v_candidate is null then return null; end if;
  if p_user_id < v_candidate then v_a := p_user_id; v_b := v_candidate;
  else v_a := v_candidate; v_b := p_user_id; end if;

  insert into public.matches (user_a, user_b, status) values (v_a, v_b, 'active')
  returning id into v_match_id;
  insert into public.notifications (user_id, type, title, body, link) values
    (p_user_id,   'match', '새 매칭이 성사됐어요!', '음악 취향이 통하는 상대와 매칭됐어요.', '/chat/' || v_match_id),
    (v_candidate, 'match', '새 매칭이 성사됐어요!', '음악 취향이 통하는 상대와 매칭됐어요.', '/chat/' || v_match_id);
  return v_match_id;
end;
$function$;