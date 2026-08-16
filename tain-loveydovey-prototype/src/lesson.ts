// ============================================================
// 🎓 수업 모드 — 하네스 내부를 단계별로 시각화
// ============================================================
// 메시지 한 통이 처리되는 7단계를, 멈춰가며 "강의처럼" 보여준다.
// engine.ts는 이 단계들을 자동으로 묶지만, 여기선 일부러 하나씩 풀어서
// 각 단계에 무슨 데이터가 흐르는지 눈으로 확인하게 한다.

import * as readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { CHARACTERS } from "./data/characters";
import { client, MAIN_MODEL, UTILITY_MODEL } from "./harness/client";
import { buildSystemPrompt, scoreToLevel } from "./harness/persona";
import { CHAT_MODES } from "./harness/modes";
import { scoreAffinityDelta, clampScore } from "./harness/affinity";
import { compactMemory, RECENT_WINDOW } from "./harness/memory";
import { AFFINITY_LABELS, type SessionState, type Turn } from "./harness/types";

// ---------- 시각화 헬퍼 (ANSI) ----------
const C = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  green: "\x1b[32m",
  magenta: "\x1b[35m",
  blue: "\x1b[34m",
  red: "\x1b[31m",
  gray: "\x1b[90m",
};
const W = 64;

function rule(color = C.gray) {
  console.log(color + "─".repeat(W) + C.reset);
}

function stageHeader(n: number, title: string, concept: string) {
  console.log();
  console.log(C.bold + C.cyan + `┏━ STAGE ${n} ` + "━".repeat(W - 11) + C.reset);
  console.log(C.bold + C.cyan + "┃ " + title + C.reset);
  console.log(C.cyan + "┃ " + C.dim + "하네스 개념: " + concept + C.reset);
  console.log(C.cyan + "┗" + "━".repeat(W - 1) + C.reset);
}

/** 설명 문단 (선생님의 말) */
function teach(text: string) {
  console.log(C.yellow + "🧑‍🏫 " + C.reset + text);
}

/** 실제 데이터 박스 (모델에 들어가는 진짜 값) */
function dataBox(label: string, content: string, color = C.green) {
  console.log(color + "  ┌─ " + label + " " + "─".repeat(Math.max(0, W - label.length - 5)) + C.reset);
  for (const line of content.split("\n")) {
    // 긴 줄 줄바꿈
    const wrapped = line.match(new RegExp(`.{1,${W - 4}}`, "g")) ?? [""];
    for (const w of wrapped) console.log(color + "  │ " + C.reset + w);
  }
  console.log(color + "  └" + "─".repeat(W - 3) + C.reset);
}

async function pause(rl: readline.Interface) {
  await rl.question(C.dim + "\n   ▶ Enter로 다음 단계…" + C.reset);
}

