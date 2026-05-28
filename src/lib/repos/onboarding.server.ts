import type { SupabaseClient } from "@supabase/supabase-js";

// 가입 단계 진입 기록. 프로필 행이 생기기 전(payment 제출 전)이라
// auth 계정만 있고 어디까지 갔는지 알 수 없던 구간을 메운다.
// 쓰기는 SECURITY DEFINER 함수(record_onboarding_step)로만 — 본인 행만, 전진만 기록.

export const ONBOARDING_STEPS = [
  "profile_basic",
  "profile_photo",
  "profile_payment",
] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

function isOnboardingStep(s: string): s is OnboardingStep {
  return (ONBOARDING_STEPS as readonly string[]).includes(s);
}

export async function recordOnboardingStep(
  supabase: SupabaseClient,
  step: string,
): Promise<void> {
  if (!isOnboardingStep(step)) return;
  const { error } = await supabase.rpc("record_onboarding_step", {
    p_step: step,
  });
  if (error) console.error("[onboarding.recordStep]", error);
}
