-- ============================================================
-- 학교/캠퍼스/거주지역 + 캠퍼스 기반 매칭 선호 (SQL Editor 또는 MCP 로 실행, idempotent)
--
-- 설계: 다른 대학(백석대·단국대 천안 등) 확장을 고려해 school(대학교명)·campus(캠퍼스)를 분리.
--   - school : "상명대학교" / "백석대학교" / "단국대학교" ...
--   - campus : "서울" / "천안" / ...  (단일캠 대학은 null)
-- 매칭 경계: 같은 대학(school)끼리만. 그 안에서 match_campus_pref 로 캠퍼스를 좁힌다(양방향).
-- 거주지역(region)은 같은 지역을 우선 노출(soft).
-- ============================================================

-- 1) 컬럼 추가 ------------------------------------------------
alter table public.profiles add column if not exists campus text;
alter table public.profiles add column if not exists region text;
alter table public.profiles add column if not exists match_campus_pref text;

-- 2) 기존 데이터 정규화 --------------------------------------
--    과거엔 school 에 "상명대학교 천안" 형태로 캠퍼스가 붙어 저장됨 → 분리.
update public.profiles
set campus = case
      when campus is not null and campus <> '' then campus
      when school ilike '%서울%' then '서울'
      when school ilike '%천안%' then '천안'
      else campus
    end
where school ilike '상명대%';

update public.profiles
set school = '상명대학교'
where school ilike '상명대%' and school <> '상명대학교';

update public.profiles
set match_campus_pref = coalesce(match_campus_pref, '상관없음');

-- 3) 첫 매칭: find_or_create_match (advisory lock 유지 + 학교/캠퍼스/지역 반영) ----
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
    -- 같은 전공 제외
    and (v_me.major is null or p.major is null
         or lower(btrim(p.major)) <> lower(btrim(v_me.major)))
    -- 같은 동아리 제외 (지인 거르기)
    and (v_me.club is null or p.club is null
         or lower(btrim(p.club)) <> lower(btrim(v_me.club)))
    -- 같은 대학교만 매칭 (다른 대학이 추가돼도 자기 학교 안에서만)
    and (v_me.school is null or p.school is null
         or btrim(p.school) = btrim(v_me.school))
    -- 캠퍼스 선호 양방향: 서로가 상대 캠퍼스를 원할 때만
    and (coalesce(v_me.match_campus_pref, '상관없음') = '상관없음'
         or p.campus is null or v_me.match_campus_pref = p.campus)
    and (coalesce(p.match_campus_pref, '상관없음') = '상관없음'
         or v_me.campus is null or p.match_campus_pref = v_me.campus)
    and exists (select 1 from public.user_songs a
      join public.user_songs b on a.song_no = b.song_no
      where a.user_id = p_user_id and b.user_id = p.user_id)
    and not exists (select 1 from public.matches m
      where (m.user_a = p_user_id and m.user_b = p.user_id)
         or (m.user_a = p.user_id and m.user_b = p_user_id))
  -- 같은 거주지역 우선
  order by (case when v_me.region is not null and p.region is not null
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

-- 4) 추가 매칭 요청: request_additional_match (같은 학교/캠퍼스/지역 반영) --------
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
    and (v_me.major is null or p.major is null
         or lower(btrim(p.major)) <> lower(btrim(v_me.major)))
    and (v_me.club is null or p.club is null
         or lower(btrim(p.club)) <> lower(btrim(v_me.club)))
    and (v_me.school is null or p.school is null
         or btrim(p.school) = btrim(v_me.school))
    and (coalesce(v_me.match_campus_pref, '상관없음') = '상관없음'
         or p.campus is null or v_me.match_campus_pref = p.campus)
    and (coalesce(p.match_campus_pref, '상관없음') = '상관없음'
         or v_me.campus is null or p.match_campus_pref = v_me.campus)
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
  order by (case when v_me.region is not null and p.region is not null
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

-- 5) 탐색 목록: 학교+캠퍼스 합본 라벨 반환 ---------------------
create or replace function public.list_discover_members(p_user_id uuid)
returns table (
  user_id    uuid,
  name       text,
  school     text,
  gender     text,
  song_count bigint
)
language sql security definer set search_path = public
as $$
  select p.user_id, p.name,
         (p.school || case when coalesce(p.campus, '') <> '' then ' ' || p.campus else '' end) as school,
         p.gender::text, count(us.id) as song_count
  from public.profiles p
  left join public.user_songs us on us.user_id = p.user_id
  where p.is_approved
    and p.user_id <> p_user_id
  group by p.user_id, p.name, p.school, p.campus, p.gender
  order by random()
  limit 20;
$$;

grant execute on function public.list_discover_members(uuid) to authenticated;

-- 6) 멤버 상세: 학교+캠퍼스 합본 라벨 반환 --------------------
create or replace function public.get_member_detail(p_user_id uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  v_me_approved boolean;
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'unauthorized';
  end if;

  select is_approved into v_me_approved
  from public.profiles where user_id = auth.uid();
  if not coalesce(v_me_approved, false) then
    raise exception 'not approved';
  end if;

  select jsonb_build_object(
    'user_id', p.user_id,
    'name', p.name,
    'school', p.school || case when coalesce(p.campus, '') <> '' then ' ' || p.campus else '' end,
    'gender', p.gender::text,
    'songs', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'songNo', us.song_no,
          'title', us.title,
          'artist', us.artist,
          'album', us.album,
          'albumImg', us.album_img
        ) order by us.selected_at
      )
      from public.user_songs us
      where us.user_id = p.user_id
    ), '[]'::jsonb)
  ) into v_result
  from public.profiles p
  where p.user_id = p_user_id and p.is_approved;

  if v_result is null then
    raise exception 'member not found';
  end if;
  return v_result;
end;
$$;

grant execute on function public.get_member_detail(uuid) to authenticated;
