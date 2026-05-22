import { useState } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { RADIUS, TYPOGRAPHY } from "~/lib/constants";
import { signInWithProvider } from "~/lib/oauth.client";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode };

const KAKAO_YELLOW = "#FEE500";
const KAKAO_LABEL = "rgba(0,0,0,0.85)";

export const KakaoButton = ({ children, style, disabled, ...rest }: Props) => {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || busy}
      onClick={() => {
        setBusy(true);
        void signInWithProvider("kakao");
      }}
      style={{
        height: "56px",
        background: KAKAO_YELLOW,
        color: KAKAO_LABEL,
        borderRadius: RADIUS.pill,
        border: "none",
        ...TYPOGRAPHY.bodyBold,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        cursor: disabled || busy ? "not-allowed" : "pointer",
        opacity: disabled || busy ? 0.7 : 1,
        ...style,
      }}
    >
      <span aria-hidden style={{ fontSize: "18px" }}>💬</span>
      {busy ? "이동 중..." : children}
    </button>
  );
};

export const GoogleButton = ({ children, style, disabled, ...rest }: Props) => {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || busy}
      onClick={() => {
        setBusy(true);
        void signInWithProvider("google");
      }}
      style={{
        height: "56px",
        background: "#ffffff",
        color: "rgba(0,0,0,0.7)",
        borderRadius: RADIUS.pill,
        border: "1px solid #e2e2e2",
        ...TYPOGRAPHY.bodyBold,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        cursor: disabled || busy ? "not-allowed" : "pointer",
        opacity: disabled || busy ? 0.7 : 1,
        ...style,
      }}
    >
      <span aria-hidden style={{ fontSize: "16px", fontWeight: 700 }}>G</span>
      {busy ? "이동 중..." : children}
    </button>
  );
};
