-- ============================================================
-- 데모 기간: 매칭 시 자동 강등(재입금 요구) 비활성화
-- 매칭하면 is_approved=false 로 강등되어 /waiting(재입금)으로 막히던 UX 제거.
-- 트리거는 DROP 하지 않고 DISABLE → 다시 켜려면 ENABLE TRIGGER.
-- (수익모델 "매칭마다 재결제"를 복원하려면 아래 ENABLE 라인 실행)
-- ============================================================

-- 비활성화
alter table public.matches disable trigger matches_revoke_approval;

-- 복원용(필요 시):
-- alter table public.matches enable trigger matches_revoke_approval;

-- 매칭으로 강등됐던 기존 사용자 재승인
-- (postgres/service_role 컨텍스트에선 guard_approval_change 가드가 걸리지 않음)
update public.profiles
set is_approved = true
where is_approved = false
  and user_id in (
    select user_a from public.matches
    union
    select user_b from public.matches
  );
