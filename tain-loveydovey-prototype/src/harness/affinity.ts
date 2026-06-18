// ============================================================
// 호감도 채점 (보조 LLM 패턴)
// ============================================================
// 핵심 하네스 패턴: "메인 응답"과 "상태 업데이트"를 분리한다.
// 캐릭터 응답은 비싼 모델(Opus)로, 호감도 채점은 싼 모델(Haiku)로 한다.
//
// 왜 LLM으로 채점하나? 규칙 기반("좋아"라는 단어가 있으면 +10)은
// 맥락을 못 읽는다. 비꼬는 "와 진짜 좋네^^"를 못 거른다.
// 작은 LLM에게 "이 대화로 호감도가 얼마나 변했나"를 판단시키는 게 훨씬 낫다.
//
// 이게 하네스의 "judge(심판) 패턴" — LLM을 평가자로 쓰는 기법이다.

import { client, UTILITY_MODEL } from "./client";
import type { Turn } from "./types";

/**
 * 직전 유저 발화 + 캐릭터 응답을 보고 호감도 변화량(-30 ~ +30)을 반환.
 * 실패하면 0(중립)으로 폴백 — 보조 작업은 절대 메인 플로우를 막으면 안 된다.
 */
export async function scoreAffinityDelta(
  userText: string,
  characterReply: string,
): Promise<number> {
  try {
    const res = await client.messages.create({
      model: UTILITY_MODEL,
      max_tokens: 16,
      system:
        "너는 연애 시뮬레이션의 호감도 채점기다. 유저의 말이 캐릭터의 호감을 " +
        "얼마나 변화시켰는지 -30(매우 무례/냉담)에서 +30(매우 다정/매력적) 사이 " +
        "정수 하나로만 답한다. 평범하면 0~5. 숫자만 출력하라.",
      messages: [
        {
          role: "user",
          content: `유저: ${userText}\n캐릭터: ${characterReply}\n\n호감도 변화량(정수):`,
        },
      ],
    });

    const block = res.content.find((b) => b.type === "text");
    const raw = block && block.type === "text" ? block.text : "0";
    const n = parseInt(raw.replace(/[^-0-9]/g, ""), 10);
    if (Number.isNaN(n)) return 0;
    // 안전 클램프 — LLM이 범위를 벗어난 값을 줄 수 있으므로 하네스가 가둔다
    return Math.max(-30, Math.min(30, n));
  } catch {
    return 0; // 채점 실패가 대화를 망치면 안 된다
  }
}

/** 점수를 0~1000 범위로 가둔다 */
export function clampScore(score: number): number {
  return Math.max(0, Math.min(1000, score));
}
