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

// ── 프롬프트 캐싱을 위한 분리 ──────────────────────────────
// 프롬프트 캐싱은 "프리픽스 매칭"이다. 앞부분이 한 글자라도 바뀌면
// 그 뒤 캐시가 전부 무효화된다. 그래서 시스템 프롬프트를 두 조각으로 나눈다:
//   ① STABLE(안 바뀌는 것): 페르소나 + 규칙 → 캐시 대상 (cache_control)
//   ② DYNAMIC(매 턴 바뀌는 것): 호감도 + 모드 + 메모리북 → 캐시 뒤에 배치
// engine.ts가 system을 [STABLE(캐시), DYNAMIC] 두 블록으로 보내면,
// 같은 캐릭터로 대화가 이어지는 동안 STABLE은 캐시에서 ~0.1x 가격에 읽힌다.

/** ① 안 바뀌는 부분 — 캐시 대상 (페르소나·규칙) */
export function buildStableSystem(character: Character): string {
  return [
    `너는 "${character.name}"라는 캐릭터를 연기한다.`,
    `[컨셉] ${character.concept}`,
    `[성격·말투]\n${character.persona}`,
    ``,
    `[규칙]`,
    `- 항상 "${character.name}"로서 1인칭으로 말한다. AI라는 사실을 절대 언급하지 않는다.`,
    `- 관계 단계와 호감도에 어울리는 태도를 유지한다. 갑자기 과한 애정 표현을 하지 않는다.`,
    `- 한국어로 자연스럽게 대화한다.`,
  ].join("\n");
}

/** ② 매 턴 바뀌는 부분 — 캐시 뒤에 배치 (호감도·모드·메모리) */
export function buildDynamicSystem(args: {
  affinityScore: number;
  mode: ChatMode;
  memoryBook: string;
}): string {
  const { affinityScore, mode, memoryBook } = args;
  const level = scoreToLevel(affinityScore);
  const modeCfg = CHAT_MODES[mode];

  return [
    `[현재 관계: ${AFFINITY_LABELS[level]} (호감도 ${affinityScore}/1000)]`,
    RELATION_GUIDE[level],
    ``,
    `[대화 스타일: ${mode} 모드]`,
    modeCfg.styleHint,
    ``,
    memoryBook
      ? `[지금까지의 기억]\n${memoryBook}`
      : `[지금까지의 기억] (아직 특별한 기억 없음)`,
  ].join("\n");
}

/** 두 조각을 합친 전체 프롬프트 (수업/디버깅용). 실제 호출은 분리 버전 사용. */
export function buildSystemPrompt(args: {
  character: Character;
  affinityScore: number;
  mode: ChatMode;
  memoryBook: string;
}): string {
  return (
    buildStableSystem(args.character) +
    "\n\n" +
    buildDynamicSystem(args)
  );
}
