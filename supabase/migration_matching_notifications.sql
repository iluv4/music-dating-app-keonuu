-- ============================================================
-- 매칭 + 알림 기능 마이그레이션 (추가 전용 — 기존 테이블/정책 변경 없음)
-- Supabase Dashboard → SQL Editor 에 붙여넣고 실행하세요.
-- 여러 번 실행해도 안전합니다 (idempotent).
-- ============================================================

-- 1) 알림 테이블 ------------------------------------------------
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  type        text not null default 'system',   -- 'match' | 'message' | 'system'
  title       text not null,
  body        text,
  link        text,                              -- 예: /chat/<matchId>
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists notifications_user_idx
  on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
  on public.notifications for select
  using (auth.uid() = user_id);

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
  on public.notifications for update
  using (auth.uid() = user_id);
-- INSERT 는 아래 SECURITY DEFINER 함수로만 수행 (사용자 직접 insert 불가)

-- 2) 매칭 생성 함수 --------------------------------------------
-- 음악 취향(같은 곡 1곡 이상)이 겹치는 승인된 이성 회원과 매칭을 생성.
-- 이미 active 매칭이 있으면 그 id 반환. 후보 없으면 null 반환.
create or replace function public.find_or_create_match(p_user_id uuid)
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

  -- 이미 active 매칭이 있으면 그대로 반환
  select id into v_match_id
  from public.matches
  where status = 'active' and (user_a = p_user_id or user_b = p_user_id)
  limit 1;
  if v_match_id is not null then
    return v_match_id;
  end if;

  -- 후보 찾기: 승인 + 이성(성별 정보 있을 때) + 같은 곡 1곡 이상 + 미매칭
  select p.user_id into v_candidate
  from public.profiles p
  where p.is_approved
    and p.user_id <> p_user_id
    and (v_me.gender is null or p.gender is null or p.gender <> v_me.gender)
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
  values (v_a, v_b, 'active')
  returning id into v_match_id;

  insert into public.notifications (user_id, type, title, body, link)
  values
    (p_user_id,   'match', '새 매칭이 성사됐어요!', '음악 취향이 통하는 상대와 매칭됐어요.', '/chat/' || v_match_id),
    (v_candidate, 'match', '새 매칭이 성사됐어요!', '음악 취향이 통하는 상대와 매칭됐어요.', '/chat/' || v_match_id);

  return v_match_id;
end;
$$;

grant execute on function public.find_or_create_match(uuid) to authenticated;

-- 3) 둘러보기(탐색) 함수 ---------------------------------------
-- 승인된 다른 회원 목록 + 선택 곡 수 (탐색 페이지용).
create or replace function public.list_discover_members(p_user_id uuid)
returns table (
  user_id    uuid,
  name       text,
  school     text,
  gender     text,
  song_count bigint
)
language sql
security definer
set search_path = public
as $$
  select p.user_id, p.name, p.school, p.gender::text, count(us.id) as song_count
  from public.profiles p
  left join public.user_songs us on us.user_id = p.user_id
  where p.is_approved
    and p.user_id <> p_user_id
  group by p.user_id, p.name, p.school, p.gender
  order by random()
  limit 20;
$$;

grant execute on function public.list_discover_members(uuid) to authenticated;
