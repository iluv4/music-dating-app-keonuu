import { Link, useNavigate } from "@remix-run/react";
import StatusBar from "~/components/StatusBar";
import HomeIndicator from "~/components/HomeIndicator";
import PhoneFrame from "~/components/PhoneFrame";
import { PrimaryButton } from "~/components/Button";
import { KakaoButton } from "~/components/SocialButton";
import { COLORS, TYPOGRAPHY } from "~/lib/constants";

export default function Welcome() {
  const navigate = useNavigate();

  return (
    <PhoneFrame>
      <StatusBar />

      {/* 본문 — flex 로 채워서 화면 높이에 상관없이 안정적으로 배치 */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 20px",
          textAlign: "center",
        }}
      >
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
          {[16, 9, 9].map((s, i) => (
            <span
              key={i}
              style={{
                width: `${s}px`,
                height: `${s}px`,
                borderRadius: "50%",
                background: COLORS.accentSoft,
                alignSelf: "center",
              }}
            />
          ))}
        </div>

        <h1 style={{ ...TYPOGRAPHY.display, color: COLORS.accent, margin: 0 }}>
          환영합니다!
        </h1>

        <p
          style={{
            ...TYPOGRAPHY.body,
            color: COLORS.text.helper,
            margin: "16px 0 0",
            lineHeight: 1.6,
          }}
        >
          <span style={{ fontWeight: 700, color: COLORS.text.primary }}>노래</span>
          로 이어지는{" "}
          <span style={{ fontWeight: 700, color: COLORS.text.primary }}>인연</span>
          <br />
          지금 만나러 가볼까요?
        </p>

        <img
          src="/images/welcome-mascot.png"
          alt=""
          style={{
            width: "100%",
            maxWidth: "300px",
            marginTop: "28px",
            objectFit: "contain",
          }}
        />
      </div>

      {/* 하단 액션 — 항상 화면 하단에 고정, 화면 밖으로 안 밀림 */}
      <div
        style={{
          padding: "0 20px 16px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <PrimaryButton
          onClick={() => navigate("/terms")}
          style={{ width: "100%", maxWidth: "350px" }}
        >
          시작하기
        </PrimaryButton>

        <KakaoButton style={{ width: "100%", maxWidth: "350px" }}>
          카카오로 3초 만에 시작
        </KakaoButton>

        <div
          style={{
            ...TYPOGRAPHY.body,
            color: COLORS.text.secondary,
            marginTop: "4px",
          }}
        >
          이미 계정 있어요?{" "}
          <Link
            to="/login"
            style={{ color: COLORS.accent, fontWeight: 700, textDecoration: "none" }}
          >
            로그인
          </Link>
        </div>
      </div>

      <HomeIndicator />
    </PhoneFrame>
  );
}
