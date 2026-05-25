// 장르 정의 단일 소스. genre 선택 화면과 매칭 대기 카드가 공유.
// id 는 user_genres.genre 에 저장되는 값과 동일해야 한다.

export type GenreDef = {
  id: string;
  label: string;
  hue: string; // 디스크 색감 placeholder
};

// 디자인 순서: BALLAD/HIPHOP, POP/INDIE, ROCK/JAZZ
export const GENRES: GenreDef[] = [
  { id: "ballad", label: "BALLAD", hue: "#a8a8a8" },
  { id: "hiphop", label: "HIPHOP", hue: "#5d3a5f" },
  { id: "pop", label: "POP", hue: "#d4a373" },
  { id: "indie", label: "INDIE", hue: "#7a9eb0" },
  { id: "rock", label: "ROCK", hue: "#2e2e2e" },
  { id: "jazz", label: "JAZZ", hue: "#b08d57" },
];

export const MAX_GENRES = 3;

export const GENRE_IDS: ReadonlySet<string> = new Set(GENRES.map((g) => g.id));

export const GENRE_LABEL: Record<string, string> = Object.fromEntries(
  GENRES.map((g) => [g.id, g.label]),
);

// 저장 전 정규화: 알려진 id 만, 중복 제거, 최대 MAX_GENRES 개.
export function sanitizeGenres(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const out: string[] = [];
  for (const item of input) {
    const id = typeof item === "string" ? item.trim() : "";
    if (GENRE_IDS.has(id) && !out.includes(id)) out.push(id);
    if (out.length >= MAX_GENRES) break;
  }
  return out;
}
