// 브라우저에서 root.tsx 의 window.ENV 접근 헬퍼.

type ClientEnv = {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  POSTHOG_KEY?: string;
  POSTHOG_HOST?: string;
  AMPLITUDE_API_KEY?: string;
  AMPLITUDE_SERVER_ZONE?: string;
  GA_MEASUREMENT_ID?: string;
  VAPID_PUBLIC_KEY?: string;
};

declare global {
  interface Window {
    ENV: ClientEnv;
    // Google Analytics(gtag.js) — GA_MEASUREMENT_ID 설정 시 root.tsx 가 주입.
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function getClientEnv(): ClientEnv {
  if (typeof window === "undefined") {
    throw new Error("getClientEnv must run in the browser only.");
  }
  return window.ENV;
}
