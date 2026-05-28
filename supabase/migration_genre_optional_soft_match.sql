-- ============================================================
-- 장르 선택 선택사항화 — 음악(장르/곡) 조건을 하드 필터에서 소프트 우선순위로 전환
-- 배경:
--  - 직전 버전(migration_music_overlap_fallback)은 "장르 겹침 OR 곡 겹침,
--    또는 한쪽이라도 음악 데이터가 비면 허용"을 하드 필터로 요구했다.
--  - 이 경우 장르를 건너뛰고 곡만 등록한 사용자는 '곡이 정확히 겹치는 상대'가
--    없으면 후보 풀에서 빠져 매칭이 사실상 안 되는 사각지대가 남았다.
-- 정책 변경:
--  - 음악 겹침을 후보 자격(WHERE)에서 완전히 제거 → 장르/곡은 더 이상 매칭 필수 조건 아님.
--  - 대신 ORDER BY 1순위로 유지: 장르 또는 곡이 겹치는 상대를 항상 우선 배치해
--    "음악으로 만나는" 컨셉은 보존(있으면 우선, 없어도 매칭).
--  - 성별/학교/전공·동아리/캠퍼스 선호/기존 매칭 제외 등 나머지 하드 필터는 그대로.
-- 적용 대상: find_or_create_match, request_additional_match 둘 다 동일.
-- ⚠️ Supabase SQL Editor / MCP 로 적용.
-- ============================================================

-- find_or_create_match (즉시 active 매칭, advisory lock 유지)
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

  select id into v_match_id from public.matches
  where status = 'active' and (user_a = p_user_id or user_b = p_user_id) limit 1;
  if v_match_id is not null then return v_match_id; end if;

  select p.user_id into v_candidate
  from public.profiles p
  where p.is_approved
    and p.user_id <> p_user_id
    and (v_me.gender is null or p.gender is null or p.gender <> v_me.gender)
    -- 같은 학교면 같은 전공/동아리 제외 (타학교는 제한 없음)
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
    -- 캠퍼스 선호 양방향 (같은 학교 안에서만 적용)
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
    -- 음악(장르/곡)은 하드 필터에서 제외 — 후보 자격 아님(정렬 우선순위로만 반영).
    and not exists (select 1 from public.matches m
      where (m.user_a = p_user_id and m.user_b = p.user_id)
         or (m.user_a = p.user_id and m.user_b = p_user_id))
  -- 음악 겹침 우선 → 타학교 우선 → 나이 근접 → 같은 지역 → 랜덤
  order by (case when (
                  (v_me.genres is not null and array_length(v_me.genres, 1) > 0
                   and p.genres is not null and v_me.genres && p.genres)
                  or exists (select 1 from public.user_songs a
                    join public.user_songs b on a.song_no = b.song_no
                    where a.user_id = p_user_id and b.user_id = p.user_id)
                ) then 0 else 1 end),
           (case when p.school is not null and v_me.school is not null
                  and btrim(p.school) = btrim(v_me.school) then 1 else 0 end),
           (case when v_me.birth_year is not null and p.birth_year is not null
                  then abs(p.birth_year - v_me.birth_year) else 9999 end),
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

-- request_additional_match (추가 매칭 — pending 으로만 생성)
create or replace function public.request_additional_match(p_user_id uuid)
returns uuid language plpgsql security definer set search_path to 'public'
as $function$
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
    -- 음악(장르/곡)은 하드 필터에서 제외 — 후보 자격 아님(정렬 우선순위로만 반영).
    and not exists (
      select 1 from public.matches m
      where (m.user_a = p_user_id and m.user_b = p.user_id)
         or (m.user_a = p.user_id and m.user_b = p_user_id)
    )
  order by (case when (
                  (v_me.genres is not null and array_length(v_me.genres, 1) > 0
                   and p.genres is not null and v_me.genres && p.genres)
                  or exists (select 1 from public.user_songs a
                    join public.user_songs b on a.song_no = b.song_no
                    where a.user_id = p_user_id and b.user_id = p.user_id)
                ) then 0 else 1 end),
           (case when p.school is not null and v_me.school is not null
                  and btrim(p.school) = btrim(v_me.school) then 1 else 0 end),
           (case when v_me.birth_year is not null and p.birth_year is not null
                  then abs(p.birth_year - v_me.birth_year) else 9999 end),
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
$function$;

revoke all on function public.request_additional_match(uuid) from anon;
grant execute on function public.request_additional_match(uuid) to authenticated;
