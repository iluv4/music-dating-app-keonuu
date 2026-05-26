// 학교 / 캠퍼스 / 거주지역 / 매칭 선호 공통 정의.
//
// 확장 설계: 지금은 상명대(서울·천안)만 쓰지만, 백석대·단국대 죽전 등 다른 대학도
// 들어올 수 있도록 DB는 school(대학교명)·campus(캠퍼스명)를 분리해서 저장한다.
//   - school : "상명대학교" / "백석대학교" / "단국대학교"  (대학교명)
//   - campus : "서울" / "천안" / "죽전" / ""               (캠퍼스, 단일캠이면 빈값)
// 매칭은 "같은 대학(school)"이 기본 경계 → 다른 대학이 추가돼도 자기 학교 안에서만 매칭됨.
// 그 안에서 match_campus_pref 로 캠퍼스를 좁힌다.

// 한 대학의 정의(학과·동아리 데이터는 각 캠퍼스 키로 departments.ts / clubs.ts 에 둔다).
export type School = {
  id: string; // 안정 식별자 (예: "smu")
  name: string; // 대학교명 (profiles.school 에 저장되는 값)
  campuses: Campus[]; // 캠퍼스 목록 (단일캠 대학이면 빈 배열)
};

export type Campus = "서울" | "천안";

// 학과·동아리 데이터가 캠퍼스 키로 준비된 대학 목록(드롭다운 자동완성 지원).
// 여기 없는 대학도 회원가입 시 학교명을 직접 입력해 가입할 수 있다(학과/동아리는 자유 입력).
export const SCHOOLS: School[] = [
  { id: "smu", name: "상명대학교", campuses: ["서울", "천안"] },
  // 추후 예시:
  // { id: "bu",  name: "백석대학교", campuses: [] },        // 천안 단일캠
  // { id: "dku", name: "단국대학교", campuses: ["천안"] },  // 단국대 천안
];

// 가입 화면에서 기본으로 제안하는 대학(주최교). 다른 대학은 직접 입력.
export const DEFAULT_SCHOOL = SCHOOLS[0];

export const CAMPUSES: Campus[] = ["서울", "천안"];

export function isCampus(v: unknown): v is Campus {
  return v === "서울" || v === "천안";
}

// 입력한 학교명이 캠퍼스/학과 데이터가 준비된 등록 대학인지 조회.
export function findSchool(name: string | null | undefined): School | undefined {
  const n = (name ?? "").trim();
  if (!n) return undefined;
  return SCHOOLS.find((s) => s.name === n);
}

// 해당 학교가 캠퍼스(서울/천안 등)를 선택해야 하는 대학인지.
// 등록되지 않은(직접 입력) 대학은 캠퍼스 개념 없이 학교명만으로 가입.
export function schoolRequiresCampus(school: string | null | undefined): boolean {
  return (findSchool(school)?.campuses.length ?? 0) > 0;
}

// 표시용: "상명대학교 서울" 형태. campus 가 비면 학교명만.
export function formatSchool(
  school: string | null | undefined,
  campus?: string | null,
): string {
  const s = (school ?? "").trim();
  const c = (campus ?? "").trim();
  if (!s) return "-";
  return c ? `${s} ${c}` : s;
}

// 매칭 선호: 어느 캠퍼스 사람과 매칭하고 싶은지. 기본값 "상관없음"(풀을 넓혀 매칭률 유리).
export type MatchCampusPref = "상관없음" | "서울" | "천안";

export const MATCH_CAMPUS_PREFS: MatchCampusPref[] = ["상관없음", "서울", "천안"];

export const MATCH_CAMPUS_PREF_LABEL: Record<MatchCampusPref, string> = {
  상관없음: "어디든 좋아요",
  서울: "서울캠퍼스",
  천안: "천안캠퍼스",
};

export function isMatchCampusPref(v: unknown): v is MatchCampusPref {
  return v === "상관없음" || v === "서울" || v === "천안";
}

// 거주지역(고향·본가·자취) 자동완성 힌트. 목록에 없으면 직접 입력 가능.
export const REGIONS: string[] = [
  "서울", "경기", "인천", "천안", "충남", "충북", "대전", "세종",
  "강원", "전북", "전남", "광주", "경북", "경남", "대구", "부산", "울산", "제주",
];

export function filterRegions(query: string, limit = 20): string[] {
  const q = query.trim();
  if (!q) return REGIONS.slice(0, limit);
  return REGIONS.filter((r) => r.includes(q)).slice(0, limit);
}
