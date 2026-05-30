import type { SupabaseClient } from "@supabase/supabase-js";
import type { MessageRow } from "~/lib/db-types";
import { getSupabaseAdmin } from "~/lib/supabase-admin.server";

const SELECT_COLS =
  "id, match_id, sender_id, content, image_url, created_at, read_at, edited_at, deleted_at, view_once, viewed_at, disappear";

// 비공개 chat-images 버킷의 객체를 service_role 로 즉시 삭제.
// 삭제/소멸/한 번만 보기 열람 후 서명 URL 재생성으로도 다시 못 보게 원본을 지운다.
async function purgeImage(path: string | null | undefined): Promise<void> {
  if (!path) return;
  try {
    const admin = getSupabaseAdmin();
    await admin.storage.from("chat-images").remove([path]);
  } catch (err) {
    console.error("[messages.purgeImage]", err);
  }
}

export async function listMessages(
  supabase: SupabaseClient,
  matchId: string,
  limit = 50,
): Promise<MessageRow[]> {
  // 최신 limit개를 가져온다(내림차순 + limit). 오름차순 limit 으로 가져오면
  // 메시지가 limit 을 넘는 순간 "가장 오래된 limit개"만 잡혀 최근(방금 보낸) 메시지가 잘린다.
  const { data, error } = await supabase
    .from("messages")
    .select(SELECT_COLS)
    .eq("match_id", matchId)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<MessageRow[]>();

  if (error) {
    console.error("[messages.list]", error);
    return [];
  }
  // 화면 표시용으로 시간 오름차순 복원
  return (data ?? []).reverse();
}

export async function sendMessage(
  supabase: SupabaseClient,
  matchId: string,
  senderId: string,
  content: string,
  imageUrl?: string | null,
  options?: { viewOnce?: boolean; disappear?: boolean },
): Promise<{ ok: boolean; message?: MessageRow; error?: string }> {
  const trimmed = content.trim();
  // 텍스트 또는 사진 중 하나는 있어야 함
  if (!trimmed && !imageUrl)
    return { ok: false, error: "내용이 비어있어요." };
  if (trimmed.length > 2000)
    return { ok: false, error: "메시지가 너무 길어요." };
  // 한 번만 보기는 사진 전용
  const viewOnce = !!options?.viewOnce && !!imageUrl;

  const { data, error } = await supabase
    .from("messages")
    .insert({
      match_id: matchId,
      sender_id: senderId,
      content: trimmed,
      image_url: imageUrl ?? null,
      view_once: viewOnce,
      disappear: !!options?.disappear,
    })
    .select(SELECT_COLS)
    .single<MessageRow>();

  if (error) {
    console.error("[messages.send]", error);
    return { ok: false, error: error.message };
  }
  return { ok: true, message: data ?? undefined };
}

/**
 * 본인 메시지 수정 — content 갱신 + edited_at 기록.
 * 삭제됐거나 사진(한 번만 보기 포함) 메시지는 수정 불가.
 */
export async function editMessage(
  supabase: SupabaseClient,
  messageId: string,
  userId: string,
  content: string,
): Promise<{ ok: boolean; message?: MessageRow; error?: string }> {
  const trimmed = content.trim();
  if (!trimmed) return { ok: false, error: "내용이 비어있어요." };
  if (trimmed.length > 2000)
    return { ok: false, error: "메시지가 너무 길어요." };

  const { data, error } = await supabase
    .from("messages")
    .update({ content: trimmed, edited_at: new Date().toISOString() })
    .eq("id", messageId)
    .eq("sender_id", userId)
    .is("deleted_at", null)
    .is("image_url", null)
    .select(SELECT_COLS)
    .single<MessageRow>();

  if (error || !data) {
    console.error("[messages.edit]", error);
    return { ok: false, error: "메시지를 수정하지 못했어요." };
  }
  return { ok: true, message: data };
}

/**
 * 본인 메시지 삭제 (양쪽 모두 적용) — soft delete.
 * content·image_url 을 비우고 deleted_at 기록 → 양쪽에 "사라진 메시지" 로 표시.
 * 사진이면 스토리지 원본도 제거.
 */
