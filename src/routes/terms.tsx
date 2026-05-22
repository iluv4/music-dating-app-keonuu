import { useState } from "react";
import { useNavigate } from "@remix-run/react";
import StatusBar from "~/components/StatusBar";
import HomeIndicator from "~/components/HomeIndicator";
import PhoneFrame from "~/components/PhoneFrame";
import ProgressDots from "~/components/ProgressDots";
import SignupStepNav from "~/components/SignupStepNav";
import { PrimaryButton } from "~/components/Button";
import { COLORS, TYPOGRAPHY, RADIUS } from "~/lib/constants";

// 약관은 회원가입 전 단계 — 익명 접근 가능

type TermItem = {
  id: string;
  label: string;
};

const TERMS: TermItem[] = [
  { id: "service", label: "(필수) 이용약관" },
  { id: "privacy", label: "(필수) 개인정보 수집 및 이용 안내" },
  { id: "thirdParty", label: "(필수) 제 3자 제공 동의" },
];

const Check = ({ checked, size = 22 }: { checked: boolean; size?: number }) => (
  <span
    style={{
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: "50%",
      background: checked ? COLORS.accent : "#e5e5e5",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      transition: "background 0.15s",
    }}
  >
    <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
      <path
        d="M1 4.5L4 7.5L10 1"
        stroke="white"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </span>
);

export default function Terms() {
  const navigate = useNavigate();
  const [agreed, setAgreed] = useState<Record<string, boolean>>({});
  const allChecked = TERMS.every((t) => agreed[t.id]);

  const toggle = (id: string) =>
    setAgreed((prev) => ({ ...prev, [id]: !prev[id] }));

  const toggleAll = () => {
    const next = !allChecked;
    setAgreed(
      TERMS.reduce<Record<string, boolean>>((acc, t) => {
        acc[t.id] = next;
        return acc;
      }, {}),
    );
  };

  const goNext = () => {
    if (allChecked) navigate("/signup");
  };

  return (
    <PhoneFrame>
      <StatusBar />

      <SignupStepNav
        onBack={() => navigate(-1)}
        onNext={goNext}
        canNext={allChecked}
      />

      <div
        style={{
          flex: 1,
          padding: "0 25px 16px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ marginTop: "24px", marginBottom: "28px" }}>
          <ProgressDots total={4} current={1} />
        </div>

        <h1
          style={{
            ...TYPOGRAPHY.headlineMd,
            color: COLORS.text.primary,
            margin: 0,
            marginBottom: "12px",
            lineHeight: 1.25,
          }}
        >
          <span style={{ color: COLORS.accent }}>약관</span>을
          <br />
          확인해주세요!
        </h1>
        <p
          style={{
            ...TYPOGRAPHY.body,
            color: COLORS.text.helper,
            margin: 0,
            marginBottom: "28px",
          }}
        >
          서비스를 시작하기 위해 약관에 동의해주세요.
        </p>

        {/* 전체동의 */}
        <button
          type="button"
          onClick={toggleAll}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "18px",
            background: allChecked ? COLORS.accentSoft : COLORS.cardBg,
            borderRadius: RADIUS.card,
            border: "none",
            textAlign: "left",
            marginBottom: "8px",
            transition: "background 0.15s",
          }}
        >
          <Check checked={allChecked} />
          <span
            style={{
              ...TYPOGRAPHY.bodyBold,
              color: allChecked ? COLORS.accent : COLORS.text.primary,
            }}
          >
            약관 전체동의
          </span>
        </button>

        {/* 개별 항목 */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
          }}
        >
          {TERMS.map((t) => (
            <div
              key={t.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "14px 8px",
              }}
            >
              <button
                type="button"
                onClick={() => toggle(t.id)}
                aria-label={`${t.label} 동의`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  flex: 1,
                  padding: 0,
                  background: "none",
                  border: "none",
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <Check checked={!!agreed[t.id]} size={20} />
                <span
                  style={{
                    ...TYPOGRAPHY.body,
                    color: agreed[t.id] ? COLORS.text.primary : COLORS.text.secondary,
                  }}
                >
                  {t.label}
                </span>
              </button>
              <button
                type="button"
                aria-label={`${t.label} 전문 보기`}
                onClick={() => alert(`${t.label} 전문 (추후 구현)`)}
                style={{
                  color: COLORS.text.placeholder,
                  fontSize: "20px",
                  minWidth: "44px",
                  minHeight: "44px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "none",
                  border: "none",
                  flexShrink: 0,
                  cursor: "pointer",
                }}
              >
                ›
              </button>
            </div>
          ))}
        </div>

        {/* 본문과 버튼 사이 여백 */}
        <div style={{ flex: 1, minHeight: "24px" }} />

        <PrimaryButton
          type="button"
          onClick={goNext}
          disabled={!allChecked}
          style={{ width: "100%" }}
        >
          다음으로
        </PrimaryButton>
      </div>
      <HomeIndicator />
    </PhoneFrame>
  );
}
