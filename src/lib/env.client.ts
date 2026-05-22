// 브라우저에서 root.tsx 의 window.ENV 접근 헬퍼.

type ClientEnv = {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  POSTHOG_KEY?: string;
  POSTHOG_HOST?: string;
};

declare global {
  interface Window {
    ENV: ClientEnv;
  }
}

export function getClientEnv(): ClientEnv {
  if (typeof window === "undefined") {
    throw new Error("getClientEnv must run in the browser only.");
  }
  return window.ENV;
}
