// 체험용 AI 대화 — 비로그인 방문자가 "매칭 상대와의 대화"를 미리 느껴보는 모의 채팅.
// 실제 채팅(/chat/$matchId)·실DB와 완전히 분리된 데모이며, 어떤 PII도 저장하지 않는다.
//
// 동작:
//  - ANTHROPIC_API_KEY 가 있으면 → 실제 LLM(가벼운 모델)으로 페르소나 응답 생성.
//  - 없으면 → 키워드 기반 스크립트 폴백. 시크릿 없이도 데모가 항상 동작하게 한다.

export type AiChatRole = "user" | "assistant";
export type AiChatMessage = { role: AiChatRole; content: string };

// 데모 상대 페르소나 — 미리보기 데이터(지민)와 일관되게 맞춘다.
const PERSONA_NAME = "지민";
const SYSTEM_PROMPT = `너는 음악 취향 기반 데이팅 앱 "뮤직매치"에서 매칭된 상대 역할을 맡은 AI야.
이름은 ${PERSONA_NAME}, 음악을 사랑하는 20대 초반 한국 대학생이야.

대화 규칙:
- 한국어로, 친근하고 편안한 반말~존댓말 사이의 다정한 말투로 답해.
- 답변은 1~2문장으로 짧게. 가끔 이모지를 자연스럽게 한 개 정도만.
- 음악(특히 윤하, 뉴진스, 아이유, 인디/발라드 등) 이야기에 진심으로 반응하고, 상대에게도 가볍게 질문을 던져 대화를 이어가.
- 너는 데모용 AI라는 걸 절대 먼저 밝히지 말고, 자연스러운 매칭 상대처럼 행동해.
- 만나자/연락처 등 무리한 요구는 부드럽게 음악 주제로 돌려.`;

const MAX_TOKENS = 256;
const MODEL = "claude-haiku-4-5-20251001";
const REQUEST_TIMEOUT_MS = 12000;

// 비로그인 데모이므로 무한정 길게 두지 않는다(비용·오남용 방지).
export const AI_CHAT_MAX_TURNS = 20;
export const AI_CHAT_MAX_LEN = 500;

export const AI_CHAT_PARTNER_NAME = PERSONA_NAME;

export const AI_CHAT_GREETING =
  "안녕하세요! 음악 취향이 잘 맞아서 매칭됐어요 😊 요즘 어떤 노래 자주 들어요?";

async function generateWithLlm(
  apiKey: string,
  history: AiChatMessage[],
): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        messages: history.map((m) => ({ role: m.role, content: m.content })),
      }),
    });
    if (!res.ok) {
      console.error("[ai-chat] anthropic", res.status, await res.text());
      return null;
    }
    const data = (await res.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    const text = (data.content ?? [])
      .filter((b) => b.type === "text" && b.text)
      .map((b) => b.text)
      .join("")
      .trim();
    return text || null;
  } catch (err) {
    console.error("[ai-chat] anthropic fetch failed", err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// 키워드 기반 폴백 — 시크릿 없이도 그럴듯한 흐름을 보여준다.
const SCRIPTED_RULES: Array<{ test: RegExp; replies: string[] }> = [
  {
    test: /윤하|사건의 지평선/,
    replies: [
      "윤하 진짜 좋죠! 사건의 지평선은 가사 때문에 더 빠져요 🎶",
      "오 윤하 좋아하시는구나, 저랑 취향 통하네요! 오르트구름도 들어보셨어요?",
    ],
  },
  {
    test: /뉴진스|newjeans|ditto|hype/i,
    replies: [
      "뉴진스 노래는 계절마다 다르게 들려서 좋아요. Ditto파세요, Hype Boy파세요?",
      "저 뉴진스 완전 좋아해요! 산뜻한 멜로디가 매력인 것 같아요 ✨",
    ],
  },
  {
    test: /아이유|iu|밤편지/i,
    replies: [
      "아이유 밤편지는 자기 전에 꼭 듣는 곡이에요 🌙 좋아하는 앨범 있어요?",
      "아이유 목소리 진짜 편안하죠. 발라드 위주로 들으시는 편이에요?",
    ],
  },
  {
    test: /발라드|인디|잔나비|혁오|새소년/,
    replies: [
      "인디/발라드 좋아하시는구나! 잔나비 '주저하는 연인들을 위해' 자주 들어요.",
      "그런 감성 너무 좋아요. 비 오는 날엔 인디 플레이리스트가 최고죠 ☔",
    ],
  },
  {
    test: /힙합|랩|hiphop|rap/i,
    replies: [
      "힙합도 종종 들어요! 가사 곱씹는 재미가 있죠. 최애 아티스트 누구예요?",
      "오 취향 다양하시네요. 드라이브할 때 힙합 틀면 신나요 🔥",
    ],
  },
  {
    test: /만나|연락처|번호|카톡|인스타/,
    replies: [
      "하하 천천히 알아가요 😊 그보다 요즘 플레이리스트 1위 곡이 뭐예요?",
      "급하면 안 돼요~ 우선 노래 얘기 더 해요! 최근에 꽂힌 곡 있어요?",
    ],
  },
  {
    test: /안녕|반가|하이|hi|hello/i,
    replies: [
      "안녕하세요! 만나서 반가워요 😊 어떤 음악 들으면서 오셨어요?",
      "반가워요! 음악 취향 비슷하다니까 벌써 친근하네요 🎧",
    ],
  },
  {
    test: /\?|뭐|어때|어떤|좋아/,
    replies: [
      "음 저는 잔잔한 곡이랑 신나는 곡 반반 들어요! 그쪽은요?",
      "요즘은 출퇴근길에 플레이리스트 셔플로 들어요. 취향 알려주시면 추천해드릴게요!",
    ],
  },
];

const GENERIC_REPLIES = [
  "오 그렇구나! 좀 더 얘기해줘요 🎵",
  "완전 공감돼요. 그럼 최근에 가장 많이 들은 곡은 뭐예요?",
  "재밌다 ㅎㅎ 음악 얘기하니까 시간 가는 줄 모르겠어요!",
  "좋네요! 다음에 같이 들을 곡 하나 추천해줄래요?",
];

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}

function scriptedReply(history: AiChatMessage[]): string {
  const lastUser = [...history].reverse().find((m) => m.role === "user");
  const text = lastUser?.content ?? "";
  const turn = history.filter((m) => m.role === "user").length;
  for (const rule of SCRIPTED_RULES) {
    if (rule.test.test(text)) return pick(rule.replies, turn);
  }
  return pick(GENERIC_REPLIES, turn);
}

export async function generateAiReply(
  history: AiChatMessage[],
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) {
    const llm = await generateWithLlm(apiKey, history);
    if (llm) return llm;
  }
  return scriptedReply(history);
}
