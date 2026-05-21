import { createClient } from "@supabase/supabase-js";

// service_role 키 사용 — RLS 우회 + 관리자 API 가능
// 절대 클라이언트 노출 금지. 이 모듈은 *.server.ts 라 Remix 가 서버 번들에만 포함.

let cached: ReturnType<typeof createClient> | null = null;

export function getSupabaseAdmin() {
  if (cached) return cached;
  cached = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
  return cached;
}
