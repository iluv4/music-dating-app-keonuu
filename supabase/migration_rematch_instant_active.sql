-- ============================================================
-- 관리자 승인 제거(#92) 후속 정합화 (2026-06-11, MCP 로 prod 적용 완료 — 기록용)
--  request_additional_match 를 '즉시 active + 양쪽 알림'(#92)으로 전환하되,
--  #93(migration_rematch_widen_pool.sql)의 넓은 후보 풀 + 1인당 3매칭 상한 +
--  정렬 우선순위는 그대로 유지한다. (운영팀 confirm 단계 제거 — confirm_match 는 미사용으로 남음)
--  결제 셀프 승인 complete_payment 는 migration_remove_admin_approval.sql 로 기적용.
-- ============================================================
create or replace function public.request_additional_match(p_user_id uuid)
returns uuid language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_me public.profiles%rowtype; v_candidate uuid; v_match_id uuid; v_a uuid; v_b uuid;
  v_cap constant int := 3;  -- 1인당 동시 매칭 상한
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'unauthorized';
  end if;

  select * into v_me from public.profiles where user_id = p_user_id;
  if not found or not coalesce(v_me.is_approved, false) then
    raise exception 'not approved';
  end if;

  -- 요청자 본인 상한: 동시 매칭 3개면 더 못 만남
  if (select count(*) from public.matches m
        where (m.user_a = p_user_id or m.user_b = p_user_id)
          and m.status in ('active','pending')) >= v_cap then
    return null;
  end if;

  select p.user_id into v_candidate
  from public.profiles p
  where
    -- 후보 자격: 지금 승인 상태이거나, 한 번이라도 승인된 적 있는 회원
    (p.is_approved or p.approved_at is not null)
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
    -- 기존 매칭쌍 제외
    and not exists (
      select 1 from public.matches m
      where (m.user_a = p_user_id and m.user_b = p.user_id)
         or (m.user_a = p.user_id and m.user_b = p_user_id)
    )
    -- 후보 상한: 동시 매칭 3개 이상인 회원은 제외
    and (select count(*) from public.matches m
           where (m.user_a = p.user_id or m.user_b = p.user_id)
             and m.status in ('active','pending')) < v_cap
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

  -- 운영자 확인 단계 제거 — 즉시 active 로 성사
  insert into public.matches (user_a, user_b, status)
  values (v_a, v_b, 'active')
  returning id into v_match_id;

  -- 양쪽에 매칭 성사 알림
  insert into public.notifications (user_id, type, title, body, link)
  values
    (v_a, 'match', '새 매칭이 성사됐어요!', '음악 취향이 통하는 상대와 매칭됐어요.', '/chat/' || v_match_id),
    (v_b, 'match', '새 매칭이 성사됐어요!', '음악 취향이 통하는 상대와 매칭됐어요.', '/chat/' || v_match_id);

  return v_match_id;
end;
$function$;

revoke all on function public.request_additional_match(uuid) from anon;
grant execute on function public.request_additional_match(uuid) to authenticated;
