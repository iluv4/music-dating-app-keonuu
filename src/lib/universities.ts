// 회원가입 학교 자동완성용 대학 목록 (우선 오픈 대학만 큐레이션).
//
// 캠퍼스/학과/동아리 데이터가 준비된 대학은 campus.ts 의 SCHOOLS 에 따로 정의한다
// (현재 상명대만 캠퍼스 버튼·학과 드롭다운 지원, 나머지는 학과/동아리 자유 입력).
// 이 목록은 "학교명 입력 + 자동완성" 후보다. 목록에 없는 학교도 직접 입력해 가입 가능.
//
// 캠퍼스가 나뉜 대학(단국대 등)은 캠퍼스별로 별도 항목으로 노출한다.
const CURATED: string[] = [
  "상명대학교",
  "호서대학교",
  "단국대학교(죽전캠퍼스)",
  "단국대학교(천안캠퍼스)",
  "한국항공대학교",
  "건국대학교(서울캠퍼스)",
  "동국대학교(서울캠퍼스)",
  "국민대학교",
  "홍익대학교(서울캠퍼스)",
  "세종대학교",
  "숭실대학교",
  "광운대학교",
  "덕성여자대학교",
  "가톨릭대학교",
  "가천대학교",
];

// 대학 목록 (중복 제거 + 가나다 정렬).
export const KOREAN_UNIVERSITIES: string[] = Array.from(new Set(CURATED)).sort(
  (a, b) => a.localeCompare(b, "ko"),
);

// 입력한 학교명으로 후보를 좁혀 반환(자동완성용). 부분일치.
export function filterUniversities(query: string, limit = 30): string[] {
  const q = query.trim();
  if (!q) return KOREAN_UNIVERSITIES.slice(0, limit);
  return KOREAN_UNIVERSITIES.filter((u) => u.includes(q)).slice(0, limit);
}
