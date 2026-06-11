// 서버사이드 캡처 — PostHog + Amplitude 동시 전송.
// 가입/프로필완성/곡선택 같은 "성공" 지점은 전부 서버 액션 리다이렉트라
// 브라우저 SDK 로는 못 잡힌다 → 서버에서 직접 ingestion API 로 쏜다.
// 키가 없으면 no-op. distinct_id 는 auth user id 로 통일해 클라 identify 와 같은 사람으로 합쳐진다.

// 공개 ingestion 키 — root.tsx 의 폴백과 동일. env 우선, 미설정 시 폴백.
const POSTHOG_KEY_DEFAULT = "phc_tJJ9JhT6UCDvB4PzmLeGqLPqY8rZb7DU2MiX6LtSDkgY";
const POSTHOG_HOST_DEFAULT = "https://us.i.posthog.com";
const AMPLITUDE_KEY_DEFAULT = "28e9d25bf96f1b7abd44383f43700511";

async function capturePostHog(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>,
): Promise<void> {
  const key = process.env.POSTHOG_KEY || POSTHOG_KEY_DEFAULT;
  if (!key) return;
  const host = process.env.POSTHOG_HOST || POSTHOG_HOST_DEFAULT;

  await fetch(`${host.replace(/\/$/, "")}/capture/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: key,
      event,
      distinct_id: distinctId,
      properties: { $lib: "server", ...properties },
      timestamp: new Date().toISOString(),
    }),
  });
}

// Amplitude HTTP V2 API — 브라우저(unified SDK)와 같은 프로젝트 키라 한 곳에 모인다.
async function captureAmplitude(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>,
): Promise<void> {
  const key = process.env.AMPLITUDE_API_KEY || AMPLITUDE_KEY_DEFAULT;
  if (!key) return;

  await fetch("https://api2.amplitude.com/2/httpapi", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: key,
      events: [
        {
          user_id: distinctId,
          event_type: event,
          time: Date.now(),
          event_properties: { lib: "server", ...properties },
        },
      ],
    }),
  });
}

export async function captureServer(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>,
): Promise<void> {
  if (!distinctId) return;

  // 트래킹 실패가 유저 플로우를 막으면 안 됨 — 각자 삼킨다.
  await Promise.all(
    [capturePostHog, captureAmplitude].map((send) =>
      send(distinctId, event, properties).catch((err) => {
        console.error("[analytics.server] capture failed", event, err);
      }),
    ),
  );
}
