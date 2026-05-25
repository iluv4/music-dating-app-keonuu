import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { requireUser } from "~/lib/auth.server";
import { getSupabaseAdmin } from "~/lib/supabase-admin.server";

// 프로필 사진 공개 — "매칭 후 공개" 원칙.
// 본인 사진은 항상, 타인 사진은 둘 사이 활성 매칭이 있을 때만 단기 서명 URL 을 발급한다.
// (스토리지 RLS 는 owner 전용이라, 상대 열람은 이 서버 경로에서 service_role 로만 처리)
const SIGN_TTL_SECONDS = 300;

export async function loader({ request }: LoaderFunctionArgs) {
  const ctx = await requireUser(request);
  const url = new URL(request.url);
  const targetId = url.searchParams.get("userId");

  if (!targetId) {
    return json({ url: null, error: "userId_required" }, { status: 400, headers: ctx.headers });
  }

  const isSelf = targetId === ctx.user.id;

  // 타인 사진은 활성 매칭이 있어야만 공개.
  if (!isSelf) {
    const { data: match } = await ctx.supabase
      .from("matches")
      .select("id")
      .eq("status", "active")
      .or(
        `and(user_a.eq.${ctx.user.id},user_b.eq.${targetId}),and(user_a.eq.${targetId},user_b.eq.${ctx.user.id})`,
      )
      .maybeSingle();
    if (!match) {
      return json({ url: null, error: "not_matched" }, { status: 403, headers: ctx.headers });
    }
  }

  // photo_path(경로) 조회 후 service_role 로 서명.
  const admin = getSupabaseAdmin();
  const { data: profile } = await admin
    .from("profiles")
    .select("photo_path")
    .eq("user_id", targetId)
    .maybeSingle<{ photo_path: string | null }>();

  const path = profile?.photo_path;
  if (!path) {
    return json({ url: null }, { headers: ctx.headers });
  }

  const { data: signed, error } = await admin.storage
    .from("profile-photos")
    .createSignedUrl(path, SIGN_TTL_SECONDS);
  if (error || !signed?.signedUrl) {
    console.error("[api.member-photo] sign failed", error);
    return json({ url: null }, { headers: ctx.headers });
  }

  return json({ url: signed.signedUrl }, { headers: ctx.headers });
}
