// 상명대학교 천안캠퍼스 전체 학과/전공 데이터 (회원가입 학과 선택용)
// level: 학부 | 학과 | 전공

export type DeptLevel = "학부" | "학과" | "전공";

export type DeptItem = {
  name: string;
  level: DeptLevel;
};

export type DeptCollege = {
  college: string;
  items: DeptItem[];
};

export const SCHOOL_NAME = "상명대학교 천안";

export const DEPARTMENTS: DeptCollege[] = [
  {
    college: "자유전공학부대학",
    items: [{ name: "자유전공학부", level: "학부" }],
  },
  {
    college: "글로벌인문학부대학",
    items: [
      { name: "글로벌지역학부", level: "학부" },
      { name: "한국언어문화전공", level: "전공" },
      { name: "일본어권지역학전공", level: "전공" },
      { name: "중국어권지역학전공", level: "전공" },
      { name: "영어권지역학전공", level: "전공" },
      { name: "프랑스어권지역학전공", level: "전공" },
      { name: "독일어권지역학전공", level: "전공" },
      { name: "러시아·중앙아시아지역학전공", level: "전공" },
    ],
  },
  {
    college: "디자인대학",
    items: [
      { name: "디자인학부", level: "학부" },
      { name: "커뮤니케이션디자인전공", level: "전공" },
      { name: "패션디자인전공", level: "전공" },
      { name: "텍스타일디자인전공", level: "전공" },
      { name: "스페이스디자인전공", level: "전공" },
      { name: "세라믹디자인전공", level: "전공" },
      { name: "인더스트리얼디자인전공", level: "전공" },
      { name: "AR·VR미디어디자인전공", level: "전공" },
    ],
  },
  {
    college: "예술대학",
    items: [
      { name: "예술학부", level: "학부" },
      { name: "영화영상전공", level: "전공" },
      { name: "연극전공", level: "전공" },
      { name: "무대미술전공", level: "전공" },
      { name: "사진영상미디어전공", level: "전공" },
      { name: "디지털만화영상전공", level: "전공" },
      { name: "문화예술경영전공", level: "전공" },
      { name: "AI미디어콘텐츠전공", level: "전공" },
    ],
  },
  {
    college: "융합기술대학",
    items: [
      { name: "글로벌금융경영학부", level: "학부" },
      { name: "식품공학과", level: "학과" },
      { name: "그린스마트시티학과", level: "학과" },
      { name: "간호학과", level: "학과" },
      { name: "바이오푸드테크학과", level: "학과" },
      { name: "스포츠융합학부", level: "학부" },
      { name: "스포츠경영전공", level: "전공" },
      { name: "사회체육전공", level: "전공" },
    ],
  },
  {
    college: "공과대학",
    items: [
      { name: "전자공학과", level: "학과" },
      { name: "소프트웨어학과", level: "학과" },
      { name: "스마트정보통신공학과", level: "학과" },
      { name: "경영공학과", level: "학과" },
      { name: "그린화학공학과", level: "학과" },
      { name: "건설시스템공학과", level: "학과" },
      { name: "정보보안공학과", level: "학과" },
      { name: "시스템반도체공학과", level: "학과" },
      { name: "휴먼지능로봇공학과", level: "학과" },
      { name: "지능형로봇학과", level: "학과" },
      { name: "AI모빌리티공학과", level: "학과" },
      { name: "스마트IT융합공학과", level: "학과" },
    ],
  },
];

// 단과대 구분용 컬러 도트
export const COLLEGE_COLORS: Record<string, string> = {
  자유전공학부대학: "#8b5cf6",
  글로벌인문학부대학: "#3b82f6",
  디자인대학: "#ec4899",
  예술대학: "#f59e0b",
  융합기술대학: "#10b981",
  공과대학: "#ef4444",
};

// 검색 필터: 학과명 또는 단과대명에 query 포함된 항목만 그룹 유지
export function filterDepartments(query: string): DeptCollege[] {
  const q = query.trim().toLowerCase();
  if (!q) return DEPARTMENTS;
  return DEPARTMENTS.map((g) => {
    const collegeMatch = g.college.toLowerCase().includes(q);
    const items = collegeMatch
      ? g.items
      : g.items.filter((it) => it.name.toLowerCase().includes(q));
    return { college: g.college, items };
  }).filter((g) => g.items.length > 0);
}
