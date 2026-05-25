import { json, type ActionFunctionArgs } from "@remix-run/node";
import {
  generateAiReply,
  AI_CHAT_MAX_TURNS,
  AI_CHAT_MAX_LEN,
  type AiChatMessage,
  type AiChatRole,
} from "~/lib/ai-chat.server";

// 체험용 AI 모의 채팅 엔드포인트. 로그인 불필요·무상태(대화 기록을 저장하지 않음).
// 클라이언트가 지금까지의 대화 전체를 보내면 다음 응답 1건을 돌려준다.
export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return json({ error: "method" }, { status: 405 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_json" }, { status: 400 });
  }

  const raw = (body as { messages?: unknown })?.messages;
  if (!Array.isArray(raw)) {
    return json({ error: "messages_required" }, { status: 400 });
  }

  const history: AiChatMessage[] = [];
  for (const item of raw) {
    const role = (item as { role?: unknown }).role;
    const content = (item as { content?: unknown }).content;
    if (
      (role === "user" || role === "assistant") &&
      typeof content === "string"
    ) {
      history.push({
        role: role as AiChatRole,
        content: content.slice(0, AI_CHAT_MAX_LEN),
      });
    }
  }

  if (history.length === 0) {
    return json({ error: "empty" }, { status: 400 });
  }

  const userTurns = history.filter((m) => m.role === "user").length;
  if (userTurns > AI_CHAT_MAX_TURNS) {
    return json({
      reply:
        "오늘 체험 대화는 여기까지예요 😊 실제로 가입하면 진짜 매칭 상대와 이어서 대화할 수 있어요!",
      limited: true,
    });
  }

  const reply = await generateAiReply(history);
  return json({ reply, limited: false });
}

// GET 등으로 접근 시 빈 응답(라우트 존재만).
export async function loader() {
  return json({ ok: true });
}
