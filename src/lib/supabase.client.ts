import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

// 브라우저 단일 인스턴스 (Realtime 구독 등에서 사용).
// 서버에서 import 되더라도 createBrowserClient 는 호출되지 않음 (lazy).

let cached: SupabaseClient | null = null;

type EnvConfig = {
  url: string;
  anonKey: string;
};

/**
 * 로더에서 다음과 같이 환경값을 응답으로 내려줘야 함:
 *   return json({ env: { SUPABASE_URL, SUPABASE_ANON_KEY } });
 * 그리고 root.tsx 에서 window.ENV 등으로 노출하거나 props 로 전달.
 *
 * MVP 에서는 직접 import.meta.env / window.ENV 접근 안 하고
 * 컴포넌트에서 env 객체를 받아 호출하는 패턴으로 시작.
 */
export function getSupabaseBrowser(env: EnvConfig): SupabaseClient {
  if (typeof window === "undefined") {
    throw new Error("getSupabaseBrowser must run in the browser only.");
  }
  if (cached) return cached;
  cached = createBrowserClient(env.url, env.anonKey);
  return cached;
}
