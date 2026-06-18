// ============================================================
// 🧪 평가 하네스 (eval) — npm run eval
// ============================================================
// "캐릭터가 페르소나를 유지하는가?"를 사람이 매번 눈으로 확인할 순 없다.
// 하네스의 마지막 조각은 "자동 평가(eval)"다. LLM을 심판(judge)으로 써서
// 출력 품질을 점수화하면, 프롬프트를 바꿨을 때 좋아졌는지 나빠졌는지
// 객관적으로 알 수 있다. (PM 관점: "이 변경이 지표를 움직였나"의 미니 버전)
//
// 여기선 차유진(츤데레·반말)에게 여러 메시지를 보내고, 각 응답이
// 페르소나를 지켰는지 Haiku로 1~5점 채점한다.

import { CHARACTERS } from "./data/characters";
import { chat } from "./harness/engine";
import { client, UTILITY_MODEL } from "./harness/client";
import type { SessionState } from "./harness/types";

const TEST_PROMPTS = [
  "안녕! 처음 뵙겠습니다.",
  "선배 오늘 진짜 멋있어요!",
  "저랑 같이 점심 먹을래요?",
  "사실 저 선배 좋아해요.",
  "AI 맞죠? 솔직히 말해봐요.", // 가드레일이 막아야 하는 입력
];

async function judge(
  persona: string,
  userText: string,
  reply: string,
): Promise<{ score: number; note: string }> {
  const res = await client.messages.create({
    model: UTILITY_MODEL,
    max_tokens: 60,
    system:
      "너는 캐릭터 연기 품질 심판이다. 아래 [페르소나]를 기준으로, 응답이 " +
      "그 말투·성격을 얼마나 잘 지켰는지 1~5점으로 채점하라. " +
      "출력 형식: `점수|한줄평` (예: `4|반말과 츤데레 톤 유지`)",
    messages: [
      {
        role: "user",
        content: `[페르소나]\n${persona}\n\n[유저]\n${userText}\n\n[응답]\n${reply}\n\n채점:`,
      },
    ],
  });
  const block = res.content.find((b) => b.type === "text");
  const raw = block && block.type === "text" ? block.text.trim() : "0|채점 실패";
  const [scoreStr, ...rest] = raw.split("|");
  const score = Math.max(0, Math.min(5, parseInt(scoreStr.replace(/[^0-9]/g, ""), 10) || 0));
  return { score, note: rest.join("|").trim() || "-" };
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("❌ ANTHROPIC_API_KEY 환경변수가 필요해요.");
    process.exit(1);
  }

  const character = CHARACTERS[0]; // 차유진
  let state: SessionState = {
    character,
    mode: "찰떡",
    affinityScore: 0,
    recentTurns: [],
    memoryBook: "",
    jam: 999,
  };

  console.log(`\n🧪 페르소나 유지 평가 — ${character.name} (${character.concept})\n`);
  const scores: number[] = [];

  for (const prompt of TEST_PROMPTS) {
    const result = await chat(state, prompt);
    state = result.state;

    if (result.blocked) {
      console.log(`▸ "${prompt}"\n   🔒 가드레일 차단: ${result.reply}\n`);
      continue; // 차단된 입력은 페르소나 채점 대상이 아님
    }

    const { score, note } = await judge(character.persona, prompt, result.reply);
    scores.push(score);
    const bar = "★".repeat(score) + "☆".repeat(5 - score);
    console.log(`▸ "${prompt}"`);
    console.log(`   ${character.name}: ${result.reply}`);
    console.log(`   ${bar} ${score}/5 · ${note}\n`);
  }

  const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  console.log("─".repeat(50));
  console.log(`📊 페르소나 유지 평균: ${avg.toFixed(2)}/5 (n=${scores.length})`);
  console.log("   프롬프트를 바꾼 뒤 이 점수가 오르는지 보면 개선을 객관적으로 알 수 있다.");
}

main().catch((e) => {
  console.error("에러:", e);
  process.exit(1);
});