export async function deleteMessage(
  supabase: SupabaseClient,
  messageId: string,
  userId: string,
): Promise<{ ok: boolean; message?: MessageRow; error?: string }> {
  const { data: existing } = await supabase
    .from("messages")
    .select("image_url")
    .eq("id", messageId)
    .eq("sender_id", userId)
    .maybeSingle<{ image_url: string | null }>();

  const { data, error } = await supabase
    .from("messages")
    .update({ deleted_at: new Date().toISOString(), content: "", image_url: null })
    .eq("id", messageId)
    .eq("sender_id", userId)
    .select(SELECT_COLS)
    .single<MessageRow>();

  if (error || !data) {
    console.error("[messages.delete]", error);
    return { ok: false, error: "메시지를 삭제하지 못했어요." };
  }
  await purgeImage(existing?.image_url);
  return { ok: true, message: data };
}

/**
 * 펑(읽으면 소멸) — 수신자가 읽은 뒤 호출. 받은 disappear 메시지를 soft delete.
 * 발신자가 아닌 참가자만, disappear=true 인 메시지에 한해.
 */
export async function disappearMessage(
  supabase: SupabaseClient,
  messageId: string,
  userId: string,
): Promise<{ ok: boolean; message?: MessageRow; error?: string }> {
  const { data: existing } = await supabase
    .from("messages")
    .select("image_url")
    .eq("id", messageId)
    .neq("sender_id", userId)
    .maybeSingle<{ image_url: string | null }>();

  const { data, error } = await supabase
    .from("messages")
    .update({ deleted_at: new Date().toISOString(), content: "", image_url: null })
    .eq("id", messageId)
    .neq("sender_id", userId)
    .eq("disappear", true)
    .is("deleted_at", null)
    .select(SELECT_COLS)
    .single<MessageRow>();

  if (error || !data) {
    console.error("[messages.disappear]", error);
    return { ok: false, error: "메시지를 소멸시키지 못했어요." };
  }
  await purgeImage(existing?.image_url);
  return { ok: true, message: data };
}

/**
 * 한 번만 보기 사진 열람 — 수신자가 처음 열 때 호출.
 * viewed_at 기록 + 스토리지 원본 즉시 삭제(서명 URL 재생성 차단).
 * 클라이언트는 이미지 onload 이후 호출하므로 표시 중인 사진은 영향 없음.
 */
export async function markViewed(
  supabase: SupabaseClient,
  messageId: string,
  userId: string,
): Promise<{ ok: boolean; message?: MessageRow; error?: string }> {
  const { data: existing } = await supabase
    .from("messages")
    .select("image_url, view_once, viewed_at")
    .eq("id", messageId)
    .neq("sender_id", userId)
    .maybeSingle<{
      image_url: string | null;
      view_once: boolean;
      viewed_at: string | null;
    }>();

  if (!existing || !existing.view_once) {
    return { ok: false, error: "사진을 찾을 수 없어요." };
  }

  const { data, error } = await supabase
    .from("messages")
    .update({ viewed_at: new Date().toISOString(), image_url: null })
    .eq("id", messageId)
    .neq("sender_id", userId)
    .eq("view_once", true)
    .select(SELECT_COLS)
    .single<MessageRow>();

  if (error || !data) {
    console.error("[messages.markViewed]", error);
    return { ok: false, error: "사진을 열람 처리하지 못했어요." };
  }
  await purgeImage(existing.image_url);
  return { ok: true, message: data };
}

/**
 * 채팅방 입장 시 호출 — 상대가 보낸 미읽음 메시지 read_at 일괄 갱신.
 */
export async function markMessagesRead(
  supabase: SupabaseClient,
  matchId: string,
  currentUserId: string,
): Promise<void> {
  const { error } = await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("match_id", matchId)
    .neq("sender_id", currentUserId)
    .is("read_at", null);
  if (error) {
    console.error("[messages.markRead]", error);
  }
}
