import { getSupabaseBrowser } from "~/lib/supabase.client";
import { getClientEnv } from "~/lib/env.client";

export type OAuthProvider = "kakao";

// Starts the Supabase OAuth redirect flow. Returns to /auth/callback,
// which exchanges the code for a session cookie.
export async function signInWithProvider(provider: OAuthProvider): Promise<void> {
  const env = getClientEnv();
  const supabase = getSupabaseBrowser({
    url: env.SUPABASE_URL,
    anonKey: env.SUPABASE_ANON_KEY,
  });

  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${window.location.origin}/auth/callback` },
  });

  if (error) {
    // eslint-disable-next-line no-alert
    alert("소셜 로그인을 시작하지 못했어요. 잠시 후 다시 시도해주세요.");
  }
}
