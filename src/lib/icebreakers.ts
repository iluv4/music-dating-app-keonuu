import type { Song } from "~/lib/song-types";

// 첫 메시지 추천 문구 생성.
// 내가 고른 곡(RLS상 본인 곡만 읽힘)을 근거로 자연스러운 오프너를 만든다.
// 상대 실명은 마스킹돼 있어(예: 김**) 문구에 넣지 않는다.
// 공통곡 기반으로 고도화하려면 상대 곡을 읽는 SECURITY DEFINER RPC가 필요(추후).
// 톤: MZ 카톡체 — 짧게, 한 줄, 부담 없이.
export function buildIcebreakers(mySongs: Song[]): string[] {
  const out: string[] = [];

  if (mySongs[0]) {
    out.push(`${mySongs[0].artist} 좋아해요? 저 완전 입덕 😆`);
  }
  if (mySongs[1]) {
    out.push(`요즘 인생곡 뭐예요?`);
  }
  if (mySongs[0]) {
    out.push(`플리 공유해요 🎧`);
  }

  // 곡이 없거나 부족하면 일반 오프너로 채운다.
  const fallbacks = [
    "안녕하세요 😊 음악 취향 통하네요",
    "어떤 노래 자주 들어요?",
    "인생곡 하나만 추천 🎶",
  ];
  for (const f of fallbacks) {
    if (out.length >= 3) break;
    if (!out.includes(f)) out.push(f);
  }

  return out.slice(0, 3);
}
