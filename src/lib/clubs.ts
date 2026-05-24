// 동아리 검색용 시드 목록. datalist 자동완성 + 없으면 직접 입력(자유 등록) 지원.
// 정확한 상명대 천안캠퍼스 실제 동아리 목록을 받으면 이 배열만 교체하면 됨.
export const CLUBS: string[] = [
  // 체육
  "축구부", "농구부", "야구부", "배드민턴", "테니스", "볼링", "헬스/보디빌딩", "수영", "클라이밍",
  // 음악/공연
  "밴드", "보컬", "어쿠스틱", "댄스", "힙합/스트릿댄스", "연극", "사진/포토",
  // 학술/IT
  "코딩/프로그래밍", "메이커스", "영어회화", "토론", "독서", "주식/투자",
  // 봉사/문화
  "봉사동아리", "여행", "요리", "보드게임", "와인/맥주", "영화감상", "캘리그라피",
];

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, "");

export function filterClubs(query: string, limit = 20): string[] {
  const q = norm(query.trim());
  if (!q) return CLUBS.slice(0, limit);
  return CLUBS.filter((c) => norm(c).includes(q)).slice(0, limit);
}
