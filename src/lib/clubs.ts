// 상명대학교 캠퍼스별 중앙동아리 목록 (분과별).
// 천안: 2024 동아리현황 / 서울: 2025 중앙동아리현황 기준. 매년 바뀌므로 목록 받으면 교체.
// 분과 표기가 없던 천안캠은 활동내용 기반으로 분류.

import type { Campus } from "./campus";

export type ClubCategory = "공연" | "체육" | "학술" | "취미" | "봉사" | "사회" | "종교";

export type ClubGroup = {
  category: ClubCategory;
  items: string[];
};

const CHEONAN: ClubGroup[] = [
  { category: "공연", items: ["다크니스", "CRUNK BRAIN", "소울로", "프리즈(FREEZE)", "아리아"] },
  {
    category: "체육",
    items: ["Movement", "RENEW", "블루버드", "이슈(ISSUE)", "MindSet", "ROUTE", "벌크업", "UNIT", "푸릉"],
  },
  { category: "학술", items: ["CODECURE", "우리말가꿈이", "Questioners", "같이가치투자", "멋쟁이사자처럼", "GDGoC"] },
  { category: "취미", items: ["SM미공간", "CHEEZE", "상명유람단", "실오라기", "요쿡", "겟아웃", "쉼표", "HRC", "풋볼리즘"] },
  { category: "봉사", items: ["Youth-JC", "SURROUND"] },
  { category: "종교", items: ["CCC"] },
];

const SEOUL: ClubGroup[] = [
  { category: "공연", items: ["그루빈187", "발틱", "소리마을", "얘놀", "어우러짐흥", "토네이도", "프리에", "허밍"] },
  { category: "체육", items: ["S.U.V.", "S.W.E.A.T.", "벅스", "위너", "자하랑", "테슬라"] },
  { category: "학술", items: ["SMUMC", "모멘텀", "에듀플릿", "이니로", "체인지"] },
  { category: "취미", items: ["맹가미", "자하포토"] },
  { category: "봉사", items: ["IEMU11", "굿네이버스 가온누리"] },
  { category: "사회", items: ["상냥행", "상명또래상담"] },
  { category: "종교", items: ["CCC(한국대학생선교회)", "한국기독학생회IVF"] },
];

export const CLUBS_BY_CAMPUS: Record<Campus, ClubGroup[]> = {
  서울: SEOUL,
  천안: CHEONAN,
};

// 해당 캠퍼스의 전체 동아리명을 평탄화(자동완성 datalist 힌트용).
export function clubsForCampus(campus: Campus): string[] {
  return (CLUBS_BY_CAMPUS[campus] ?? []).flatMap((g) => g.items);
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, "");

export function filterClubs(campus: Campus, query: string, limit = 30): string[] {
  const all = clubsForCampus(campus);
  const q = norm(query.trim());
  if (!q) return all.slice(0, limit);
  return all.filter((c) => norm(c).includes(q)).slice(0, limit);
}
