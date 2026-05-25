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

// 현재 지원 대학 목록. 새 대학 추가 = 여기에 항목 + 해당 학과/동아리 데이터만 채우면 됨.
export const SCHOOLS: School[] = [
  { id: "smu", name: "상명대학교", campuses: ["서울", "천안"] },
  // 추후 예시:
  // { id: "bu",  name: "백석대학교", campuses: [] },        // 천안 단일캠
  // { id: "dku", name: "단국대학교", campuses: ["천안"] },  // 단국대 천안
];

// 단일 대학 운영 단계의 기본 대학.
export const DEFAULT_SCHOOL = SCHOOLS[0];

export const CAMPUSES: Campus[] = ["서울", "천안"];

export function isCampus(v: unknown): v is Campus {
  return v === "서울" || v === "천안";
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
