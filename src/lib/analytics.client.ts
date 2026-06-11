// 분석 클라이언트 래퍼 — PostHog + Amplitude 동시 전송.
// 키(window.ENV.POSTHOG_KEY / AMPLITUDE_API_KEY)가 없으면 해당 툴만 no-op → 키 미설정 환경에서도 안전.
// 키는 .env → root.tsx loader → window.ENV 로 전달됨.
// SDK 는 동적 import 로 브라우저에서만 로드 (SSR 안전).
import type { PostHog } from "posthog-js";

type Amplitude = typeof import("@amplitude/unified");

let client: PostHog | null = null;
let amplitude: Amplitude | null = null;

const FIRST_TOUCH_KEY = "ph_first_touch";

// 첫 방문의 유입 출처(utm/referrer/landing)를 1회만 저장.
// 에타처럼 referrer 가 안 넘어오는 앱 유입은 utm 링크로만 출처가 잡히므로,
// 들어온 순간의 출처를 사람(person)에 박아 둬야 이후 가입/매칭까지 출처별 퍼널이 보인다.
function readFirstTouch(): Record<string, string> {
  try {
    const params = new URLSearchParams(window.location.search);
    const touch: Record<string, string> = {};
    for (const k of [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
    ]) {
      const v = params.get(k);
      if (v) touch[`initial_${k}`] = v.slice(0, 100);
    }
    if (document.referrer) touch.initial_referrer = document.referrer.slice(0, 200);
    touch.initial_landing = window.location.pathname;
    return touch;
  } catch {
    return {};
  }
}

function persistFirstTouch(): Record<string, string> {
  try {
    const existing = window.localStorage.getItem(FIRST_TOUCH_KEY);
    if (existing) return JSON.parse(existing) as Record<string, string>;
    const touch = readFirstTouch();
    window.localStorage.setItem(FIRST_TOUCH_KEY, JSON.stringify(touch));
    return touch;
  } catch {
    return {};
  }
}

export async function initAnalytics(): Promise<void> {
  if (typeof window === "undefined") return;
  // 한쪽 키가 없어도 다른 쪽은 동작하도록 독립 초기화.
  await Promise.all([initPostHog(), initAmplitude()]);
}

async function initPostHog(): Promise<void> {
  if (client) return;
  const key = window.ENV?.POSTHOG_KEY;
  if (!key) return; // 키 없으면 트래킹 비활성

  const { default: posthog } = await import("posthog-js");
  posthog.init(key, {
    api_host: window.ENV?.POSTHOG_HOST || "https://us.i.posthog.com",
    capture_pageview: true,
    person_profiles: "identified_only",
    // 세션 리플레이: 데이팅 앱이라 이름·이메일·입금자명·채팅이 DOM째 녹화됨.
    // → 모든 input 값 마스킹(비밀번호는 항상 마스킹). 텍스트는 노출(리플레이 유용성 위해).
    //   더 엄격히 가리려면 maskTextSelector 로 민감 영역 지정.
    disable_session_recording: false,
    session_recording: {
      maskAllInputs: true,
    },
  });
  client = posthog;

  // 첫 유입 출처를 세션 이벤트의 super property 로 부착(이번 세션 이벤트에 출처 태깅).
  const touch = persistFirstTouch();
  if (Object.keys(touch).length > 0) posthog.register(touch);
}

async function initAmplitude(): Promise<void> {
  if (amplitude) return;
  const key = window.ENV?.AMPLITUDE_API_KEY;
  if (!key) return; // 키 없으면 트래킹 비활성

  const mod = await import("@amplitude/unified");
  // Autocapture(페이지뷰·클릭·폼·세션·utm 어트리뷰션 자동 수집) + Session Replay 전 세션 녹화.
  // Session Replay 는 기본으로 모든 input 값을 마스킹 → PostHog 설정과 동일한 프라이버시 수준.
  await mod.initAll(key, {
    analytics: { autocapture: true },
    sessionReplay: { sampleRate: 1 },
  });
  amplitude = mod;
}

export function capture(
  event: string,
  props?: Record<string, unknown>,
): void {
  client?.capture(event, props);
  amplitude?.track(event, props);
}

export function identify(
  userId: string,
  props?: Record<string, unknown>,
): void {
  if (client) {
    // 첫 유입 출처는 사람당 1회만 박는다($set_once) → 가입·매칭 등 서버 이벤트도
    // 같은 distinct_id 로 합쳐져 출처별 세그먼트가 가능해진다.
    let firstTouch: Record<string, string> = {};
    try {
      const raw = window.localStorage.getItem(FIRST_TOUCH_KEY);
      if (raw) firstTouch = JSON.parse(raw) as Record<string, string>;
    } catch {
      firstTouch = {};
    }
    client.identify(userId, props, firstTouch);
  }

  if (amplitude) {
    // 같은 auth user id 를 쓰므로 서버(HTTP API) 이벤트와 동일인으로 합쳐진다.
    // 첫 유입 utm 은 Amplitude autocapture 어트리뷰션이 initial_* 로 자동 기록.
    amplitude.setUserId(userId);
    if (props) {
      const traits = new amplitude.Identify();
      let has = false;
      for (const [k, v] of Object.entries(props)) {
        if (
          typeof v === "string" ||
          typeof v === "number" ||
          typeof v === "boolean"
        ) {
          traits.set(k, v);
          has = true;
        }
      }
      if (has) amplitude.identify(traits);
    }
  }
}
