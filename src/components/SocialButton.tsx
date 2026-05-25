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
        borderRadius: RADIUS.button,
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
