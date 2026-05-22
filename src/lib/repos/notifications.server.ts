import type { SupabaseClient } from "@supabase/supabase-js";
import type { NotificationRow } from "~/lib/db-types";

// 알림 조회/읽음 처리. RLS 가 본인 알림만 노출하도록 보장.

export async function listNotifications(
  supabase: SupabaseClient,
  userId: string,
  limit = 30,
): Promise<NotificationRow[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("id, user_id, type, title, body, link, is_read, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<NotificationRow[]>();

  if (error) {
    console.error("[notifications.list]", error);
    return [];
  }
  return data ?? [];
}

export async function countUnreadNotifications(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) {
    console.error("[notifications.countUnread]", error);
    return 0;
  }
  return count ?? 0;
}

export async function markAllNotificationsRead(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) console.error("[notifications.markAllRead]", error);
}
