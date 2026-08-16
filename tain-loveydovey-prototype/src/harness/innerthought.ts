// ============================================================
// 속마음 (병렬 멀티출력)
// ============================================================
// 러비더비 시그니처 "His True Thoughts(속마음)" — 캐릭터가 겉으로 한 말
// 뒤의 속내를 보여주는 기능. 하네스 관점에선 "한 턴에서 여러 출력을
// 만든다"는 멀티출력 패턴이다.
//
// 핵심: 메인 응답(Opus)과 별개로, 속마음은 싼 모델(Haiku)로 "병렬" 생성한다.
//   - 비용↓ (보조 출력에 비싼 모델을 안 씀)
//   - 지연↓ (호감도 채점과 함께 Promise.all로 동시 실행)
// → engine.ts에서 affinity 채점과 같이 병렬로 돌린다.

import { client, UTILITY_MODEL } from "./client";
import type { Character } from "./types";

/**
 * 캐릭터가 방금 한 말 뒤의 속마음 한 줄을 생성.
 * 실패하면 빈 문자열(보조 출력은 메인을 막지 않는다).
 */
export async function generateInnerThought(
  character: Character,
  userText: string,
  reply: string,
): Promise<string> {
  try {
    const res = await client.messages.create({
      model: UTILITY_MODEL,
      max_tokens: 80,
      system:
        `너는 "${character.name}"(${character.concept})의 속마음을 대신 말해주는 내레이터다. ` +
        `방금 캐릭터가 한 말 뒤에 숨은 진짜 속마음을 1문장으로, 캐릭터 1인칭으로 ` +
        `생생하게 표현하라. 따옴표 없이 속마음만 출력한다.`,
      messages: [
        {
          role: "user",
          content: `유저: ${userText}\n${character.name}: ${reply}\n\n(${character.name}의 속마음:)`,
        },
      ],
    });
    const block = res.content.find((b) => b.type === "text");
    return block && block.type === "text" ? block.text.trim() : "";
  } catch {
    return "";
  }
}
