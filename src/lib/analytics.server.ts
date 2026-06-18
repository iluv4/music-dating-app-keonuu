// 서버사이드 캡처 — PostHog + Amplitude 동시 전송.
// 가입/프로필완성/곡선택 같은 "성공" 지점은 전부 서버 액션 리다이렉트라
// 브라우저 SDK 로는 못 잡힌다 → 서버에서 직접 ingestion API 로 쏜다.
// 키가 없으면 no-op. distinct_id 는 auth user id 로 통일해 클라 identify 와 같은 사람으로 합쳐진다.

// 공개 ingestion 키 — root.tsx 의 폴백과 동일. env 우선, 미설정 시 폴백.
const POSTHOG_KEY_DEFAULT = "phc_tJJ9JhT6UCDvB4PzmLeGqLPqY8rZb7DU2MiX6LtSDkgY";
const POSTHOG_HOST_DEFAULT = "https://us.i.posthog.com";
const AMPLITUDE_KEY_DEFAULT = "28e9d25bf96f1b7abd44383f43700511";

// Amplitude 프로젝트가 EU 존이면 env AMPLITUDE_SERVER_ZONE=EU (US 존은 미설정).
function amplitudeEndpoint(): string {
  return process.env.AMPLITUDE_SERVER_ZONE === "EU"
    ? "https://api.eu.amplitude.com/2/httpapi"
    : "https://api2.amplitude.com/2/httpapi";
}

async function capturePostHog(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>,
): Promise<void> {
  const key = process.env.POSTHOG_KEY || POSTHOG_KEY_DEFAULT;
  if (!key) return;
  const host = process.env.POSTHOG_HOST || POSTHOG_HOST_DEFAULT;

  const res = await fetch(`${host.replace(/\/$/, "")}/capture/`, {
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
  // 잘못된 키여도 fetch 자체는 성공하므로 status 를 봐야 실패가 드러난다.
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`PostHog HTTP ${res.status}: ${body.slice(0, 300)}`);
  }
}

// Amplitude HTTP V2 API — 브라우저(unified SDK)와 같은 프로젝트 키라 한 곳에 모인다.
async function captureAmplitude(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>,
): Promise<void> {
  const key = process.env.AMPLITUDE_API_KEY || AMPLITUDE_KEY_DEFAULT;
  if (!key) return;

  const res = await fetch(amplitudeEndpoint(), {
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
  // invalid_api_key 등은 HTTP 400 으로 오는데 본문을 봐야 원인을 알 수 있다.
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Amplitude HTTP ${res.status}: ${body.slice(0, 300)}`);
  }
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

// 부팅 시 1회 자가진단 — Railway Deploy Logs 만 보고 키 유효성/도달성을 확정하기 위한 장치.
// 성공: "[analytics.server] selftest ok ..." / 실패: 위 capture failed 로그에 HTTP 상태·본문이 찍힌다.
let selfTestStarted = false;
export function runAnalyticsSelfTestOnce(): void {
  if (selfTestStarted) return;
  selfTestStarted = true;
  void Promise.all([
    captureAmplitude("server-selftest", "server_analytics_selftest")
      .then(() => console.log("[analytics.server] selftest ok: amplitude"))
      .catch((err) =>
        console.error("[analytics.server] selftest FAILED: amplitude —", err),
      ),
    capturePostHog("server-selftest", "server_analytics_selftest")
      .then(() => console.log("[analytics.server] selftest ok: posthog"))
      .catch((err) =>
        console.error("[analytics.server] selftest FAILED: posthog —", err),
      ),
  ]);
}
