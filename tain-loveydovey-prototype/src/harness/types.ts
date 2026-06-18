// ============================================================
// 하네스 타입 정의
// ============================================================
// "하네스(harness)"는 LLM 자체가 아니라, LLM을 둘러싼 모든 것이다.
// 이 파일은 하네스가 다루는 "상태(state)"를 정의한다.
// LLM은 stateless(무상태)다 — 매 호출마다 과거를 기억 못 한다.
// 따라서 "관계가 이어진다는 느낌"은 전부 하네스가 상태를 들고 다니며
// 매번 프롬프트에 주입해서 만들어내는 착시다. 이게 핵심 통찰.

/** 캐릭터(페르소나) 정의 — 유저/크리에이터가 만드는 자캐 */
export interface Character {
  id: string;
  name: string;
  /** 한 줄 컨셉 (예: "츤데레 검도부 선배") */
  concept: string;
  /** 말투/성격 상세 — 시스템 프롬프트의 핵심 재료 */
  persona: string;
  /** 첫 인사말 (대화 시작 시 캐릭터가 먼저 던지는 말) */
  greeting: string;
}

/** 호감도 단계 — 러비더비의 핵심 게임 루프 */
export type AffinityLevel = 1 | 2 | 3 | 4 | 5;

export const AFFINITY_LABELS: Record<AffinityLevel, string> = {
  1: "아는 사이",
  2: "친구",
  3: "썸",
  4: "연인",
  5: "결혼",
};

/** 채팅 모드 — 모드마다 출력 길이/스타일/비용(잼)이 다르다 */
export type ChatMode = "찰떡" | "장문" | "스토리" | "짜릿";

export interface ChatModeConfig {
  label: ChatMode;
  /** 이 모드의 스타일 지침 (시스템 프롬프트에 주입) */
  styleHint: string;
  /** 응답 최대 토큰 */
  maxTokens: number;
  /** 메시지 1건당 소모 잼 (BM 시뮬레이션) */
  jamCost: number;
  /** 이 모드를 열 수 있는 최소 호감도 단계 (가드레일) */
  minLevel?: AffinityLevel;
  /** 성인 전용 모드 여부 (안전장치 대상) */
  adult?: boolean;
}

/** 대화 한 턴 */
export interface Turn {
  role: "user" | "assistant";
  text: string;
}

/**
 * 세션 상태 — 하네스가 들고 다니는 "기억의 전부".
 * 실제 서비스에선 이게 DB(Supabase 등)에 저장된다.
 */
export interface SessionState {
  character: Character;
  mode: ChatMode;
  /** 0 ~ 1000 점. 단계 임계값을 넘으면 레벨업/다운 */
  affinityScore: number;
  /** 최근 대화 (컨텍스트 윈도우). 오래되면 memoryBook으로 압축됨 */
  recentTurns: Turn[];
  /** 압축된 장기 기억 ("메모리북") — 요약문 */
  memoryBook: string;
  /** 남은 잼 (재화) */
  jam: number;
  /** 직전 턴에 생성된 캐릭터 속마음(병렬 출력) — UI '속마음 보기'용 */
  lastInnerThought?: string;
}
