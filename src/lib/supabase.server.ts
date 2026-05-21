import { createServerClient, parseCookieHeader, serializeCookieHeader } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

// 매 요청마다 새 클라이언트를 만들어 쿠키 기반 세션을 동기화한다.
// loader/action 에서 사용. headers 반환을 잊지 말 것.

export type ServerSupabaseContext = {
  supabase: SupabaseClient;
  headers: Headers;
};

export function createSupabaseServerClient(
  request: Request,
): ServerSupabaseContext {
  const headers = new Headers();

  const supabase = createServerClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          const cookieHeader = request.headers.get("Cookie") ?? "";
          const parsed = parseCookieHeader(cookieHeader);
          return parsed
            .filter(
              (c): c is { name: string; value: string } =>
                typeof c.value === "string",
            )
            .map(({ name, value }) => ({ name, value }));
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            headers.append(
              "Set-Cookie",
              serializeCookieHeader(name, value, options),
            );
          });
        },
      },
    },
  );

  return { supabase, headers };
}
