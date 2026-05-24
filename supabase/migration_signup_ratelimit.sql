-- ============================================================
-- 가입 남용 방지 — 시도 기록 테이블 (Supabase 에 이미 적용됨)
-- signup 액션이 service_role(admin) 로 IP당 최근 1시간 5회 제한 검사에 사용.
-- RLS 정책 없음 → anon/authenticated 접근 차단, service_role 만 읽고 씀.
-- ============================================================
create table if not exists public.signup_attempts (
  id          uuid primary key default gen_random_uuid(),
  ip          text not null,
  created_at  timestamptz not null default now()
);
create index if not exists signup_attempts_ip_time
  on public.signup_attempts (ip, created_at desc);
alter table public.signup_attempts enable row level security;
</content>
