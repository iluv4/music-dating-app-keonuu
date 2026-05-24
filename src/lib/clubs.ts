// 상명대학교 천안캠퍼스 중앙동아리 시드 목록 (공식 동아리정보 페이지 기준).
// datalist 자동완성 힌트용 — 목록에 없으면 직접 입력(자유 등록) 가능.
// 동아리는 매년 바뀌므로 최신 목록 받으면 이 배열만 교체. 출처: https://www.smu.ac.kr/ko/life/circles2.do
export const CLUBS: string[] = [
  // 공연/예술
  "Darkness (락밴드)", "Soulo (어쿠스틱)", "Crunk Brain (흑인음악)", "CHEEZE (사진)", "SM 미공간 (만화)",
  // 체육
  "FREEZE (댄스)", "ISSUE (축구)", "리뉴 (농구)", "버저비터 (길거리농구)", "Top-Spin (테니스)",
  "UNIT (수영)", "벌크업 (보디빌딩)", "한큐 (당구)", "더킹 (복싱)",
  // 학술/교양
  "광년이 (광고기획)", "CodeCure (정보보호)", "Questioners (토론·독서)", "우리말글 가꿈이", "휴머노이드 로봇클럽",
  // 봉사/문화
  "Youth-Jc (사회봉사)", "RCY (적십자)", "생생생 은빛봉사단", "나, 여기 (여행)", "점프 (행사기획)", "품에안고 (동물보호)",
  // 종교
  "CCC", "IVF", "이레 (가톨릭)",
];

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, "");

export function filterClubs(query: string, limit = 20): string[] {
  const q = norm(query.trim());
  if (!q) return CLUBS.slice(0, limit);
  return CLUBS.filter((c) => norm(c).includes(q)).slice(0, limit);
}
