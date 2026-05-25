import type { SupabaseClient } from "@supabase/supabase-js";
import { sanitizeGenres } from "~/lib/genres";

// user_genres 테이블 접근. RLS 적용된 server client 사용.
// 장르는 매칭(find_best_match)에서 "장르 겹침 수" 정렬에 쓰인다.

export async function listUserGenres(
  supabase: SupabaseClient,
  userId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("user_genres")
    .select("genre")
    .eq("user_id", userId)
    .returns<{ genre: string }[]>();
  if (error) {
    console.error("[userGenres.list]", error);
    return [];
  }
  return (data ?? []).map((r) => r.genre);
}

/**
 * 사용자의 기존 장르 전부 삭제 후 새로 insert (replace 전략).
 * 알 수 없는 값/중복/초과분은 sanitizeGenres 가 걸러낸다.
 */
export async function replaceUserGenres(
  supabase: SupabaseClient,
  userId: string,
  genres: unknown,
): Promise<{ ok: boolean; error?: string }> {
  const clean = sanitizeGenres(genres);

  const { error: delError } = await supabase
    .from("user_genres")
    .delete()
    .eq("user_id", userId);
  if (delError) {
    console.error("[userGenres.replace.delete]", delError);
    return { ok: false, error: delError.message };
  }

  if (clean.length === 0) return { ok: true };

  const rows = clean.map((genre) => ({ user_id: userId, genre }));
  const { error: insError } = await supabase.from("user_genres").insert(rows);
  if (insError) {
    console.error("[userGenres.replace.insert]", insError);
    return { ok: false, error: insError.message };
  }
  return { ok: true };
}
