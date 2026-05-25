import { Link, useNavigate } from "@remix-run/react";
import StatusBar from "~/components/StatusBar";
import HomeIndicator from "~/components/HomeIndicator";
import PhoneFrame from "~/components/PhoneFrame";
import { COLORS, TYPOGRAPHY } from "~/lib/constants";
import { PREVIEW_MATCH, PREVIEW_MESSAGES } from "~/lib/preview-data";

// 로그인 없이 둘러보는 방문자를 위한 정적(읽기전용) 샘플 채팅방.
// 실제 채팅(/chat/$matchId)은 실시간·전송 로직이 있어 건드리지 않고, 분위기만 보여준다.
export default function ChatPreview() {
  const navigate = useNavigate();

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
        <h1
          style={{
            ...TYPOGRAPHY.bodyBold,
            fontSize: "17px",
            color: COLORS.text.primary,
            margin: 0,
          }}
        >
          {PREVIEW_MATCH.partnerName}
        </h1>
      </div>

      {/* 대화 영역 */}
      <div
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
            👀
          </span>
          <p
            style={{
              ...TYPOGRAPHY.tiny,
              color: COLORS.text.helper,
              margin: 0,
              lineHeight: 1.4,
            }}
          >
            매칭되면 이렇게 대화가 시작돼요. 지금은 미리보기예요.
          </p>
        </div>

        <div
          style={{
            alignSelf: "center",
            ...TYPOGRAPHY.tiny,
            color: COLORS.text.placeholder,
            margin: "4px 0",
          }}
        >
          음악 취향이 통해 매칭됐어요 🎵
        </div>

        {PREVIEW_MESSAGES.map((m) => (
          <div
            key={m.id}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: m.fromMe ? "flex-end" : "flex-start",
            }}
          >
            <div
              style={{
                maxWidth: "78%",
                padding: "10px 14px",
                borderRadius: m.fromMe
                  ? "16px 16px 4px 16px"
                  : "16px 16px 16px 4px",
                background: m.fromMe ? COLORS.accent : "white",
                color: m.fromMe ? "white" : COLORS.text.primary,
                ...TYPOGRAPHY.body,
                fontSize: "14px",
                lineHeight: 1.45,
                boxShadow: m.fromMe ? "none" : "0 1px 4px rgba(0,0,0,0.05)",
              }}
            >
              {m.content}
            </div>
            <span
              style={{
                ...TYPOGRAPHY.tiny,
                color: COLORS.text.placeholder,
                margin: "4px 4px 0",
              }}
            >
              {m.time}
            </span>
          </div>
        ))}
      </div>

      {/* 입력창 대신 가입 유도 */}
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
        <div
          style={{
            flex: 1,
            height: "44px",
            borderRadius: "22px",
            background: COLORS.cardBg,
            display: "flex",
            alignItems: "center",
            padding: "0 16px",
            ...TYPOGRAPHY.label,
            color: COLORS.text.placeholder,
          }}
        >
          가입하면 메시지를 보낼 수 있어요
        </div>
        <Link
          to="/welcome"
          style={{
            flexShrink: 0,
            height: "44px",
            display: "flex",
            alignItems: "center",
            padding: "0 18px",
            borderRadius: "22px",
            background: COLORS.accent,
            color: "white",
            ...TYPOGRAPHY.bodyBold,
            fontSize: "14px",
            textDecoration: "none",
          }}
        >
          가입하기
        </Link>
      </div>

      <HomeIndicator />
    </PhoneFrame>
  );
}
