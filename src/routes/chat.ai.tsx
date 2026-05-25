import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@remix-run/react";
import StatusBar from "~/components/StatusBar";
import HomeIndicator from "~/components/HomeIndicator";
import PhoneFrame from "~/components/PhoneFrame";
import { COLORS, TYPOGRAPHY } from "~/lib/constants";

// 체험용 AI 모의 채팅 화면(로그인 불필요).
// 실제 채팅과 분리된 데모 — 매칭 상대와의 대화 분위기를 직접 주고받으며 느껴본다.

const PARTNER_NAME = "지민";
const GREETING =
  "안녕하세요! 음악 취향이 잘 맞아서 매칭됐어요 😊 요즘 어떤 노래 자주 들어요?";

type Msg = { id: string; role: "user" | "assistant"; content: string };

const nowTime = () =>
  new Date().toLocaleTimeString("ko-KR", {
    hour: "numeric",
    minute: "2-digit",
  });

export default function ChatAi() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Msg[]>([
    { id: "greeting", role: "assistant", content: GREETING },
  ]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, pending]);

  async function send() {
    const text = input.trim();
    if (!text || pending) return;
    const userMsg: Msg = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
    };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setPending(true);

    try {
      const res = await fetch("/api/chat-ai", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: next.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = (await res.json()) as { reply?: string };
      const reply =
        data.reply ?? "앗 잠깐 연결이 끊겼어요. 다시 한 번 말해줄래요? 🎧";
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: "assistant", content: reply },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: "앗 잠깐 연결이 끊겼어요. 다시 한 번 말해줄래요? 🎧",
        },
      ]);
    } finally {
      setPending(false);
    }
  }

  return (
    <PhoneFrame>
      <StatusBar />

      {/* 헤더 */}
      <div
        style={{
          height: "52px",
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "white",
          borderBottom: `1px solid ${COLORS.divider2}`,
        }}
      >
        <button
          type="button"
          onClick={() => navigate("/chat")}
          aria-label="뒤로"
          style={{
            position: "absolute",
            left: "8px",
            fontSize: "22px",
            color: COLORS.text.secondary,
            padding: "4px 8px",
          }}
        >
          ‹
        </button>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <h1
            style={{
              ...TYPOGRAPHY.bodyBold,
              fontSize: "17px",
              color: COLORS.text.primary,
              margin: 0,
            }}
          >
            {PARTNER_NAME}
          </h1>
          <span style={{ ...TYPOGRAPHY.tiny, color: COLORS.accent }}>
            AI 체험 대화
          </span>
        </div>
      </div>

      {/* 대화 영역 */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px 16px 24px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          background: COLORS.cardBg,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            background: COLORS.accentSoft,
            borderRadius: "12px",
            padding: "10px 12px",
          }}
        >
          <span style={{ fontSize: "18px" }} aria-hidden>
            🤖
          </span>
          <p
            style={{
              ...TYPOGRAPHY.tiny,
              color: COLORS.text.helper,
              margin: 0,
              lineHeight: 1.4,
            }}
          >
            매칭 상대와의 대화를 AI로 미리 체험해보세요. 실제 가입자가 아닌 데모예요.
          </p>
        </div>

        {messages.map((m) => (
          <div
            key={m.id}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: m.role === "user" ? "flex-end" : "flex-start",
            }}
          >
            <div
              style={{
                maxWidth: "78%",
                padding: "10px 14px",
                borderRadius:
                  m.role === "user"
                    ? "16px 16px 4px 16px"
                    : "16px 16px 16px 4px",
                background: m.role === "user" ? COLORS.accent : "white",
                color: m.role === "user" ? "white" : COLORS.text.primary,
                ...TYPOGRAPHY.body,
                fontSize: "14px",
                lineHeight: 1.45,
                boxShadow:
                  m.role === "user" ? "none" : "0 1px 4px rgba(0,0,0,0.05)",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {m.content}
            </div>
          </div>
        ))}

        {pending && (
          <div style={{ display: "flex", alignItems: "flex-start" }}>
            <div
              style={{
                padding: "12px 16px",
                borderRadius: "16px 16px 16px 4px",
                background: "white",
                boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
                ...TYPOGRAPHY.body,
                fontSize: "14px",
                color: COLORS.text.placeholder,
              }}
            >
              입력 중…
            </div>
          </div>
        )}
      </div>

      {/* 입력창 */}
      <div
        style={{
          padding: "12px 16px",
          paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
          background: "white",
          borderTop: `1px solid ${COLORS.divider2}`,
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="메시지를 입력해보세요"
          aria-label="메시지 입력"
          maxLength={500}
          style={{
            flex: 1,
            height: "44px",
            borderRadius: "22px",
            border: "none",
            background: COLORS.cardBg,
            padding: "0 16px",
            ...TYPOGRAPHY.label,
            color: COLORS.text.primary,
            outline: "none",
          }}
        />
        <button
          type="button"
          onClick={send}
          disabled={!input.trim() || pending}
          aria-label="보내기"
          style={{
            flexShrink: 0,
            height: "44px",
            padding: "0 18px",
            borderRadius: "22px",
            border: "none",
            background:
              !input.trim() || pending ? COLORS.divider : COLORS.accent,
            color: "white",
            ...TYPOGRAPHY.bodyBold,
            fontSize: "14px",
            cursor: !input.trim() || pending ? "default" : "pointer",
          }}
        >
          전송
        </button>
      </div>

      <div
        style={{
          padding: "0 16px 12px",
          paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
          background: "white",
          textAlign: "center",
        }}
      >
        <Link
          to="/welcome"
          style={{
            ...TYPOGRAPHY.tiny,
            color: COLORS.accent,
            textDecoration: "none",
          }}
        >
          실제 매칭으로 대화 시작하기 →
        </Link>
      </div>

      <HomeIndicator />
    </PhoneFrame>
  );
}
