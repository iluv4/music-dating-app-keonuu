// PostHog 클라이언트 래퍼.
// 키(window.ENV.POSTHOG_KEY)가 없으면 모든 함수가 no-op → 키 미설정 환경에서도 안전.
// 키는 .env 의 POSTHOG_KEY / POSTHOG_HOST → root.tsx loader → window.ENV 로 전달됨.
// posthog-js 는 동적 import 로 브라우저에서만 로드 (SSR 안전).
import type { PostHog } from "posthog-js";

let client: PostHog | null = null;

export async function initAnalytics(): Promise<void> {
  if (client || typeof window === "undefined") return;
  const key = window.ENV?.POSTHOG_KEY;
  if (!key) return; // 키 없으면 트래킹 비활성

  const { default: posthog } = await import("posthog-js");
  posthog.init(key, {
    api_host: window.ENV?.POSTHOG_HOST || "https://us.i.posthog.com",
    capture_pageview: true,
    person_profiles: "identified_only",
  });
  client = posthog;
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
