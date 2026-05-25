-- ============================================================
-- 재매칭(find_additional_match) 동시성 안전화 (SQL Editor 에서 실행)
-- find_or_create_match 와 동일한 경합이 재매칭에도 존재:
--   사용자가 "한 명 더 만나기"를 빠르게 두 번/두 탭에서 호출하면
--   같은 후보를 두 번 골라 같은 쌍(A,C)에 active 매칭 row 가 2개 생성될 수 있음.
-- (서로 다른 후보를 고르는 다중 매칭은 정상 동작이므로 그대로 둔다.)
-- 해결:
--   1) find_or_create_match 와 같은 advisory lock 키로 매칭 생성 구간 직렬화
--      → 락 획득 후엔 직전 호출이 만든 매칭이 보이므로 not exists 가 같은 후보를 거른다
--   2) matches_active_pair_uniq 부분 유니크 인덱스 충돌 시 예외 대신
--      on conflict do nothing 으로 graceful 처리 + 기존 매칭 재조회 반환
-- 선행: migration_match_concurrency.sql 의 matches_active_pair_uniq 인덱스가 이미 있어야 함.
-- ============================================================

create or replace function public.find_additional_match(p_user_id uuid)
returns uuid language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_me public.profiles%rowtype; v_candidate uuid; v_match_id uuid; v_a uuid; v_b uuid;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then raise exception 'unauthorized'; end if;
  select * into v_me from public.profiles where user_id = p_user_id;
  if not found or not coalesce(v_me.is_approved, false) then raise exception 'not approved'; end if;

  -- 동시 매칭 직렬화 (find_or_create_match 와 동일 키)
  perform pg_advisory_xact_lock(hashtext('match_creation'));

  -- (조기 return 없음) 항상 새 후보를 찾는다 — 이미 매칭된 사람은 not exists로 제외됨
  select p.user_id into v_candidate from public.profiles p
  where p.is_approved and p.user_id <> p_user_id
    and (v_me.gender is null or p.gender is null or p.gender <> v_me.gender)
    and (v_me.major is null or p.major is null or lower(btrim(p.major)) <> lower(btrim(v_me.major)))
    and (v_me.club is null or p.club is null or lower(btrim(p.club)) <> lower(btrim(v_me.club)))
    and exists (select 1 from public.user_songs a join public.user_songs b on a.song_no = b.song_no
      where a.user_id = p_user_id and b.user_id = p.user_id)
    and not exists (select 1 from public.matches m
      where (m.user_a = p_user_id and m.user_b = p.user_id) or (m.user_a = p.user_id and m.user_b = p_user_id))
  order by random() limit 1;
  if v_candidate is null then return null; end if;
  if p_user_id < v_candidate then v_a := p_user_id; v_b := v_candidate; else v_a := v_candidate; v_b := p_user_id; end if;

  insert into public.matches (user_a, user_b, status) values (v_a, v_b, 'active')
  on conflict (least(user_a, user_b), greatest(user_a, user_b)) where status = 'active'
  do nothing
  returning id into v_match_id;

  -- 충돌(동시 경합으로 같은 쌍이 이미 생성됨) → 기존 매칭 반환, 알림 중복 생성 안 함
  if v_match_id is null then
    select id into v_match_id from public.matches
    where status = 'active' and user_a = v_a and user_b = v_b limit 1;
    return v_match_id;
  end if;

  insert into public.notifications (user_id, type, title, body, link) values
    (p_user_id, 'match', '새 매칭이 성사됐어요!', '음악 취향이 통하는 상대와 매칭됐어요.', '/chat/' || v_match_id),
    (v_candidate, 'match', '새 매칭이 성사됐어요!', '음악 취향이 통하는 상대와 매칭됐어요.', '/chat/' || v_match_id);
  return v_match_id;
end;
$function$;

grant execute on function public.find_additional_match(uuid) to authenticated;
