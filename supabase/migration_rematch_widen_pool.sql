-- ============================================================
-- "한 명 더 만나기"(추가 매칭) 후보 풀 넓히기 + 1인당 매칭 3명 상한 명문화
-- 배경(증상):
--  - 추가 매칭(request_additional_match)을 눌러도 "지금은 매칭 가능한 상대가 없어요"가 자주 떴다.
--  - 원인: matches INSERT 시 revoke_approval_on_match 트리거가 양쪽 is_approved 를 false 로 내린다.
--    그런데 후보 검색은 p.is_approved = true 만 보므로, "이미 한 번 매칭된" 상대는
--    운영자가 다시 승인(is_approved=true)하기 전까지 후보 풀에서 통째로 빠진다.
--    성비 불균형(남>여)까지 겹쳐, 추가 매칭 시점에 승인된 여성이 없으면 곧장 '상대 없음'.
-- 정책(이 마이그레이션):
--  - request_additional_match 는 pending 으로만 생성되고 운영팀이 confirm 단계에서 최종 승인하므로,
--    후보 자격을 is_approved 한 순간 상태가 아니라 "한 번이라도 승인된 적 있는 회원"으로 넓힌다.
--    → (p.is_approved OR p.approved_at is not null). 신규 미검증 가입자(approved_at null)는 계속 제외.
--  - 동시에 Kevin 의 "1명당 3명" 규칙을 SQL 로 명문화:
--    · 요청자 본인이 이미 active+pending 매칭 3개면 추가 요청 불가(null 반환).
--    · 후보도 active+pending 매칭 3개 이상이면 제외(인기 회원이 4명 이상 묶이지 않게).
--  - 성별/학교·전공·동아리/캠퍼스 선호/기존 매칭쌍 제외 등 나머지 하드 필터, 정렬은 그대로.
--  - ⚠️ 즉시 active 가 되는 무료 첫 매칭 find_or_create_match 는 변경하지 않는다(운영자 검토 없이
--    바로 연결되므로 후보 풀을 넓히지 않음).
-- 적용: Supabase SQL Editor / MCP.
-- ============================================================

create or replace function public.request_additional_match(p_user_id uuid)
returns uuid language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_me public.profiles%rowtype; v_candidate uuid; v_match_id uuid; v_a uuid; v_b uuid;
  v_cap constant int := 3;  -- 1인당 동시 매칭(active+pending) 상한
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'unauthorized';
  end if;

  select * into v_me from public.profiles where user_id = p_user_id;
  if not found or not coalesce(v_me.is_approved, false) then
    raise exception 'not approved';
  end if;

  -- 이미 대기 중인 추가 매칭 요청이 있으면 그대로 반환(중복 생성 방지)
  select id into v_match_id
  from public.matches
  where status = 'pending' and (user_a = p_user_id or user_b = p_user_id)
  limit 1;
  if v_match_id is not null then
    return v_match_id;
  end if;

  -- 요청자 본인 상한: active+pending 3개면 더 못 만남
  if (select count(*) from public.matches m
        where (m.user_a = p_user_id or m.user_b = p_user_id)
          and m.status in ('active','pending')) >= v_cap then
    return null;
  end if;

  select p.user_id into v_candidate
  from public.profiles p
  where
    -- 후보 자격: 지금 승인 상태이거나, 한 번이라도 승인된 적 있는 회원
    -- (매칭으로 is_approved 가 내려간 기존 회원 포함, 신규 미검증 가입자는 제외)
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
    -- 음악(장르/곡)은 하드 필터에서 제외 — 후보 자격 아님(정렬 우선순위로만 반영).
    and not exists (
      select 1 from public.matches m
      where (m.user_a = p_user_id and m.user_b = p.user_id)
         or (m.user_a = p.user_id and m.user_b = p_user_id)
    )
    -- 후보 상한: active+pending 매칭이 3개 이상인 회원은 제외
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

  -- 즉시 연결하지 않고 'pending' 으로만 생성 — 운영팀 confirm_match 승인 후 active + 양쪽 알림.
  insert into public.matches (user_a, user_b, status)
  values (v_a, v_b, 'pending')
  returning id into v_match_id;

  -- 요청자에게만 "대기 중" 안내. 매칭 성사 알림은 관리자 승인(confirm_match) 후 발송.
  insert into public.notifications (user_id, type, title, body, link)
  values (p_user_id, 'system', '매칭 대기 중이에요',
          '운영팀이 확인한 뒤 매칭을 연결해드릴게요. 조금만 기다려주세요.', '/chat');

  return v_match_id;
end;
$function$;

revoke all on function public.request_additional_match(uuid) from anon;
grant execute on function public.request_additional_match(uuid) to authenticated;
