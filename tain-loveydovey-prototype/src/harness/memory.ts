// ============================================================
// 메모리 압축 (컨텍스트 관리 / "메모리북")
// ============================================================
// LLM의 컨텍스트 창은 유한하고, 길수록 비싸고 느리다.
// 대화가 길어지면 전체 기록을 매번 넣을 수 없다.
// 해결책: 최근 N턴은 원문 그대로(생생함 유지), 그보다 오래된 건
// 요약문("메모리북")으로 압축해서 시스템 프롬프트에 넣는다.
//
// 이게 "compaction(압축)" 패턴. 러비더비에서 "캐릭터가 옛날 대화를
// 기억해 먼저 꺼낸다" 같은 정서적 보상이 바로 이 메모리북에서 나온다.
// 동시에 추론 비용도 통제한다 — 기획과 엔지니어링이 만나는 지점.

import { client, UTILITY_MODEL } from "./client.js";
import type { Turn } from "./types.js";

/** 이 턴 수를 넘으면 오래된 절반을 메모리북으로 압축한다 */
export const RECENT_WINDOW = 8;

/**
 * 기존 메모리북 + 압축 대상 턴들을 합쳐 새 메모리북을 만든다.
 * 요약은 싼 모델로. 실패 시 기존 메모리북 유지(폴백).
 */
export async function compactMemory(
  existingMemory: string,
  turnsToCompact: Turn[],
): Promise<string> {
  if (turnsToCompact.length === 0) return existingMemory;

  const transcript = turnsToCompact
    .map((t) => `${t.role === "user" ? "유저" : "캐릭터"}: ${t.text}`)
    .join("\n");

  try {
    const res = await client.messages.create({
      model: UTILITY_MODEL,
      max_tokens: 400,
      system:
        "너는 연애 시뮬레이션의 '기억 정리원'이다. 기존 요약과 새 대화를 합쳐, " +
        "둘 사이에 있었던 중요한 사건·약속·감정·호칭 변화를 간결한 한국어 " +
        "불릿 요약으로 갱신하라. 사소한 잡담은 버리고, 관계에 영향을 준 것만 남겨라.",
      messages: [
        {
          role: "user",
          content: `[기존 기억]\n${existingMemory || "(없음)"}\n\n[새 대화]\n${transcript}\n\n[갱신된 기억]`,
        },
      ],
    });
    const block = res.content.find((b) => b.type === "text");
    return block && block.type === "text" ? block.text.trim() : existingMemory;
  } catch {
    return existingMemory;
  }
}
