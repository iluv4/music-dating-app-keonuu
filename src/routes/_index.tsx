import { redirect, type LoaderFunctionArgs } from "@remix-run/node";
import { getUser, postApprovalDestination } from "~/lib/auth.server";
import { getProfileFields } from "~/lib/repos/profiles.server";

// 스플래시 화면 제거 — "/" 진입 시 서버에서 즉시 알맞은 화면으로 라우팅.
// - 비로그인 → /welcome
// - 로그인·프로필 없음 → /profile/basic
// - 로그인·미승인 → /waiting
// - 로그인·승인 완료 → /music 또는 /genre (곡 선택 여부)
export async function loader({ request }: LoaderFunctionArgs) {
  const ctx = await getUser(request);
  if (!ctx.user) {
    throw redirect("/welcome", { headers: ctx.headers });
  }

  const profile = await getProfileFields(ctx.supabase, ctx.user.id, [
    "user_id",
    "is_approved",
  ]);
  if (!profile) {
    throw redirect("/profile/basic", { headers: ctx.headers });
  }
  if (!profile.is_approved) {
    throw redirect("/waiting", { headers: ctx.headers });
  }

  const dest = await postApprovalDestination(ctx.supabase, ctx.user.id);
  throw redirect(dest, { headers: ctx.headers });
}

// 리다이렉트만 수행하므로 렌더링되지 않음.
export default function Index() {
  return null;
}
