-- "한 명 더 만나기"(request_additional_match)를 최초 매칭(find_or_create_match)과 동일한
-- 소프트 매칭으로 정렬한다.
--
-- 배경: migration_genre_optional_soft_match.sql 에서 find_or_create_match 만 음악 필수 조건을
-- 풀었고, request_additional_match 는 옛 버전(같은 곡 1곡 이상 필수)이 그대로 운영에 남아 있었다.
-- 그 결과 승인 회원 대부분이 "한 명 더 만나기"에서 후보 없음(NULL)을 받아 매칭이 막혔다.
--
-- 변경: 음악(곡/장르) 겹침은 '필수'가 아니라 ORDER BY 1순위(우선 배치)로만 반영한다.
-- 하드 필터는 최초 매칭과 동일(승인/이성/같은학교 전공·동아리 제외/캠퍼스 선호/기존 매칭 제외).
-- 매칭은 기존과 동일하게 즉시 active 로 성사하고 양쪽에 알림을 발송한다(대기/승인 단계 없음).
create or replace function public.request_additional_match(p_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
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

  perform pg_advisory_xact_lock(hashtext('match_creation'));

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
    and not exists (select 1 from public.matches m
      where (m.user_a = p_user_id and m.user_b = p.user_id)
         or (m.user_a = p.user_id and m.user_b = p_user_id))
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
  values (v_a, v_b, 'active')
  returning id into v_match_id;

  insert into public.notifications (user_id, type, title, body, link)
  values
    (v_a, 'match', '새 매칭이 성사됐어요!', '음악 취향이 통하는 상대와 매칭됐어요.', '/chat/' || v_match_id),
    (v_b, 'match', '새 매칭이 성사됐어요!', '음악 취향이 통하는 상대와 매칭됐어요.', '/chat/' || v_match_id);

  return v_match_id;
end;
$function$;
