// ============================================================
// 시스템 프롬프트 조립 (하네스의 심장)
// ============================================================
// 캐릭터가 "살아있다"고 느끼게 하는 건 모델이 아니라, 매 호출마다
// 하네스가 조립해 넣는 시스템 프롬프트다. 여기서 4가지 상태를 합친다:
//   1) 페르소나 (캐릭터가 누구인가)
//   2) 관계 단계 (지금 유저와 어떤 사이인가 — 호감도)
//   3) 채팅 모드 (어떤 톤/길이로 말할 것인가)
//   4) 메모리북 (과거에 무슨 일이 있었나 — 장기 기억)
//
// 이 "상태 → 프롬프트" 변환이 하네스 엔지니어링의 가장 본질적인 작업이다.

import {
  AFFINITY_LABELS,
  type AffinityLevel,
  type ChatMode,
  type Character,
} from "./types";
import { CHAT_MODES } from "./modes";

/** 호감도 점수(0~1000) → 단계(1~5) 변환 */
export function scoreToLevel(score: number): AffinityLevel {
  if (score >= 800) return 5; // 결혼
  if (score >= 500) return 4; // 연인
  if (score >= 250) return 3; // 썸
  if (score >= 80) return 2; // 친구
  return 1; // 아는 사이
}

/** 단계별 행동 지침 — 관계가 깊어질수록 캐릭터의 태도가 변한다 */
const RELATION_GUIDE: Record<AffinityLevel, string> = {
  1: "아직 서먹한 사이. 예의는 있지만 거리감이 있고, 사적인 얘기는 잘 안 한다.",
  2: "편한 친구 사이. 농담도 하고 관심을 보이지만 선은 지킨다.",
  3: "썸 타는 사이. 은근한 호감을 내비치고, 가끔 설레는 말을 던진다.",
  4: "연인 사이. 다정하고 애정 표현이 자연스럽다. 상대를 챙긴다.",
  5: "부부 사이. 깊은 신뢰와 일상의 친밀함이 묻어난다.",
};

/**
 * 시스템 프롬프트를 조립한다.
 * 주의: 이 문자열은 매 턴 바뀐다(호감도/메모리가 변하므로).
 * → 프롬프트 캐싱을 적용한다면 "안 바뀌는 부분(페르소나)"을 앞에,
 *   "바뀌는 부분(호감도/메모리)"을 뒤에 배치해야 캐시 적중률이 오른다.
 *   (지금은 학습용이라 캐싱 미적용 — 나중 레슨에서 다룬다)
 */
export function buildSystemPrompt(args: {
  character: Character;
  affinityScore: number;
  mode: ChatMode;
  memoryBook: string;
}): string {
  const { character, affinityScore, mode, memoryBook } = args;
  const level = scoreToLevel(affinityScore);
  const modeCfg = CHAT_MODES[mode];

  return [
    `너는 "${character.name}"라는 캐릭터를 연기한다.`,
    `[컨셉] ${character.concept}`,
    `[성격·말투]\n${character.persona}`,
    ``,
    `[현재 관계: ${AFFINITY_LABELS[level]} (호감도 ${affinityScore}/1000)]`,
    RELATION_GUIDE[level],
    ``,
    `[대화 스타일: ${mode} 모드]`,
    modeCfg.styleHint,
    ``,
    memoryBook
      ? `[지금까지의 기억]\n${memoryBook}`
      : `[지금까지의 기억] (아직 특별한 기억 없음)`,
    ``,
    `[규칙]`,
    `- 항상 "${character.name}"로서 1인칭으로 말한다. AI라는 사실을 절대 언급하지 않는다.`,
    `- 관계 단계와 호감도에 어울리는 태도를 유지한다. 갑자기 과한 애정 표현을 하지 않는다.`,
    `- 한국어로 자연스럽게 대화한다.`,
  ].join("\n");
}
