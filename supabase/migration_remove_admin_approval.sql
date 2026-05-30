-- ============================================================
-- 관리자 승인 제거
--  1) 결제 완료 시 본인 셀프 승인(complete_payment) — guard_approval_change 우회
--  2) 추가 매칭("한 명 더 만나기")을 운영팀 승인 없이 즉시 active 로 성사
-- 이미 Supabase 에 적용됨(MCP apply_migration: remove_admin_approval). 기록용 파일.
-- Supabase Dashboard → SQL Editor 에 붙여넣어도 idempotent.
-- ============================================================

-- 1) 결제 완료 셀프 승인 RPC
--    guard_approval_change 트리거는 app.bypass_approval_guard='on' 일 때 우회된다.
--    (SECURITY DEFINER 함수 내부에서만 로컬로 설정 → 외부에서 임의 자가승인 불가)
create or replace function public.complete_payment(p_bank_holder text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'unauthorized';
  end if;
  perform set_config('app.bypass_approval_guard', 'on', true);
  update public.profiles
  set is_approved = true,
      bank_holder = coalesce(nullif(btrim(p_bank_holder), ''), bank_holder),
      updated_at = now()
  where user_id = auth.uid();
end;
$$;
revoke all on function public.complete_payment(text) from anon;
grant execute on function public.complete_payment(text) to authenticated;

-- 2) 추가 매칭("한 명 더 만나기") — 운영팀 승인 없이 즉시 active + 양쪽 매칭 알림
create or replace function public.request_additional_match(p_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
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

  -- 후보: 승인 + 이성 + 같은 전공/동아리 제외 + 같은 곡 1곡 이상 + 기존 매칭 없음
  select p.user_id into v_candidate
  from public.profiles p
  where p.is_approved
    and p.user_id <> p_user_id
    and (v_me.gender is null or p.gender is null or p.gender <> v_me.gender)
    and (v_me.major is null or p.major is null
         or lower(btrim(p.major)) <> lower(btrim(v_me.major)))
    and (v_me.club is null or p.club is null
         or lower(btrim(p.club)) <> lower(btrim(v_me.club)))
    and exists (
      select 1
      from public.user_songs a
      join public.user_songs b on a.song_no = b.song_no
      where a.user_id = p_user_id and b.user_id = p.user_id
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

  -- 즉시 성사
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
$$;
revoke all on function public.request_additional_match(uuid) from anon;
grant execute on function public.request_additional_match(uuid) to authenticated;
