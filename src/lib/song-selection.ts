import { useState } from "react";
import type { Song } from "~/lib/song-types";

export const MAX_SONGS = 3;

// 단순 in-memory 셀렉션 훅 (DB 영속화는 페이지 action 이 담당)
export function useSelectedSongs(initial: Song[] = []) {
  const [songs, setSongs] = useState<Song[]>(initial.slice(0, MAX_SONGS));

  const add = (song: Song): { ok: boolean; reason?: "max" | "duplicate" } => {
    if (songs.length >= MAX_SONGS) {
      return { ok: false, reason: "max" };
    }
    if (songs.some((s) => s.songNo === song.songNo)) {
      return { ok: false, reason: "duplicate" };
    }
    setSongs((prev) => [...prev, song]);
    return { ok: true };
  };

  const remove = (songNo: number) => {
    setSongs((prev) => prev.filter((s) => s.songNo !== songNo));
  };

  return { songs, add, remove };
}
