-- ============================================================
-- "한 명 더 만나기"(추가 매칭) — 즉시 연결 → 운영팀 확인(대기) 방식으로 변경
-- 추가 매칭은 곧바로 active 로 만들지 않고 'pending' 으로 만든 뒤,
-- 운영팀이 admin 에서 확인·승인해야 active 가 되고 양쪽에 매칭 알림이 발송됩니다.
-- Supabase Dashboard → SQL Editor 에 붙여넣고 실행하세요. (idempotent)
-- ============================================================

-- 1) matches.status 에 'pending' 허용 ---------------------------
--    기존 status CHECK 제약(이름 모름)을 모두 떼고 새로 추가.
do $$
declare r record;
begin
  for r in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'matches'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%status%'
  loop
    execute format('alter table public.matches drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.matches
  add constraint matches_status_check
  check (status in ('pending', 'active', 'ended'));

-- 2) 추가 매칭 "요청" 함수 -------------------------------------
--    find_or_create_match 와 후보 조건은 같지만, 매칭을 'pending' 으로만 만들고
--    상대/연결 알림은 보내지 않는다. 요청자에게만 "대기 중" 안내 알림 1건.
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

  -- 이미 대기 중인 추가 매칭 요청이 있으면 그대로 반환(중복 생성 방지)
  select id into v_match_id
  from public.matches
  where status = 'pending' and (user_a = p_user_id or user_b = p_user_id)
  limit 1;
  if v_match_id is not null then
    return v_match_id;
  end if;

  -- 후보: 승인 + 이성 + 같은 전공/동아리 제외 + 같은 곡 1곡 이상 + 기존 매칭(어떤 상태든) 없음
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

  insert into public.matches (user_a, user_b, status)
  values (v_a, v_b, 'pending')
  returning id into v_match_id;

  -- 요청자에게만 "대기 중" 안내. 매칭 성사 알림은 관리자 승인(confirm_match) 후 발송.
  insert into public.notifications (user_id, type, title, body, link)
  values (p_user_id, 'system', '매칭 대기 중이에요',
          '운영팀이 확인한 뒤 매칭을 연결해드릴게요. 조금만 기다려주세요.', '/chat');

  return v_match_id;
end;
$$;

revoke all on function public.request_additional_match(uuid) from anon;
grant execute on function public.request_additional_match(uuid) to authenticated;

-- 3) 관리자 매칭 승인 함수 -------------------------------------
--    pending → active 로 전환하고 양쪽에 매칭 성사 알림 발송.
--    service_role(관리자)만 호출. authenticated 권한 부여 안 함.
create or replace function public.confirm_match(p_match_id uuid)
returns public.matches
language plpgsql
security definer
set search_path = public
as $$
declare m public.matches%rowtype;
begin
  update public.matches
  set status = 'active'
  where id = p_match_id and status = 'pending'
  returning * into m;

  if not found then
    return null;
  end if;

  insert into public.notifications (user_id, type, title, body, link)
  values
    (m.user_a, 'match', '새 매칭이 성사됐어요!', '음악 취향이 통하는 상대와 매칭됐어요.', '/chat/' || m.id),
    (m.user_b, 'match', '새 매칭이 성사됐어요!', '음악 취향이 통하는 상대와 매칭됐어요.', '/chat/' || m.id);

  return m;
end;
$$;

revoke all on function public.confirm_match(uuid) from anon, authenticated;
grant execute on function public.confirm_match(uuid) to service_role;
