import { useState } from "react";
import { useNavigate } from "@remix-run/react";
import StatusBar from "~/components/StatusBar";
import HomeIndicator from "~/components/HomeIndicator";
import PhoneFrame from "~/components/PhoneFrame";
import ProgressDots from "~/components/ProgressDots";
import SignupStepNav from "~/components/SignupStepNav";
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
          padding: "0 25px",
          paddingBottom: "120px",
          position: "relative",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ marginTop: "30px", marginBottom: "30px" }}>
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
          }}
        >
          서비스를 시작하기위해 약관을 확인해주세요.
        </p>

        {/* 약관 영역 — 하단으로 밀어내기 위해 flex spacer */}
        <div style={{ flex: 1 }} />

        {/* 전체동의 박스 */}
        <button
          type="button"
          onClick={toggleAll}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "16px 18px",
            background: COLORS.cardBg,
            borderRadius: RADIUS.alert,
            textAlign: "left",
            marginBottom: "20px",
          }}
        >
          <Check checked={allChecked} />
          <span
            style={{
              ...TYPOGRAPHY.body,
              fontWeight: 600,
              color: COLORS.text.secondary,
            }}
          >
            약관 전체동의
          </span>
        </button>

        {/* 개별 항목 */}
        <div
          style={{
            padding: "0 8px",
            display: "flex",
            flexDirection: "column",
            gap: "18px",
          }}
        >
          {TERMS.map((t) => (
            <div
              key={t.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
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
                  textAlign: "left",
                }}
              >
                <Check checked={!!agreed[t.id]} size={20} />
                <span
                  style={{
                    ...TYPOGRAPHY.body,
                    color: COLORS.text.secondary,
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
                  padding: "4px 6px",
                  flexShrink: 0,
                }}
              >
                ›
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 다음으로 — 풀폭 */}
      <div
        style={{
          position: "absolute",
          bottom: "34px",
          left: "20px",
          right: "20px",
        }}
      >
        <button
          type="button"
          onClick={goNext}
          disabled={!allChecked}
          style={{
            width: "100%",
            height: "56px",
            borderRadius: RADIUS.pill,
            background: COLORS.accent,
            color: "white",
            ...TYPOGRAPHY.title,
            fontSize: "17px",
            cursor: allChecked ? "pointer" : "not-allowed",
            opacity: allChecked ? 1 : 0.7,
          }}
        >
          다음으로
        </button>
      </div>
      <HomeIndicator />
    </PhoneFrame>
  );
}
