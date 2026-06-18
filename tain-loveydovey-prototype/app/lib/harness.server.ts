// ============================================================
// 하네스 브리지 (웹 ↔ src/harness 엔진)
// ============================================================
// CLI에서 쓰던 하네스 엔진을 그대로 웹에서 호출한다. 엔진은 재사용,
// 껍데기(UI)만 바뀌는 구조 — "하네스는 UI와 분리된다"는 핵심 원칙.
//
// ANTHROPIC_API_KEY가 없으면 '데모 모드'로 캔버스가 동작하게 한다
// (키 없이도 UI/플로우를 볼 수 있게). 키가 있으면 진짜 LLM을 호출.

import { chat, type ChatResult } from "../../src/harness/engine";
import { scoreToLevel } from "../../src/harness/persona";
import { CHAT_MODES } from "../../src/harness/modes";
import { clampScore } from "../../src/harness/affinity";
import {
  AFFINITY_LABELS,
  type SessionState,
  type Turn,
} from "../../src/harness/types";

export { scoreToLevel, AFFINITY_LABELS, CHAT_MODES };
export const HAS_KEY = Boolean(process.env.ANTHROPIC_API_KEY);

// 키가 없을 때 쓰는 캐릭터별 데모 응답 (UI 시연용)
const DEMO_LINES: Record<string, string[]> = {
  yujin: ["...뭐야, 갑자기. 별 말을 다 하네.", "흥, 그런 말 들으려고 온 거 아니거든. ...고맙긴 하다."],
  haru: ["헤헤 진짜? 나도 너랑 얘기하는 거 완전 좋아! 🥰", "오늘 하루도 너 덕분에 반짝반짝하다 ✨"],
  doyun: ["...그렇게 말해주니 기분이 좋네요. 따뜻한 거 한 잔 더 드릴까요?", "당신은 가끔 사람을 무방비하게 만드는 재주가 있어요."],
};

/**
 * 한 턴 진행. 키 있으면 진짜 LLM, 없으면 데모 응답.
 * 반환 형태는 엔진의 ChatResult와 동일하게 맞춘다.
 */
export async function sendMessage(
  state: SessionState,
  text: string,
): Promise<ChatResult> {
  if (HAS_KEY) {
    return chat(state, text);
  }

  // --- 데모 모드 (키 없음) ---
  const modeCfg = CHAT_MODES[state.mode];
  if (state.jam < modeCfg.jamCost) {
    return {
      state,
      reply: `(잼이 부족해요. ${state.mode} 모드는 ${modeCfg.jamCost}잼 필요 · 현재 ${state.jam}잼)`,
      affinityDelta: 0,
    };
  }

  const lines = DEMO_LINES[state.character.id] ?? ["(데모 응답입니다. 실제 대화는 API 키 설정 후 가능해요.)"];
  const reply = lines[state.recentTurns.length % lines.length];
  const delta = 8; // 데모: 매 턴 살짝 상승
  const prevLevel = scoreToLevel(state.affinityScore);
  const newScore = clampScore(state.affinityScore + delta);
  const newLevel = scoreToLevel(newScore);

  const newTurns: Turn[] = [
    ...state.recentTurns,
    { role: "user", text },
    { role: "assistant", text: reply },
  ];

  let levelChange: string | undefined;
  if (newLevel > prevLevel) levelChange = `💗 관계가 깊어졌어요! → Lv.${newLevel}`;

  return {
    state: {
      ...state,
      affinityScore: newScore,
      recentTurns: newTurns,
      jam: state.jam - modeCfg.jamCost,
    },
    reply,
    affinityDelta: delta,
    levelChange,
  };
}
