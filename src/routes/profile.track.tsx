import { json, type ActionFunctionArgs } from "@remix-run/node";
import { requireUser } from "~/lib/auth.server";
import { recordOnboardingStep } from "~/lib/repos/onboarding.server";

// 리소스 라우트(default export 없음) — 가입 단계 진입을 서버에 기록.
// profile.basic / profile.payment 가 마운트 시 fetcher 로 POST.
export async function action({ request }: ActionFunctionArgs) {
  const ctx = await requireUser(request);
  const fd = await request.formData();
  const step = String(fd.get("step") ?? "");
  await recordOnboardingStep(ctx.supabase, step);
  return json({ ok: true }, { headers: ctx.headers });
}
