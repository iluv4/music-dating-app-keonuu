// ============================================================
// CLI — 터미널에서 캐릭터와 실제로 대화하는 데모
// ============================================================
// 이 파일은 "하네스를 구동하는 클라이언트"다. 일부러 UI를 단순하게(터미널)
// 둬서, 화면 잡일 없이 하네스의 동작(호감도 변화·메모리 압축·잼 차감)을
// 눈으로 보게 한다. 나중에 이 자리를 웹 UI로 갈아끼우면 된다.
//
// 실행: ANTHROPIC_API_KEY=... npm run chat
// 명령: /mode 장문 | /status | /quit

import * as readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { CHARACTERS } from "./data/characters.js";
import { chat } from "./harness/engine.js";
import { scoreToLevel } from "./harness/persona.js";
import { AFFINITY_LABELS, type ChatMode, type SessionState } from "./harness/types.js";

const MODES: ChatMode[] = ["찰떡", "장문", "스토리"];

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("❌ ANTHROPIC_API_KEY 환경변수가 필요해요. (.env 또는 export)");
    process.exit(1);
  }

  const rl = readline.createInterface({ input: stdin, output: stdout });

  // --- 캐릭터 선택 ---
  console.log("\n💗 러비더비 하네스 프로토타입\n");
  CHARACTERS.forEach((c, i) => console.log(`  ${i + 1}. ${c.name} — ${c.concept}`));
  const pick = await rl.question("\n캐릭터를 골라줘 (번호): ");
  const character = CHARACTERS[Number(pick) - 1] ?? CHARACTERS[0];

  // --- 초기 세션 상태 ---
  let state: SessionState = {
    character,
    mode: "찰떡",
    affinityScore: 0,
    recentTurns: [],
    memoryBook: "",
    jam: 50,
  };

  console.log(`\n[${character.name}] ${character.greeting}`);
  console.log(
    `\n(명령: /mode 찰떡|장문|스토리, /status, /quit · 시작 잼 ${state.jam})\n`,
  );

  // --- 대화 루프 ---
  while (true) {
    const input = (await rl.question("나> ")).trim();
    if (!input) continue;

    if (input === "/quit") break;

    if (input === "/status") {
      const lvl = scoreToLevel(state.affinityScore);
      console.log(
        `  ▸ 관계: ${AFFINITY_LABELS[lvl]} (Lv.${lvl}) | 호감도 ${state.affinityScore}/1000 | ` +
          `모드 ${state.mode} | 잼 ${state.jam}`,
      );
      console.log(
        `  ▸ 메모리북: ${state.memoryBook ? "\n" + state.memoryBook : "(아직 없음)"}`,
      );
      continue;
    }

    if (input.startsWith("/mode")) {
      const m = input.split(/\s+/)[1] as ChatMode;
      if (MODES.includes(m)) {
        state = { ...state, mode: m };
        console.log(`  ▸ 모드를 '${m}'(으)로 변경했어요.`);
      } else {
        console.log(`  ▸ 모드는 ${MODES.join(", ")} 중 하나여야 해요.`);
      }
      continue;
    }

    // --- 실제 대화 (하네스 호출) ---
    stdout.write(`[${character.name}] `);
    const result = await chat(state, input, (t) => stdout.write(t));
    stdout.write("\n");
    state = result.state;

    // 하네스 상태 변화를 시각화 (학습 목적)
    const sign = result.affinityDelta >= 0 ? "+" : "";
    console.log(
      `  ▸ 호감 ${sign}${result.affinityDelta} (→ ${state.affinityScore}) | 잼 ${state.jam}` +
        (result.levelChange ? `\n  ▸ ${result.levelChange}` : ""),
    );
  }

  rl.close();
  console.log("\n또 만나요 💗");
}

main().catch((e) => {
  console.error("에러:", e);
  process.exit(1);
});
