import { Link } from "@remix-run/react";
import { COLORS, TYPOGRAPHY, RADIUS } from "~/lib/constants";

// 비로그인 "둘러보기" 화면 상단에 고정으로 노출하는 미리보기 안내 + 가입 유도 배너.
export default function PreviewBanner({ text }: { text?: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        background: COLORS.accentSoft,
        borderRadius: RADIUS.info,
        padding: "12px 14px",
        marginBottom: "16px",
      }}
    >
      <span style={{ fontSize: "20px" }} aria-hidden>
        👀
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            ...TYPOGRAPHY.label,
            color: COLORS.text.primary,
            margin: 0,
            fontWeight: 600,
          }}
        >
          미리보기 모드
        </p>
        <p
          style={{
            ...TYPOGRAPHY.tiny,
            color: COLORS.text.helper,
            margin: "2px 0 0",
            lineHeight: 1.4,
          }}
        >
          {text ?? "가입 없이 둘러보는 중이에요. 가입하면 실제로 매칭이 시작돼요."}
        </p>
      </div>
      <Link
        to="/welcome"
        style={{
          flexShrink: 0,
          background: COLORS.accent,
          color: "white",
          borderRadius: "999px",
          padding: "8px 14px",
          ...TYPOGRAPHY.caption,
          fontWeight: 700,
          textDecoration: "none",
          whiteSpace: "nowrap",
        }}
      >
        가입하기
      </Link>
    </div>
  );
}
