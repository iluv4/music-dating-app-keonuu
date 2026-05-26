import { getSupabaseAdmin } from "~/lib/supabase-admin.server";
import { PROFILE_PHOTOS_BUCKET } from "~/lib/repos/profiles.server";

// 회원탈퇴 — 본인 데이터 일괄 삭제 + auth 계정 제거.
// auth.users 로의 FK가 대부분 없어(messages→matches CASCADE 만 존재) 직접 정리한다.
// service_role 로 RLS 우회. 호출 측에서 본인 userId 만 넘긴다.
export async function deleteAccount(userId: string): Promise<void> {
  const admin = getSupabaseAdmin();

  // 1. 내가 참여한 매칭의 채팅 사진 원본을 스토리지에서 제거 (best-effort).
  const { data: myMatches } = await admin
    .from("matches")
    .select("id")
    .or(`user_a.eq.${userId},user_b.eq.${userId}`)
    .returns<{ id: string }[]>();
  const matchIds = (myMatches ?? []).map((m) => m.id);
  if (matchIds.length > 0) {
    const imgRes = await admin
      .from("messages")
      .select("image_url")
      .in("match_id", matchIds)
      .not("image_url", "is", null);
    const imgRows = (imgRes.data ?? []) as { image_url: string | null }[];
    const paths = imgRows
      .map((r) => r.image_url)
      .filter((p): p is string => !!p);
    if (paths.length > 0) {
      await admin.storage.from("chat-images").remove(paths).catch(() => {});
    }
  }

  // 2. 프로필 사진 원본 제거 (best-effort).
  const { data: profile } = await admin
    .from("profiles")
    .select("photo_path")
    .eq("user_id", userId)
    .maybeSingle<{ photo_path: string | null }>();
  if (profile?.photo_path) {
    await admin.storage
      .from(PROFILE_PHOTOS_BUCKET)
      .remove([profile.photo_path])
      .catch(() => {});
  }

  // 3. 매칭 삭제 → messages 는 FK CASCADE 로 함께 제거.
  await admin.from("matches").delete().or(`user_a.eq.${userId},user_b.eq.${userId}`);

  // 4. 남은 본인 소유 행 정리.
  await admin.from("user_songs").delete().eq("user_id", userId);
  await admin.from("notifications").delete().eq("user_id", userId);
  await admin.from("push_subscriptions").delete().eq("user_id", userId);
  await admin.from("profiles").delete().eq("user_id", userId);

  // 5. auth 계정 제거 (로그인 자체 불가 + 이메일 재가입 허용).
  await admin.auth.admin.deleteUser(userId);
}
