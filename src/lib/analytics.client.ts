// PostHog 클라이언트 래퍼.
// 키(window.ENV.POSTHOG_KEY)가 없으면 모든 함수가 no-op → 키 미설정 환경에서도 안전.
// 키는 .env 의 POSTHOG_KEY / POSTHOG_HOST → root.tsx loader → window.ENV 로 전달됨.
// posthog-js 는 동적 import 로 브라우저에서만 로드 (SSR 안전).
import type { PostHog } from "posthog-js";

let client: PostHog | null = null;

// 피처플래그(=실험) 준비 상태. 키 없으면 영원히 false → 실험 훅은 fallback(control) 유지.
let flagsLoaded = false;
const flagListeners = new Set<() => void>();

export async function initAnalytics(): Promise<void> {
  if (client || typeof window === "undefined") return;
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

  // 실험 플래그가 로드되면 구독자에게 알림 (init 전에 등록된 훅 포함).
  posthog.onFeatureFlags(() => {
    flagsLoaded = true;
    flagListeners.forEach((cb) => cb());
  });
}

// 실험 변형값 조회. 'control' / 'test' 같은 멀티배리언트 문자열 또는 boolean.
export function getFeatureFlag(key: string): string | boolean | undefined {
  return client?.getFeatureFlag(key);
}

// 플래그가 로드되면(혹은 이미 로드됐으면 즉시) 콜백 실행. 해제 함수 반환.
export function onFeatureFlagsReady(cb: () => void): () => void {
  flagListeners.add(cb);
  if (flagsLoaded) cb();
  return () => {
    flagListeners.delete(cb);
  };
}

export function capture(
  event: string,
  props?: Record<string, unknown>,
): void {
  client?.capture(event, props);
}

export function identify(
  userId: string,
  props?: Record<string, unknown>,
): void {
  client?.identify(userId, props);
}
