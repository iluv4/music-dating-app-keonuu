-- ============================================================
-- 크로스 대학 매칭 (SQL Editor 또는 MCP 로 실행, idempotent)
--
-- 변경: 기존 "같은 대학(school)끼리만" 매칭 경계를 제거 → 다른 대학 학생과도 매칭.
--   - 학교는 하드 필터 없음(전체 허용)이되, 다른 학교를 우선 매칭(soft) → 같은 학교는 후순위 폴백.
--     (겹지인 회피가 목적. 풀이 부족하면 같은 학교 안에서도 매칭됨)
--   - 같은 학교일 때만 같은 전공/동아리(지인) 제외 — 다른 학교면 겹쳐도 매칭 허용.
--   - 캠퍼스 선호(match_campus_pref)도 같은 학교(캠퍼스가 나뉜 대학) 안에서만 적용.
--   - 성별/노래 취향 겹침/기존 매칭 없음/거주지역 우선(soft)은 그대로 유지.
-- find_or_create_match, request_additional_match 두 RPC 를 재정의한다.
-- ============================================================

-- 1) 첫 매칭: find_or_create_match ----------------------------
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

  -- 동시 매칭 직렬화.
  perform pg_advisory_xact_lock(hashtext('match_creation'));

  -- 락 후 재확인.
  select id into v_match_id from public.matches
  where status = 'active' and (user_a = p_user_id or user_b = p_user_id) limit 1;
  if v_match_id is not null then return v_match_id; end if;

  select p.user_id into v_candidate
  from public.profiles p
  where p.is_approved
    and p.user_id <> p_user_id
    and (v_me.gender is null or p.gender is null or p.gender <> v_me.gender)
    -- 같은 학교일 때만 같은 전공/동아리(지인) 제외. 다른 학교면 전공·동아리 겹쳐도 매칭 허용.
    and (
      not (p.school is not null and v_me.school is not null
           and btrim(p.school) = btrim(v_me.school))
      or (
        (v_me.major is null or p.major is null
           or lower(btrim(p.major)) <> lower(btrim(v_me.major)))
        and (v_me.club is null or p.club is null
           or lower(btrim(p.club)) <> lower(btrim(v_me.club)))
      )
    )
    -- 캠퍼스 선호(양방향)도 같은 학교 안에서만 적용. 다른 학교면 무시.
    and (
      not (p.school is not null and v_me.school is not null
           and btrim(p.school) = btrim(v_me.school))
      or (
        (coalesce(v_me.match_campus_pref, '상관없음') = '상관없음'
           or p.campus is null or v_me.match_campus_pref = p.campus)
        and (coalesce(p.match_campus_pref, '상관없음') = '상관없음'
           or v_me.campus is null or p.match_campus_pref = v_me.campus)
      )
    )
    and exists (select 1 from public.user_songs a
      join public.user_songs b on a.song_no = b.song_no
      where a.user_id = p_user_id and b.user_id = p.user_id)
    and not exists (select 1 from public.matches m
      where (m.user_a = p_user_id and m.user_b = p.user_id)
         or (m.user_a = p.user_id and m.user_b = p_user_id))
  -- 다른 학교 우선(겹지인 회피) → 같은 거주지역 우선 → 랜덤. 같은 학교는 후순위 폴백.
  order by (case when p.school is not null and v_me.school is not null
                  and btrim(p.school) = btrim(v_me.school) then 1 else 0 end),
           (case when v_me.region is not null and p.region is not null
                  and btrim(p.region) = btrim(v_me.region) then 0 else 1 end),
           random()
  limit 1;

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

-- 2) 추가 매칭 요청: request_additional_match -----------------
create or replace function public.request_additional_match(p_user_id uuid)
returns uuid language plpgsql security definer set search_path = public
as $$
declare
  v_me public.profiles%rowtype; v_candidate uuid; v_match_id uuid; v_a uuid; v_b uuid;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'unauthorized';
  end if;

  select * into v_me from public.profiles where user_id = p_user_id;
  if not found or not coalesce(v_me.is_approved, false) then
    raise exception 'not approved';
  end if;

  -- 이미 대기 중인 추가 매칭 요청이 있으면 그대로 반환
  select id into v_match_id
  from public.matches
  where status = 'pending' and (user_a = p_user_id or user_b = p_user_id)
  limit 1;
  if v_match_id is not null then
    return v_match_id;
  end if;

  select p.user_id into v_candidate
  from public.profiles p
  where p.is_approved
    and p.user_id <> p_user_id
    and (v_me.gender is null or p.gender is null or p.gender <> v_me.gender)
    -- 같은 학교일 때만 같은 전공/동아리(지인) 제외. 다른 학교면 겹쳐도 허용.
    and (
      not (p.school is not null and v_me.school is not null
           and btrim(p.school) = btrim(v_me.school))
      or (
        (v_me.major is null or p.major is null
           or lower(btrim(p.major)) <> lower(btrim(v_me.major)))
        and (v_me.club is null or p.club is null
           or lower(btrim(p.club)) <> lower(btrim(v_me.club)))
      )
    )
    -- 캠퍼스 선호도 같은 학교 안에서만 적용.
    and (
      not (p.school is not null and v_me.school is not null
           and btrim(p.school) = btrim(v_me.school))
      or (
        (coalesce(v_me.match_campus_pref, '상관없음') = '상관없음'
           or p.campus is null or v_me.match_campus_pref = p.campus)
        and (coalesce(p.match_campus_pref, '상관없음') = '상관없음'
           or v_me.campus is null or p.match_campus_pref = v_me.campus)
      )
    )
    and exists (
      select 1 from public.user_songs a
      join public.user_songs b on a.song_no = b.song_no
      where a.user_id = p_user_id and b.user_id = p.user_id
    )
    and not exists (
      select 1 from public.matches m
      where (m.user_a = p_user_id and m.user_b = p.user_id)
         or (m.user_a = p.user_id and m.user_b = p_user_id)
    )
  -- 다른 학교 우선(겹지인 회피) → 같은 거주지역 우선 → 랜덤. 같은 학교는 후순위 폴백.
  order by (case when p.school is not null and v_me.school is not null
                  and btrim(p.school) = btrim(v_me.school) then 1 else 0 end),
           (case when v_me.region is not null and p.region is not null
                  and btrim(p.region) = btrim(v_me.region) then 0 else 1 end),
           random()
  limit 1;

  if v_candidate is null then
    return null;
  end if;

  if p_user_id < v_candidate then
    v_a := p_user_id; v_b := v_candidate;
  else
    v_a := v_candidate; v_b := p_user_id;
  end if;

  insert into public.matches (user_a, user_b, status)
  values (v_a, v_b, 'pending')
  returning id into v_match_id;

  insert into public.notifications (user_id, type, title, body, link)
  values (p_user_id, 'system', '매칭 대기 중이에요',
          '운영팀이 확인한 뒤 매칭을 연결해드릴게요. 조금만 기다려주세요.', '/chat');

  return v_match_id;
end;
$$;

revoke all on function public.request_additional_match(uuid) from anon;
grant execute on function public.request_additional_match(uuid) to authenticated;
