import type { SupabaseClient } from "@supabase/supabase-js";
import type { MessageRow } from "~/lib/db-types";

const SELECT_COLS =
  "id, match_id, sender_id, content, image_url, created_at, read_at";

export async function listMessages(
  supabase: SupabaseClient,
  matchId: string,
  limit = 50,
): Promise<MessageRow[]> {
  const { data, error } = await supabase
    .from("messages")
    .select(SELECT_COLS)
    .eq("match_id", matchId)
    .order("created_at", { ascending: true })
    .limit(limit)
    .returns<MessageRow[]>();

  if (error) {
    console.error("[messages.list]", error);
    return [];
  }
  return data ?? [];
}

export async function sendMessage(
  supabase: SupabaseClient,
  matchId: string,
  senderId: string,
  content: string,
  imageUrl?: string | null,
): Promise<{ ok: boolean; message?: MessageRow; error?: string }> {
  const trimmed = content.trim();
  // 텍스트 또는 사진 중 하나는 있어야 함
  if (!trimmed && !imageUrl)
    return { ok: false, error: "내용이 비어있어요." };
  if (trimmed.length > 2000)
    return { ok: false, error: "메시지가 너무 길어요." };

  const { data, error } = await supabase
    .from("messages")
    .insert({
      match_id: matchId,
      sender_id: senderId,
      content: trimmed,
      image_url: imageUrl ?? null,
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
