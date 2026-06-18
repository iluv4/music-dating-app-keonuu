// ============================================================
// 엔진 — 하네스의 메인 루프
// ============================================================
// 한 번의 chat() 호출 안에서 하네스가 하는 일의 전체 흐름:
//
//   1. 잼(재화) 확인           ← BM 가드
//   2. 시스템 프롬프트 조립     ← persona.ts (상태 → 프롬프트)
//   3. 컨텍스트(최근 턴) 구성   ← 메모리 윈도우
//   4. 메인 모델 호출 (스트리밍) ← 캐릭터 응답 생성
//   5. 호감도 갱신             ← affinity.ts (보조 LLM)
//   6. 메모리 압축 (필요시)     ← memory.ts (compaction)
//   7. 새 상태 반환            ← DB에 저장될 상태
//
// LLM 호출은 이 7단계 중 "한 단계"일 뿐이다. 나머지가 전부 하네스다.

import { client, MAIN_MODEL } from "./client.js";
import { buildSystemPrompt, scoreToLevel } from "./persona.js";
import { CHAT_MODES } from "./modes.js";
import { scoreAffinityDelta, clampScore } from "./affinity.js";
import { compactMemory, RECENT_WINDOW } from "./memory.js";
import type { SessionState, Turn } from "./types.js";

export interface ChatResult {
  state: SessionState;
  reply: string;
  /** 이번 턴 호감도 변화량 */
  affinityDelta: number;
  /** 레벨업/다운이 일어났으면 알림 문구 */
  levelChange?: string;
}

/**
 * 한 턴 진행.
 * onToken: 스트리밍 토큰 콜백 (CLI에서 실시간 출력용).
 *   스트리밍은 단순 UX가 아니라, 긴 응답에서 타임아웃을 막는 하네스 기법이다.
 */
export async function chat(
  state: SessionState,
  userText: string,
  onToken?: (t: string) => void,
): Promise<ChatResult> {
  const modeCfg = CHAT_MODES[state.mode];

  // --- 1. 잼 가드 (BM) ---
  if (state.jam < modeCfg.jamCost) {
    return {
      state,
      reply: `(잼이 부족해요. ${state.mode} 모드는 ${modeCfg.jamCost}잼이 필요해요. 현재 ${state.jam}잼)`,
      affinityDelta: 0,
    };
  }

  // --- 2. 시스템 프롬프트 조립 (상태 → 프롬프트) ---
  const system = buildSystemPrompt({
    character: state.character,
    affinityScore: state.affinityScore,
    mode: state.mode,
    memoryBook: state.memoryBook,
  });

  // --- 3. 컨텍스트 구성: 최근 턴 + 이번 유저 발화 ---
  const messages = [
    ...state.recentTurns.map((t) => ({ role: t.role, content: t.text })),
    { role: "user" as const, content: userText },
  ];

  // --- 4. 메인 모델 호출 (스트리밍) ---
  // claude-opus-4-8: thinking 파라미터를 생략하면 사고 없이 빠르게 응답.
  //   캐릭터 채팅은 속도가 중요하므로 의도적으로 thinking을 끈다.
  const stream = client.messages.stream({
    model: MAIN_MODEL,
    max_tokens: modeCfg.maxTokens,
    system,
    messages,
  });

  if (onToken) {
    stream.on("text", (delta) => onToken(delta));
  }
  const finalMsg = await stream.finalMessage();
  const replyBlock = finalMsg.content.find((b) => b.type === "text");
  const reply = replyBlock && replyBlock.type === "text" ? replyBlock.text : "";

  // --- 잼 차감 + 대화 기록 추가 ---
  const newJam = state.jam - modeCfg.jamCost;
  const newTurns: Turn[] = [
    ...state.recentTurns,
    { role: "user", text: userText },
    { role: "assistant", text: reply },
  ];

  // --- 5. 호감도 갱신 (보조 LLM, 메인 응답과 병렬 가능) ---
  const prevLevel = scoreToLevel(state.affinityScore);
  const delta = await scoreAffinityDelta(userText, reply);
  const newScore = clampScore(state.affinityScore + delta);
  const newLevel = scoreToLevel(newScore);

  let levelChange: string | undefined;
  if (newLevel > prevLevel) levelChange = `💗 관계가 깊어졌어요! → Lv.${newLevel}`;
  else if (newLevel < prevLevel) levelChange = `💔 사이가 멀어졌어요... → Lv.${newLevel}`;

  // --- 6. 메모리 압축 (윈도우 초과 시) ---
  let memoryBook = state.memoryBook;
  let recentTurns = newTurns;
  if (newTurns.length > RECENT_WINDOW) {
    // 오래된 절반을 압축, 최근 절반은 원문 유지
    const splitAt = newTurns.length - RECENT_WINDOW;
    const toCompact = newTurns.slice(0, splitAt);
    recentTurns = newTurns.slice(splitAt);
    memoryBook = await compactMemory(state.memoryBook, toCompact);
  }

  return {
    state: {
      ...state,
      affinityScore: newScore,
      recentTurns,
      memoryBook,
      jam: newJam,
    },
    reply,
    affinityDelta: delta,
    levelChange,
  };
}
