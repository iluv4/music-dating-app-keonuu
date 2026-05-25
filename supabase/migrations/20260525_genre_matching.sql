-- ============================================================
-- 장르 영속화 + 장르 우선 매칭 (find_best_match / run_matching_sweep)
-- Supabase Dashboard → SQL Editor 에 붙여넣고 실행하세요. (idempotent)
--
-- 무엇이 바뀌나
--  1) user_genres 테이블 — 장르 선택을 실제로 저장(기존엔 useState로만 있다가 버려짐).
--  2) find_best_match(p_user_id) — "곡 완전 일치" 대신 "장르 우선, 안 겹쳐도 매칭".
--       정렬: 장르 겹침 수 → 곡 겹침 수 → random.
--       후보가 하나라도 있으면 장르 0개 겹쳐도 무조건 매칭 → 아무도 안 남게 함.
--  3) 동시 활성 매칭 1개 + 누적 캡 2회 — 한 번에 여러 명한테 연락 오는 일/무한 매칭 방지.
--  4) run_matching_sweep() — 운영팀이 일괄로 대기자를 매칭시키는 함수(service_role 전용).
-- ============================================================

-- 0) 백스톱 인덱스 — 같은 쌍에 active 매칭이 둘 이상 생기지 못하게 한다.
--    (migration_match_concurrency.sql 와 동일. on conflict 타겟으로도 사용)
create unique index if not exists matches_active_pair_uniq
  on public.matches (least(user_a, user_b), greatest(user_a, user_b))
  where status = 'active';

-- 1) user_genres 테이블 ----------------------------------------
create table if not exists public.user_genres (
  user_id     uuid not null references auth.users(id) on delete cascade,
  genre       text not null,
  selected_at timestamptz not null default now(),
  primary key (user_id, genre)
);

create index if not exists user_genres_genre_idx on public.user_genres (genre);

alter table public.user_genres enable row level security;

-- 본인 장르만 직접 조회/수정. 타인 장르는 SECURITY DEFINER 매칭 함수만 읽음.
drop policy if exists "user_genres_select_own" on public.user_genres;
create policy "user_genres_select_own"
  on public.user_genres for select
  using (auth.uid() = user_id);

drop policy if exists "user_genres_insert_own" on public.user_genres;
create policy "user_genres_insert_own"
  on public.user_genres for insert
  with check (auth.uid() = user_id);

drop policy if exists "user_genres_delete_own" on public.user_genres;
create policy "user_genres_delete_own"
  on public.user_genres for delete
  using (auth.uid() = user_id);

-- 2) find_best_match — 장르 우선, 안 겹쳐도 무조건 매칭 --------
create or replace function public.find_best_match(p_user_id uuid)
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
  v_total int;
  c_cap constant int := 2;  -- 누적 매칭 캡(재입금 포함 최대 2회)
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'unauthorized';
  end if;

  select * into v_me from public.profiles where user_id = p_user_id;
  if not found or not coalesce(v_me.is_approved, false) then
    raise exception 'not approved';
  end if;

  -- 동시 활성 매칭 1개: 이미 active 매칭이 있으면 잠금 없이 그대로 반환(멱등).
  select id into v_match_id from public.matches
  where status = 'active' and (user_a = p_user_id or user_b = p_user_id)
  limit 1;
  if v_match_id is not null then
    return v_match_id;
  end if;

  -- 누적 캡: 지금까지 참여한 매칭(상태 무관)이 캡 이상이면 차단.
  select count(*) into v_total from public.matches
  where user_a = p_user_id or user_b = p_user_id;
  if v_total >= c_cap then
    raise exception 'match_cap_reached';
  end if;

  -- 매칭 생성 직렬화 (기존 함수들과 동일 키).
  perform pg_advisory_xact_lock(hashtext('match_creation'));

  -- 락 획득 후 재확인: 대기 중 다른 호출이 나를 매칭시켰을 수 있음.
  select id into v_match_id from public.matches
  where status = 'active' and (user_a = p_user_id or user_b = p_user_id)
  limit 1;
  if v_match_id is not null then
    return v_match_id;
  end if;

  -- 후보: 승인 + 이성 + 곡 1곡 이상 + 나와 기존 매칭 없음
  --       + 후보도 동시 활성 매칭 없음 + 후보 누적 캡 미만.
  -- 정렬: 장르 겹침 수 → 곡 겹침 수 → random. (겹침 0이어도 후보가 있으면 매칭)
  select p.user_id into v_candidate
  from public.profiles p
  where p.is_approved
    and p.user_id <> p_user_id
    and (v_me.gender is null or p.gender is null or p.gender <> v_me.gender)
    and exists (select 1 from public.user_songs s where s.user_id = p.user_id)
    and not exists (
      select 1 from public.matches m
      where (m.user_a = p_user_id and m.user_b = p.user_id)
         or (m.user_a = p.user_id and m.user_b = p_user_id)
    )
    and not exists (
      select 1 from public.matches m
      where m.status = 'active' and (m.user_a = p.user_id or m.user_b = p.user_id)
    )
    and (
      select count(*) from public.matches m
      where m.user_a = p.user_id or m.user_b = p.user_id
    ) < c_cap
  order by
    (select count(*) from public.user_genres g1
       join public.user_genres g2 on g1.genre = g2.genre
       where g1.user_id = p_user_id and g2.user_id = p.user_id) desc,
    (select count(*) from public.user_songs a
       join public.user_songs b on a.song_no = b.song_no
       where a.user_id = p_user_id and b.user_id = p.user_id) desc,
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
  on conflict (least(user_a, user_b), greatest(user_a, user_b)) where status = 'active'
  do nothing
  returning id into v_match_id;

  -- 동시 경합으로 같은 쌍이 이미 생성됨 → 기존 매칭 반환, 알림 중복 생성 안 함.
  if v_match_id is null then
    select id into v_match_id from public.matches
    where status = 'active' and user_a = v_a and user_b = v_b limit 1;
    return v_match_id;
  end if;

  insert into public.notifications (user_id, type, title, body, link) values
    (p_user_id,   'match', '새 매칭이 성사됐어요!', '음악 취향이 통하는 상대와 매칭됐어요.', '/chat/' || v_match_id),
    (v_candidate, 'match', '새 매칭이 성사됐어요!', '음악 취향이 통하는 상대와 매칭됐어요.', '/chat/' || v_match_id);

  return v_match_id;
