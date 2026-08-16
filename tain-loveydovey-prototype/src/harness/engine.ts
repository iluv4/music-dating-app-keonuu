// ============================================================
// 엔진 — 하네스의 메인 루프 (고도화판)
// ============================================================
// 한 번의 chat() 호출 안에서 하네스가 하는 일:
//
//   0. 입력 가드 + 능력 게이팅   ← guardrails.ts (안전·BM)
//   1. 잼(재화) 확인             ← BM 가드
//   2. 시스템 프롬프트 조립       ← persona.ts (캐시 분리: STABLE/DYNAMIC)
//   3. 컨텍스트(최근 턴) 구성     ← 메모리 윈도우
//   4. 메인 모델 호출 (스트리밍)   ← 캐릭터 응답 (Opus, 캐싱 적용)
//   5. 호감도 채점 + 속마음 (병렬) ← affinity.ts + innerthought.ts (Haiku)
//   6. 메모리 압축 (필요시)       ← memory.ts (compaction)
//   7. 새 상태 반환              ← DB에 저장될 상태
//
// LLM 호출은 여러 단계 중 일부일 뿐. 나머지가 전부 하네스다.

import { client, MAIN_MODEL } from "./client";
import { buildStableSystem, buildDynamicSystem, scoreToLevel } from "./persona";
import { CHAT_MODES } from "./modes";
import { scoreAffinityDelta, clampScore } from "./affinity";
import { generateInnerThought } from "./innerthought";
import { compactMemory, RECENT_WINDOW } from "./memory";
import { canUseMode, checkInput } from "./guardrails";
import type { SessionState, Turn } from "./types";

export interface ChatResult {
  state: SessionState;
  reply: string;
  /** 이번 턴 호감도 변화량 */
  affinityDelta: number;
  /** 레벨업/다운이 일어났으면 알림 문구 */
  levelChange?: string;
  /** 캐릭터 속마음 (병렬 생성) */
  innerThought?: string;
  /** 가드레일에 막혔으면 true (정상 대화 아님) */
  blocked?: boolean;
}

export async function chat(
  state: SessionState,
  userText: string,
  onToken?: (t: string) => void,
): Promise<ChatResult> {
  const level = scoreToLevel(state.affinityScore);
  const modeCfg = CHAT_MODES[state.mode];

  // --- 0. 입력 가드 (비싼 호출 전에 거른다) ---
  const input = checkInput(userText);
  if (!input.ok) {
    return { state, reply: `⚠️ ${input.reason}`, affinityDelta: 0, blocked: true };
  }

  // --- 0. 능력 게이팅 (짜릿모드는 연인 이상에서만) ---
  const gate = canUseMode(state.mode, level);
  if (!gate.ok) {
    return { state, reply: `🔒 ${gate.reason}`, affinityDelta: 0, blocked: true };
  }

  // --- 1. 잼 가드 (BM) ---
  if (state.jam < modeCfg.jamCost) {
    return {
      state,
      reply: `(잼이 부족해요. ${state.mode} 모드는 ${modeCfg.jamCost}잼이 필요해요. 현재 ${state.jam}잼)`,
      affinityDelta: 0,
      blocked: true,
    };
  }

  // --- 2. 시스템 프롬프트 조립 (캐시 분리) ---
  // STABLE(페르소나)에 cache_control → 같은 캐릭터 대화 동안 캐시에서 ~0.1x로 읽힘.
  // DYNAMIC(호감도/모드/메모리)은 캐시 뒤에 둬서 매 턴 바뀌어도 STABLE 캐시는 유지.
  const system = [
    {
      type: "text" as const,
      text: buildStableSystem(state.character),
      cache_control: { type: "ephemeral" as const },
    },
    {
      type: "text" as const,
      text: buildDynamicSystem({
        affinityScore: state.affinityScore,
        mode: state.mode,
        memoryBook: state.memoryBook,
      }),
    },
  ];

  // --- 3. 컨텍스트 구성 ---
  const messages = [
    ...state.recentTurns.map((t) => ({ role: t.role, content: t.text })),
    { role: "user" as const, content: userText },
  ];

  // --- 4. 메인 모델 호출 (스트리밍) ---
  const stream = client.messages.stream({
    model: MAIN_MODEL,
    max_tokens: modeCfg.maxTokens,
    system,
    messages,
  });
  if (onToken) stream.on("text", (delta) => onToken(delta));
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

  // --- 5. 호감도 채점 + 속마음 (병렬 — 둘 다 reply 기반, 동시에 실행) ---
  const [delta, innerThought] = await Promise.all([
    scoreAffinityDelta(userText, reply),
    generateInnerThought(state.character, userText, reply),
  ]);
  const prevLevel = level;
  const newScore = clampScore(state.affinityScore + delta);
  const newLevel = scoreToLevel(newScore);

  let levelChange: string | undefined;
  if (newLevel > prevLevel) levelChange = `💗 관계가 깊어졌어요! → Lv.${newLevel}`;
  else if (newLevel < prevLevel) levelChange = `💔 사이가 멀어졌어요... → Lv.${newLevel}`;

  // --- 6. 메모리 압축 (윈도우 초과 시) ---
  let memoryBook = state.memoryBook;
  let recentTurns = newTurns;
  if (newTurns.length > RECENT_WINDOW) {
    const splitAt = newTurns.length - RECENT_WINDOW;
    const toCompact = newTurns.slice(0, splitAt);
    recentTurns = newTurns.slice(splitAt);
    memoryBook = await compactMemory(state.memoryBook, toCompact);
  }

  // --- 7. 새 상태 반환 ---
  return {
    state: {
      ...state,
      affinityScore: newScore,
      recentTurns,
      memoryBook,
      jam: newJam,
      lastInnerThought: innerThought,
    },
    reply,
    affinityDelta: delta,
    levelChange,
    innerThought,
  };
}
