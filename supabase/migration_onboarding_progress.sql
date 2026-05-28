-- 가입 단계 진입 기록. 프로필 행 생성(payment 제출) 전 어느 단계까지 갔는지 추적.
-- 적용: Supabase MCP apply_migration 으로 이미 반영됨. (SQL Editor 재실행도 멱등)
create table if not exists public.onboarding_progress (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  step       text not null,
  step_rank  int  not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 직접 접근 차단: 쓰기는 아래 SECURITY DEFINER 함수로만, 조회는 service_role(admin)로만.
alter table public.onboarding_progress enable row level security;

-- 진행도는 전진만 기록(뒤로 가기로 낮은 단계가 덮어쓰지 않게). rank는 서버에서 step으로 산출.
create or replace function public.record_onboarding_step(p_step text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r int;
begin
  if auth.uid() is null then
    return;
  end if;
  r := case p_step
         when 'profile_basic'   then 1
         when 'profile_payment' then 2
         else 0
       end;
  if r = 0 then
    return; -- 알 수 없는 step 무시
  end if;

  insert into public.onboarding_progress (user_id, step, step_rank)
  values (auth.uid(), p_step, r)
  on conflict (user_id) do update
    set step      = excluded.step,
        step_rank = excluded.step_rank,
        updated_at = now()
    where excluded.step_rank >= public.onboarding_progress.step_rank;
end;
$$;

revoke all on function public.record_onboarding_step(text) from public;
grant execute on function public.record_onboarding_step(text) to authenticated;