end;
$$;

revoke all on function public.find_best_match(uuid) from anon;
grant execute on function public.find_best_match(uuid) to authenticated;

-- 3) run_matching_sweep — 운영팀 일괄 매칭 (service_role 전용) --
--    대기 중(승인 + 곡 있음 + 활성 매칭 없음 + 누적 캡 미만)인 사용자들을
--    장르/곡 겹침 우선으로 짝지어 active 매칭을 생성. 생성 건수를 반환.
create or replace function public.run_matching_sweep()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user      uuid;
  v_candidate uuid;
  v_match_id  uuid;
  v_a uuid;
  v_b uuid;
  v_count int := 0;
  c_cap constant int := 2;
begin
  perform pg_advisory_xact_lock(hashtext('match_creation'));

  for v_user in
    select p.user_id
    from public.profiles p
    where p.is_approved
      and exists (select 1 from public.user_songs s where s.user_id = p.user_id)
      and not exists (
        select 1 from public.matches m
        where m.status = 'active' and (m.user_a = p.user_id or m.user_b = p.user_id)
      )
      and (
        select count(*) from public.matches m
        where m.user_a = p.user_id or m.user_b = p.user_id
      ) < c_cap
    order by random()
  loop
    -- 이 스윕 중에 방금 매칭됐을 수 있음 → 재확인.
    if exists (
      select 1 from public.matches m
      where m.status = 'active' and (m.user_a = v_user or m.user_b = v_user)
    ) then
      continue;
    end if;
    if (
      select count(*) from public.matches m
      where m.user_a = v_user or m.user_b = v_user
    ) >= c_cap then
      continue;
    end if;

    select p.user_id into v_candidate
    from public.profiles p
    join public.profiles me on me.user_id = v_user
    where p.is_approved
      and p.user_id <> v_user
      and (me.gender is null or p.gender is null or p.gender <> me.gender)
      and exists (select 1 from public.user_songs s where s.user_id = p.user_id)
      and not exists (
        select 1 from public.matches m
        where (m.user_a = v_user and m.user_b = p.user_id)
           or (m.user_a = p.user_id and m.user_b = v_user)
      )
      and not exists (
        select 1 from public.matches m
        where m.status = 'active' and (m.user_a = p.user_id or m.user_b = p.user_id)
      )
      and (
        select count(*) from public.matches m
        where m.user_a = p.user_id or m.user_b = p.user_id
      ) < c_cap
    order by
      (select count(*) from public.user_genres g1
         join public.user_genres g2 on g1.genre = g2.genre
         where g1.user_id = v_user and g2.user_id = p.user_id) desc,
      (select count(*) from public.user_songs a
         join public.user_songs b on a.song_no = b.song_no
         where a.user_id = v_user and b.user_id = p.user_id) desc,
      random()
    limit 1;

    if v_candidate is null then
      continue;
    end if;

    if v_user < v_candidate then
      v_a := v_user; v_b := v_candidate;
    else
      v_a := v_candidate; v_b := v_user;
    end if;

    insert into public.matches (user_a, user_b, status)
    values (v_a, v_b, 'active')
    on conflict (least(user_a, user_b), greatest(user_a, user_b)) where status = 'active'
    do nothing
    returning id into v_match_id;

    if v_match_id is null then
      continue;
    end if;

    insert into public.notifications (user_id, type, title, body, link) values
      (v_a, 'match', '새 매칭이 성사됐어요!', '음악 취향이 통하는 상대와 매칭됐어요.', '/chat/' || v_match_id),
      (v_b, 'match', '새 매칭이 성사됐어요!', '음악 취향이 통하는 상대와 매칭됐어요.', '/chat/' || v_match_id);

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.run_matching_sweep() from anon, authenticated;
grant execute on function public.run_matching_sweep() to service_role;
