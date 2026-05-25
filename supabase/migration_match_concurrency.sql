-- ============================================================
-- 매칭 동시성 안전화 (SQL Editor 에서 실행)
-- 문제: find_or_create_match 가 잠금 없이 "후보 SELECT → matches INSERT" 를 수행해
--       여러 사용자가 동시에 매칭을 누르면 경합이 발생.
--   (a) 한 사용자가 빠르게 두 번 누르거나 두 탭에서 동시 호출 → 자기 자신이 매칭 2개에 들어감
--   (b) A·B 가 서로를 동시에 후보로 선택 → 같은 쌍(A,B)에 active 매칭 row 가 2개 생성
-- 해결:
--   1) 트랜잭션 advisory lock 으로 매칭 생성 구간을 직렬화
--   2) 락 획득 후 자기 active 매칭을 "재확인"(대기 중 다른 호출이 나를 매칭시켰을 수 있음)
--   3) status='active' 부분 유니크 인덱스로 같은 쌍의 동시 active 2행을 DB 레벨에서 차단
-- 후보 선정 조건(성별/전공/동아리/곡 겹침/다중 매칭 허용)은 그대로 — 기존 정책 유지.
-- ============================================================

-- 1) 백스톱: 같은 쌍에 active 매칭이 둘 이상 생기지 못하게 한다.
--    (user_a < user_b 로 정규화해서 insert 하지만, 정렬 무관하게 안전하도록 least/greatest 사용)
--    부분 인덱스(status='active')라 매칭 종료 후 재매칭은 막지 않음.
--    ⚠️ 이미 중복 active 쌍이 있으면 인덱스 생성이 실패함 → 그 경우 먼저 중복 정리 필요.
create unique index if not exists matches_active_pair_uniq
  on public.matches (least(user_a, user_b), greatest(user_a, user_b))
  where status = 'active';

-- 2) find_or_create_match 재정의 (advisory lock + 락 후 재확인 추가)
create or replace function public.find_or_create_match(p_user_id uuid)
returns uuid language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_me public.profiles%rowtype; v_candidate uuid; v_match_id uuid; v_a uuid; v_b uuid;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then raise exception 'unauthorized'; end if;
  select * into v_me from public.profiles where user_id = p_user_id;
  if not found or not coalesce(v_me.is_approved, false) then raise exception 'not approved'; end if;

  -- 빠른 경로: 이미 active 매칭이 있으면 잠금 없이 즉시 반환(멱등).
  select id into v_match_id from public.matches
  where status = 'active' and (user_a = p_user_id or user_b = p_user_id) limit 1;
  if v_match_id is not null then return v_match_id; end if;

  -- 동시 매칭 직렬화: 매칭 생성 구간을 트랜잭션 advisory lock 으로 보호.
  -- find_additional_match 와 같은 키를 써서 두 함수가 서로에 대해서도 직렬화되도록 한다.
  perform pg_advisory_xact_lock(hashtext('match_creation'));

  -- 락 획득 후 재확인: 대기하는 동안 다른 호출(또는 상대의 동시 매칭)이 나를 이미 매칭시켰을 수 있음.
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

grant execute on function public.find_or_create_match(uuid) to authenticated;

-- 3) find_additional_match (재매칭/다중 매칭) 도 같은 보호가 필요하다.
--    ⚠️ 이 함수 본문은 레포에 없고 SQL Editor 에서 직접 적용됨 → 아래 두 가지를 반영해 재배포할 것:
--      (1) 매칭 생성 직전에  perform pg_advisory_xact_lock(hashtext('match_creation'));  추가
--      (2) matches INSERT 를  insert ... on conflict do nothing returning id into v_match_id;
--          형태로 바꿔 부분 유니크 인덱스 충돌 시 예외 대신 안전하게 처리(충돌이면 기존 매칭 재조회).
--    위 (1)(2)는 find_additional_match 가 같은 쌍을 동시 생성하는 경합을 막는다.
