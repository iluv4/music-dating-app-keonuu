import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserSongRow } from "~/lib/db-types";
import type { Song } from "~/lib/song-types";

const SELECT_COLS = "song_no, title, artist, album, album_img";

type ListedSongRow = Pick<
  UserSongRow,
  "song_no" | "title" | "artist" | "album" | "album_img"
>;

function rowToSong(r: ListedSongRow): Song {
  return {
    songNo: r.song_no,
    title: r.title,
    artist: r.artist,
    album: r.album ?? undefined,
    albumImg: r.album_img ?? undefined,
  };
}

export async function listUserSongs(
  supabase: SupabaseClient,
  userId: string,
): Promise<Song[]> {
  const { data, error } = await supabase
    .from("user_songs")
    .select(SELECT_COLS)
    .eq("user_id", userId)
    .order("selected_at", { ascending: true })
    .returns<ListedSongRow[]>();
  if (error) {
    console.error("[userSongs.list]", error);
    return [];
  }
  return (data ?? []).map(rowToSong);
}

export async function countUserSongs(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("user_songs")
    .select("song_no", { count: "exact", head: true })
    .eq("user_id", userId);
  if (error) {
    console.error("[userSongs.count]", error);
    return 0;
  }
  return count ?? 0;
}

/**
 * 사용자의 기존 곡 전부 삭제 후 새로 insert (replace 전략).
 * 최대 3곡 제약은 DB 트리거에서 보장.
 */
export async function replaceUserSongs(
  supabase: SupabaseClient,
  userId: string,
  songs: Song[],
): Promise<{ ok: boolean; error?: string }> {
  const { error: delError } = await supabase
    .from("user_songs")
    .delete()
    .eq("user_id", userId);
  if (delError) {
    console.error("[userSongs.replace.delete]", delError);
    return { ok: false, error: delError.message };
  }

  if (songs.length === 0) return { ok: true };

  const rows = songs.map((s) => ({
    user_id: userId,
    song_no: s.songNo,
    title: s.title,
    artist: s.artist,
    album: s.album ?? null,
    album_img: s.albumImg ?? null,
  }));

  const { error: insError } = await supabase.from("user_songs").insert(rows);
  if (insError) {
    console.error("[userSongs.replace.insert]", insError);
    return { ok: false, error: insError.message };
  }
  return { ok: true };
}
