import webpush from "web-push";
import { getSupabaseAdmin } from "~/lib/supabase-admin.server";

// Web Push 발송 (Vercel Node 런타임). VAPID 키 없으면 전부 no-op.
let configured: boolean | null = null;

function ensureConfigured(): boolean {
  if (configured !== null) return configured;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) {
    configured = false;
    return false;
  }
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@musicmatch.app",
    pub,
    priv,
  );
  configured = true;
  return true;
}

type PushPayload = { title: string; body: string; url?: string };

// 특정 사용자의 모든 기기로 푸시 발송. 실패해도 호출부 흐름을 막지 않음.
export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
): Promise<void> {
  if (!ensureConfigured()) return;
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);
  if (error || !data || data.length === 0) return;

  const body = JSON.stringify(payload);
  await Promise.all(
    (data as Array<{ id: string; endpoint: string; p256dh: string; auth: string }>).map(
      async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            body,
          );
        } catch (err) {
          const code = (err as { statusCode?: number })?.statusCode;
          // 만료/무효 구독은 정리
          if (code === 404 || code === 410) {
            await admin.from("push_subscriptions").delete().eq("id", s.id);
          } else {
            console.error("[push.send]", code, (err as Error)?.message);
          }
        }
      },
    ),
  );
}
