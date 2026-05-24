import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ProfileRow,
  ProfileUpdate,
  ProfileUpsert,
} from "~/lib/db-types";

// profiles 테이블 접근. 모든 쿼리는 RLS 적용된 server client 사용.
// service_role 가 필요한 케이스는 별도 명시.

type Cols = keyof ProfileRow;
type Pick<T, K extends keyof T> = { [P in K]: T[P] };

// 사용자 입력 텍스트 필드 최대 길이 — 거대 페이로드 저장/타 사용자 노출 시 UI 깨짐 방지.
const FIELD_MAX: Record<string, number> = {
  name: 40,
  school: 80,
  major: 80,
  club: 60,
  bank_holder: 40,
};

// 알려진 텍스트 필드를 trim + 최대 길이로 클램프. 알 수 없는 키는 그대로 통과.
function clampProfileText<T extends Record<string, unknown>>(data: T): T {
  const out: Record<string, unknown> = { ...data };
  for (const [key, max] of Object.entries(FIELD_MAX)) {
    const v = out[key];
    if (typeof v === "string") out[key] = v.trim().slice(0, max);
  }
  return out as T;
}

export async function getProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle<ProfileRow>();
  if (error) {
    console.error("[profiles.get]", error);
    return null;
  }
  return data;
}

/**
 * 명시한 컬럼만 가져오는 변형. select() 작게 가져가고 싶을 때.
 */
export async function getProfileFields<K extends Cols>(
  supabase: SupabaseClient,
  userId: string,
  cols: K[],
): Promise<Pick<ProfileRow, K> | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(cols.join(","))
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    console.error("[profiles.getFields]", error);
    return null;
  }
  if (!data) return null;
  return data as unknown as Pick<ProfileRow, K>;
}

export async function upsertProfile(
  supabase: SupabaseClient,
  data: ProfileUpsert,
): Promise<{ ok: boolean; error?: string }> {
  const clean = clampProfileText(data);
  const { error } = await supabase
    .from("profiles")
    .upsert(
      { ...clean, updated_at: clean.updated_at ?? new Date().toISOString() },
      { onConflict: "user_id" },
    );
  if (error) {
    console.error("[profiles.upsert]", error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function updateProfile(
  supabase: SupabaseClient,
  userId: string,
  data: ProfileUpdate,
): Promise<{ ok: boolean; error?: string }> {
  const clean = clampProfileText(data);
  const { error } = await supabase
    .from("profiles")
    .update({
      ...clean,
      updated_at: clean.updated_at ?? new Date().toISOString(),
    })
    .eq("user_id", userId);
  if (error) {
    console.error("[profiles.update]", error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function isApproved(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const row = await getProfileFields(supabase, userId, ["is_approved"]);
  return !!row?.is_approved;
}
