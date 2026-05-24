import type { Song } from "~/lib/song-types";

// 첫 메시지 추천 문구 생성.
// 내가 고른 곡(RLS상 본인 곡만 읽힘)을 근거로 자연스러운 오프너를 만든다.
// 상대 실명은 마스킹돼 있어(예: 김**) 문구에 넣지 않는다.
// 공통곡 기반으로 고도화하려면 상대 곡을 읽는 SECURITY DEFINER RPC가 필요(추후).
export function buildIcebreakers(mySongs: Song[]): string[] {
  const songLabel = (s: Song) => `${s.artist} - ${s.title}`;

  const out: string[] = [];

  if (mySongs[0]) {
    out.push(
      `안녕하세요! 음악 취향이 통해서 반가워요 😊 저는 '${songLabel(
        mySongs[0],
      )}' 자주 듣는데 어떤 노래 좋아하세요?`,
    );
  }
  if (mySongs[1]) {
    out.push(`요즘 인생곡 있으세요? 저는 '${songLabel(mySongs[1])}'에 빠져있어요 🎶`);
  }
  if (mySongs[0]) {
    out.push(
      `플레이리스트 공유해요! 저는 ${mySongs[0].artist} 좋아하는데 추천곡 있으면 알려주세요 🎧`,
    );
  }

  // 곡이 없거나 부족하면 일반 오프너로 채운다.
  const fallbacks = [
    "안녕하세요! 음악으로 만나니 신기하네요 😊 요즘 자주 듣는 노래 있어요?",
    "반가워요! 어떤 장르 즐겨 들으세요?",
    "안녕하세요 🎶 인생곡 하나만 추천해주실래요?",
  ];
  for (const f of fallbacks) {
    if (out.length >= 3) break;
    if (!out.includes(f)) out.push(f);
  }

  return out.slice(0, 3);
}
