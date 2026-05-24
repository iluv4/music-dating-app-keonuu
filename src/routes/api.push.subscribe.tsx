import { json, type ActionFunctionArgs } from "@remix-run/node";
import { requireUser } from "~/lib/auth.server";
import { getSupabaseAdmin } from "~/lib/supabase-admin.server";

// 푸시 구독 저장. endpoint 기준 upsert (기기 단위). 인증 사용자 본인 소유로 기록.
export async function action({ request }: ActionFunctionArgs) {
  const ctx = await requireUser(request);
  let body: { endpoint?: string; p256dh?: string; auth?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "잘못된 요청" }, { status: 400, headers: ctx.headers });
  }
  const { endpoint, p256dh, auth } = body;
  if (!endpoint || !p256dh || !auth) {
    return json({ error: "구독 정보 누락" }, { status: 400, headers: ctx.headers });
  }

  // service_role 로 upsert — endpoint 충돌 시 최신 사용자/키로 갱신 (기기 소유자 변경 대응)
  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("push_subscriptions")
    .upsert(
      { user_id: ctx.user.id, endpoint, p256dh, auth } as never,
      { onConflict: "endpoint" },
    );
  if (error) {
    console.error("[push.subscribe]", error);
    return json({ error: "저장 실패" }, { status: 500, headers: ctx.headers });
  }
  return json({ ok: true }, { headers: ctx.headers });
}
