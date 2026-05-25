// 상명대학교 캠퍼스별 학과/전공 데이터 (회원가입 학과 선택용)
// level: 학부 | 학과 | 전공
// 서울캠 목록은 공식 사이트/나무위키 기준으로 정리(학과 개편 시 이 파일만 교체).

import type { Campus } from "./campus";

export type DeptLevel = "학부" | "학과" | "전공";

export type DeptItem = {
  name: string;
  level: DeptLevel;
};

export type DeptCollege = {
  college: string;
  items: DeptItem[];
};

const CHEONAN: DeptCollege[] = [
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

const SEOUL: DeptCollege[] = [
  {
    college: "자유전공학부대학",
    items: [{ name: "자유전공학부", level: "학부" }],
  },
  {
    college: "인문사회과학대학",
    items: [
      { name: "인문콘텐츠학부", level: "학부" },
      { name: "역사콘텐츠전공", level: "전공" },
      { name: "지적재산권전공", level: "전공" },
      { name: "문헌정보학전공", level: "전공" },
      { name: "한일문화콘텐츠전공", level: "전공" },
      { name: "공간환경학부", level: "학부" },
      { name: "행정학부", level: "학부" },
      { name: "가족복지학과", level: "학과" },
      { name: "국가안보학과", level: "학과" },
    ],
  },
  {
    college: "사범대학",
    items: [
      { name: "교육학과", level: "학과" },
      { name: "국어교육과", level: "학과" },
      { name: "영어교육과", level: "학과" },
      { name: "수학교육과", level: "학과" },
    ],
  },
  {
    college: "경영경제대학",
    items: [
      { name: "경제금융학부", level: "학부" },
      { name: "경영학부", level: "학부" },
      { name: "글로벌경영학과", level: "학과" },
      { name: "융합경영학과", level: "학과" },
    ],
  },
  {
    college: "융합공과대학",
    items: [
      { name: "지능·데이터융합학부", level: "학부" },
      { name: "휴먼AI공학전공", level: "전공" },
      { name: "핀테크전공", level: "전공" },
      { name: "빅데이터융합전공", level: "전공" },
      { name: "스마트생산전공", level: "전공" },
      { name: "SW융합학부", level: "학부" },
      { name: "컴퓨터과학전공", level: "전공" },
      { name: "전기공학전공", level: "전공" },
      { name: "게임전공", level: "전공" },
      { name: "애니메이션전공", level: "전공" },
      { name: "생명화학공학부", level: "학부" },
      { name: "생명공학전공", level: "전공" },
      { name: "화학에너지공학전공", level: "전공" },
      { name: "화공신소재전공", level: "전공" },
      { name: "식품영양학전공", level: "전공" },
    ],
  },
  {
    college: "문화예술대학",
    items: [
      { name: "의류학과", level: "학과" },
      { name: "스포츠무용학부", level: "학부" },
      { name: "스포츠건강관리전공", level: "전공" },
      { name: "무용예술전공", level: "전공" },
      { name: "미술학부", level: "학부" },
      { name: "조형예술전공", level: "전공" },
      { name: "생활예술전공", level: "전공" },
      { name: "음악학부", level: "학부" },
      { name: "피아노전공", level: "전공" },
      { name: "성악전공", level: "전공" },
      { name: "뉴미디어작곡전공", level: "전공" },
      { name: "관현악전공", level: "전공" },
    ],
  },
];

export const DEPARTMENTS_BY_CAMPUS: Record<Campus, DeptCollege[]> = {
  서울: SEOUL,
  천안: CHEONAN,
};

// 단과대 구분용 컬러 도트 (양 캠퍼스 단과대 합본)
export const COLLEGE_COLORS: Record<string, string> = {
  // 공통
  자유전공학부대학: "#8b5cf6",
  // 천안
  글로벌인문학부대학: "#3b82f6",
  디자인대학: "#ec4899",
  예술대학: "#f59e0b",
  융합기술대학: "#10b981",
  공과대학: "#ef4444",
  // 서울
  인문사회과학대학: "#3b82f6",
  사범대학: "#0ea5e9",
  경영경제대학: "#10b981",
  융합공과대학: "#ef4444",
  문화예술대학: "#f59e0b",
};

// 검색 필터: 해당 캠퍼스 안에서 학과명 또는 단과대명에 query 포함된 항목만 그룹 유지
export function filterDepartments(campus: Campus, query: string): DeptCollege[] {
  const list = DEPARTMENTS_BY_CAMPUS[campus] ?? [];
  const q = query.trim().toLowerCase();
  if (!q) return list;
  return list
    .map((g) => {
      const collegeMatch = g.college.toLowerCase().includes(q);
      const items = collegeMatch
        ? g.items
        : g.items.filter((it) => it.name.toLowerCase().includes(q));
      return { college: g.college, items };
    })
    .filter((g) => g.items.length > 0);
}
