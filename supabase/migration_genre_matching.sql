-- ============================================================
-- 장르 매칭 — 같은 '곡'이 아니라 같은 '장르'가 겹치면 매칭.
-- 부스가 많아 사람이 분산되는 상황에서 동일 곡 기준은 너무 빡빡한 피드백 반영.
-- 1) profiles.genres 컬럼 (사용자가 고른 장르 id 배열)
-- 2) find_or_create_match / request_additional_match 후보 조건을
--    "장르 겹침 OR 곡 겹침" 으로 완화 (장르 미설정 기존 사용자는 곡 겹침으로 폴백)
-- ⚠️ Supabase SQL Editor 에서 실행.
-- ============================================================

-- 1) 컬럼 + 조회 인덱스
alter table public.profiles add column if not exists genres text[];
create index if not exists profiles_genres_gin on public.profiles using gin (genres);

-- 2) find_or_create_match (즉시 active 매칭)
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
    -- 장르 겹침 OR 곡 겹침 (장르 미설정 사용자는 곡 겹침으로 폴백)
    and (
      (v_me.genres is not null and array_length(v_me.genres, 1) > 0
       and p.genres is not null and v_me.genres && p.genres)
      or exists (select 1 from public.user_songs a
        join public.user_songs b on a.song_no = b.song_no
        where a.user_id = p_user_id and b.user_id = p.user_id)
    )
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

-- 3) request_additional_match (추가 매칭 — pending 으로만 생성)
create or replace function public.request_additional_match(p_user_id uuid)
returns uuid language plpgsql security definer set search_path = public
as $$
declare
  v_me        public.profiles%rowtype;
  v_candidate uuid;
  v_match_id  uuid;
  v_a uuid;
  v_b uuid;
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

  -- 후보: 승인 + 이성 + 같은 전공/동아리 제외 + (장르 겹침 OR 곡 겹침) + 기존 매칭 없음
  select p.user_id into v_candidate
  from public.profiles p
  where p.is_approved
    and p.user_id <> p_user_id
    and (v_me.gender is null or p.gender is null or p.gender <> v_me.gender)
    and (v_me.major is null or p.major is null
         or lower(btrim(p.major)) <> lower(btrim(v_me.major)))
    and (v_me.club is null or p.club is null
         or lower(btrim(p.club)) <> lower(btrim(v_me.club)))
    and (
      (v_me.genres is not null and array_length(v_me.genres, 1) > 0
       and p.genres is not null and v_me.genres && p.genres)
      or exists (
        select 1
        from public.user_songs a
        join public.user_songs b on a.song_no = b.song_no
        where a.user_id = p_user_id and b.user_id = p.user_id
      )
    )
    and not exists (
      select 1 from public.matches m
      where (m.user_a = p_user_id and m.user_b = p.user_id)
         or (m.user_a = p.user_id and m.user_b = p_user_id)
    )
  order by random()
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