// ---------- 데모용 사전 대화 (메모리 압축을 보여주려고 미리 쌓아둠) ----------
function seedTurns(): Turn[] {
  return [
    { role: "user", text: "안녕, 나 오늘 시험 망쳤어..." },
    { role: "assistant", text: "뭐야, 그 표정. ...야, 시험 한 번 망쳤다고 세상 안 끝나." },
    { role: "user", text: "위로해줘서 고마워 선배" },
    { role: "assistant", text: "위로는 무슨. 그냥 사실 말한 거야. ...밥은 먹었냐." },
    { role: "user", text: "아니 아직. 선배가 사줄래?" },
    { role: "assistant", text: "하... 어쩔 수 없네. 딱 한 번만이다. 따라와." },
  ];
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("❌ ANTHROPIC_API_KEY 환경변수가 필요해요. (.env 또는 export)");
    process.exit(1);
  }
  const rl = readline.createInterface({ input: stdin, output: stdout });

  console.clear();
  console.log(C.bold + C.magenta + "\n  🎓 러비더비 하네스 — 라이브 수업\n" + C.reset);
  teach(
    "지금부터 '메시지 한 통'이 AI 캐릭터 챗에서 어떻게 처리되는지\n   7단계로 뜯어봅니다. 각 단계에서 실제로 LLM에 들어가는 데이터를 보여줄게요.",
  );
  console.log();
  rule();
  console.log(C.dim + "  핵심 명제: LLM은 '무상태(stateless)'다. '관계가 이어진다'는 느낌은" + C.reset);
  console.log(C.dim + "  전부 하네스가 상태를 들고 다니며 매번 주입해 만드는 착시다." + C.reset);
  rule();

  // 캐릭터: 데모는 차유진(츤데레)로 고정
  const character = CHARACTERS[0];
  const state: SessionState = {
    character,
    mode: "찰떡",
    affinityScore: 120, // 친구 단계에서 시작
    recentTurns: seedTurns(),
    memoryBook: "",
    jam: 50,
  };
  const userText = "선배, 사실 나 선배 처음 봤을 때부터 좀 좋아했어.";

  console.log(`\n  캐릭터: ${C.bold}${character.name}${C.reset} (${character.concept})`);
  console.log(`  현재 호감도: ${state.affinityScore} (${AFFINITY_LABELS[scoreToLevel(state.affinityScore)]})`);
  console.log(`  이번에 유저가 보낼 말: ${C.bold}"${userText}"${C.reset}`);
  await pause(rl);

  // ── STAGE 1: Stateless ──
  stageHeader(1, "LLM은 기억이 없다", "Stateless · 상태는 하네스가 보관");
  teach(
    "모델에 '차유진'이라는 기억은 없습니다. 우리가 들고 있는 SessionState가\n   기억의 전부예요. 지금 들고 있는 상태를 볼까요?",
  );
  dataBox(
    "SessionState (하네스의 메모리)",
    `mode: ${state.mode}\naffinityScore: ${state.affinityScore}\nrecentTurns: ${state.recentTurns.length}개\nmemoryBook: "${state.memoryBook || "(비어있음)"}"\njam: ${state.jam}`,
    C.blue,
  );
  await pause(rl);

  // ── STAGE 2: 시스템 프롬프트 조립 ──
  stageHeader(2, "시스템 프롬프트 조립 (하네스의 심장)", "상태 → 프롬프트 변환");
  teach(
    "페르소나 + 호감도 + 모드 + 메모리를 하나의 시스템 프롬프트로 합칩니다.\n   이게 캐릭터를 '살아있게' 만드는 진짜 엔진이에요. 결과물을 보세요:",
  );
  const system = buildSystemPrompt({
    character,
    affinityScore: state.affinityScore,
    mode: state.mode,
    memoryBook: state.memoryBook,
  });
  dataBox("system 프롬프트 (매 턴 새로 조립됨)", system, C.green);
  await pause(rl);

  // ── STAGE 3: 컨텍스트 윈도우 ──
  stageHeader(3, "컨텍스트 구성", "무엇을 얼마나 넣을 것인가");
  teach(
    "최근 대화 턴 + 이번 발화를 messages 배열로 만듭니다.\n   전부 넣으면 비싸고 느려져요. 그래서 '최근 N턴'만 넣습니다(나머지는 6단계에서 압축).",
  );
  const messages = [
    ...state.recentTurns.map((t) => ({ role: t.role, content: t.text })),
    { role: "user" as const, content: userText },
  ];
  dataBox(
    `messages (${messages.length}턴)`,
    messages.map((m) => `${m.role === "user" ? "유저 " : "캐릭터"}: ${m.content}`).join("\n"),
    C.blue,
  );
  await pause(rl);

  // ── STAGE 4: 메인 모델 호출 ──
  stageHeader(4, "메인 모델 호출 (스트리밍)", `${MAIN_MODEL} · 캐릭터 응답 생성`);
  teach(
    "이제 진짜 LLM 호출입니다. 캐릭터 응답은 품질이 중요하니 최상위 모델을 써요.\n   스트리밍은 UX이자 '긴 응답 타임아웃 방어' 기법입니다. 실시간으로 받아볼게요:",
  );
  stdout.write(C.magenta + `\n  [${character.name}] ` + C.reset);
  const stream = client.messages.stream({
    model: MAIN_MODEL,
    max_tokens: CHAT_MODES[state.mode].maxTokens,
    system,
    messages,
  });
  stream.on("text", (t) => stdout.write(t));
  const finalMsg = await stream.finalMessage();
  const replyBlock = finalMsg.content.find((b) => b.type === "text");
  const reply = replyBlock && replyBlock.type === "text" ? replyBlock.text : "";
  stdout.write("\n");
  console.log(
    C.dim +
      `  (토큰 사용: 입력 ${finalMsg.usage.input_tokens} / 출력 ${finalMsg.usage.output_tokens} — 비용은 토큰에 비례)` +
      C.reset,
  );
  await pause(rl);

  // ── STAGE 5: Judge 패턴 (호감도 채점) ──
  stageHeader(5, "호감도 채점 (Judge 패턴)", `${UTILITY_MODEL} · 보조 작업은 싼 모델`);
  teach(
    "방금 대화로 호감도가 얼마나 변했는지 '별도의 싼 모델'에게 채점시킵니다.\n   규칙 기반('좋아'=+10)은 비꼼을 못 걸러요. LLM을 평가자(judge)로 쓰는 거죠.",
  );
  const prevLevel = scoreToLevel(state.affinityScore);
  const delta = await scoreAffinityDelta(userText, reply);
  const newScore = clampScore(state.affinityScore + delta);
  const newLevel = scoreToLevel(newScore);
  dataBox(
    "채점 결과",
    `호감도 Δ: ${delta >= 0 ? "+" : ""}${delta}\n${state.affinityScore} → ${newScore}\n단계: ${AFFINITY_LABELS[prevLevel]} → ${AFFINITY_LABELS[newLevel]}` +
      (newLevel > prevLevel ? "  💗 레벨업!" : ""),
    delta >= 0 ? C.green : C.red,
  );
  await pause(rl);

  // ── STAGE 6: Compaction (메모리 압축) ──
  stageHeader(6, "메모리 압축 (Compaction)", "오래된 대화 → 메모리북");
  const allTurns: Turn[] = [
    ...state.recentTurns,
    { role: "user", text: userText },
    { role: "assistant", text: reply },
  ];
  teach(
    `대화가 ${allTurns.length}턴이 됐어요. 최근 ${RECENT_WINDOW}턴만 원문으로 두고,\n   넘치는 오래된 턴은 요약해서 '메모리북'으로 압축합니다(비용↓ + 장기기억).`,
  );
  let memoryBook = state.memoryBook;
  let recentTurns = allTurns;
  if (allTurns.length > RECENT_WINDOW) {
    const splitAt = allTurns.length - RECENT_WINDOW;
    const toCompact = allTurns.slice(0, splitAt);
    recentTurns = allTurns.slice(splitAt);
    teach(`압축 대상 오래된 ${toCompact.length}턴을 ${UTILITY_MODEL}로 요약 중…`);
    memoryBook = await compactMemory(state.memoryBook, toCompact);
    dataBox("생성된 메모리북 (다음 턴부터 시스템 프롬프트에 주입됨)", memoryBook, C.magenta);
    console.log(C.dim + `  컨텍스트 턴: ${allTurns.length} → ${recentTurns.length} (압축됨)` + C.reset);
  } else {
    teach("아직 윈도우를 안 넘어서 압축은 생략돼요.");
  }
  await pause(rl);

  // ── STAGE 7: 상태 갱신 ──
  stageHeader(7, "상태 갱신", "다음 턴으로 넘길 상태 (DB 저장 대상)");
  teach(
    "7단계 결과를 새 SessionState로 묶습니다. 실제 서비스라면 이걸 Supabase 같은\n   DB에 저장해요. 다음 턴은 이 상태에서 다시 1단계로 시작합니다. 루프 완성!",
  );
  dataBox(
    "before → after",
    `affinityScore: ${state.affinityScore} → ${newScore}\n` +
      `recentTurns: ${state.recentTurns.length} → ${recentTurns.length}\n` +
      `memoryBook: ${state.memoryBook ? "있음" : "(비어있음)"} → ${memoryBook ? "갱신됨" : "(비어있음)"}\n` +
      `jam: ${state.jam} → ${state.jam - CHAT_MODES[state.mode].jamCost}`,
    C.blue,
  );

  console.log();
  rule(C.magenta);
  console.log(C.bold + C.magenta + "  🎓 수업 끝! 방금 본 7단계가 '하네스'의 전부입니다." + C.reset);
  console.log(C.dim + "  LLM 호출은 STAGE 4 하나뿐. 나머지 6개가 하네스 엔지니어링이에요." + C.reset);
  console.log(C.dim + "  이제  npm run chat  으로 직접 대화하며 상태가 변하는 걸 느껴보세요." + C.reset);
  rule(C.magenta);

  rl.close();
}

main().catch((e) => {
  console.error("에러:", e);
  process.exit(1);
});
