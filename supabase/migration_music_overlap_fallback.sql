-- ============================================================
-- 매칭 음악조건 폴백 — 장르/곡 데이터 없는 사용자도 매칭 허용
-- 배경:
--  - 기존 로직은 "장르 겹침 OR 곡 겹침"을 하드 필터로 요구했다.
--  - 장르·곡을 아직 등록하지 않은 사용자는 어떤 상대와도 겹침이 성립하지 않아
--    후보 풀에서 영구히 제외 → 매칭이 전혀 성사되지 않는 문제.
-- 정책 변경:
--  - 한쪽이라도 음악 데이터(장르 배열 + user_songs)가 모두 비어 있으면
--    겹침을 비교할 수 없으므로 후보로 허용(폴백).
--  - 단, 실제로 음악이 겹치는 상대는 정렬 1순위로 올려 "음악으로 만나는" 컨셉 유지.
-- 적용 대상: find_or_create_match, request_additional_match 둘 다 동일하게.
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
    -- 음악: 장르 겹침 OR 곡 겹침, 또는 한쪽이라도 음악 데이터가 비어 비교 불가 시 허용(폴백)
    and (
      (v_me.genres is not null and array_length(v_me.genres, 1) > 0
       and p.genres is not null and v_me.genres && p.genres)
      or exists (select 1 from public.user_songs a
        join public.user_songs b on a.song_no = b.song_no
        where a.user_id = p_user_id and b.user_id = p.user_id)
      or (
        (v_me.genres is null or array_length(v_me.genres, 1) is null)
        and not exists (select 1 from public.user_songs a where a.user_id = p_user_id)
      )
      or (
        (p.genres is null or array_length(p.genres, 1) is null)
        and not exists (select 1 from public.user_songs b where b.user_id = p.user_id)
      )
    )
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
    -- 음악: 장르 겹침 OR 곡 겹침, 또는 한쪽이라도 음악 데이터가 비어 비교 불가 시 허용(폴백)
    and (
      (v_me.genres is not null and array_length(v_me.genres, 1) > 0
       and p.genres is not null and v_me.genres && p.genres)
      or exists (
        select 1 from public.user_songs a
        join public.user_songs b on a.song_no = b.song_no
        where a.user_id = p_user_id and b.user_id = p.user_id
      )
      or (
        (v_me.genres is null or array_length(v_me.genres, 1) is null)
        and not exists (select 1 from public.user_songs a where a.user_id = p_user_id)
      )
      or (
        (p.genres is null or array_length(p.genres, 1) is null)
        and not exists (select 1 from public.user_songs b where b.user_id = p.user_id)
      )
    )
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
