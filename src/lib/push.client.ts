// PWA 푸시 구독 (브라우저). VAPID 공개키(window.ENV.VAPID_PUBLIC_KEY) 없으면 no-op.
// iOS 주의: 알림 권한 요청(Notification.requestPermission)은 반드시 사용자 제스처(탭) 안에서
// 호출해야 동작한다. 자동(useEffect) 호출은 iOS가 무시 → 프롬프트가 안 뜨고 구독도 안 생김.
// 그래서 자동 동기화(syncPushIfGranted, 권한 이미 허용 시만)와 버튼용(enablePush)을 분리한다.
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function pushPermission(): NotificationPermission | "unsupported" {
  if (!pushSupported()) return "unsupported";
  return Notification.permission;
}

// 서비스워커 등록 → 구독 → 서버 저장. 권한 프롬프트는 띄우지 않는다(이미 granted 가정).
async function subscribeAndSave(): Promise<boolean> {
  const vapid = window.ENV?.VAPID_PUBLIC_KEY;
  if (!vapid) return false;
  const reg = await navigator.serviceWorker.register("/sw.js");
  // iOS는 active SW가 보장돼야 subscribe 가능 — ready 대기
  await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();
  const sub =
    existing ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapid) as BufferSource,
    }));
  const json = sub.toJSON();
  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: sub.endpoint,
      p256dh: json.keys?.p256dh,
      auth: json.keys?.auth,
    }),
  });
  return res.ok;
}

// 자동 호출용 — 권한이 "이미 허용"된 경우에만 조용히 구독 동기화(프롬프트 없음).
export async function syncPushIfGranted(): Promise<void> {
  if (!pushSupported()) return;
  if (!window.ENV?.VAPID_PUBLIC_KEY) return;
  if (Notification.permission !== "granted") return;
  try {
    await subscribeAndSave();
  } catch (e) {
    console.error("[push.sync]", e);
  }
}

export type EnableResult =
  | "ok"
  | "denied"
  | "unsupported"
  | "no-vapid"
  | "error";

// 버튼 탭(사용자 제스처)에서 호출 — 여기서 권한 요청. iOS 필수 조건.
export async function enablePush(): Promise<EnableResult> {
  if (!pushSupported()) return "unsupported";
  if (!window.ENV?.VAPID_PUBLIC_KEY) return "no-vapid";
  try {
    if (Notification.permission === "denied") return "denied";
    if (Notification.permission === "default") {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return "denied";
    }
    const ok = await subscribeAndSave();
    return ok ? "ok" : "error";
  } catch (e) {
    console.error("[push.enable]", e);
    return "error";
  }
}
