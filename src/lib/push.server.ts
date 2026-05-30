import webpush from "web-push";
import { waitUntil } from "@vercel/functions";
import { getSupabaseAdmin } from "~/lib/supabase-admin.server";

// Web Push 발송 (Vercel Node 런타임). VAPID 키 없으면 전부 no-op.
let configured: boolean | null = null;

function ensureConfigured(): boolean {
  if (configured !== null) return configured;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) {
    // 키 누락 시 원인을 로그로 명확히 — 잠금화면 푸시가 조용히 안 가던 문제 진단용.
    console.error(
      "[push.config] VAPID 키 누락 — 발송 비활성화:",
      `pub=${pub ? "set" : "MISSING"}`,
      `priv=${priv ? "set" : "MISSING"}`,
    );
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
  if (error) {
    console.error("[push.send] 구독 조회 실패:", error.message);
    return;
  }
  if (!data || data.length === 0) {
    console.warn("[push.send] 수신자 구독 없음:", userId);
    return;
  }

  const body = JSON.stringify(payload);
  let sent = 0;
  await Promise.all(
    (data as Array<{ id: string; endpoint: string; p256dh: string; auth: string }>).map(
      async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            body,
          );
          sent++;
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
  console.log(`[push.send] ${userId} → ${sent}/${data.length} 기기 발송 성공`);
}

// 응답을 막지 않고 푸시 발송 — 메시지 전송 액션이 푸시 왕복(외부 push 서버)을
// 기다리느라 느려지던 문제 해결. Vercel 서버리스에선 waitUntil 로 함수가 응답 후에도
// 발송을 끝내게 보장하고, 그 컨텍스트 밖(로컬 등)에선 백그라운드 실행으로 둔다.
export function dispatchPushToUser(userId: string, payload: PushPayload): void {
  const task = sendPushToUser(userId, payload).catch((e) => {
    console.error("[push.dispatch]", e);
  });
  try {
    waitUntil(task);
  } catch {
    // Vercel 런타임 컨텍스트 밖 — task 는 그대로 백그라운드 실행
  }
}
