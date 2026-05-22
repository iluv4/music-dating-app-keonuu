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

// 약관 전문 — MVP용 기본 문안 (정식 서비스 전 법무 검토 권장)
const TERM_BODIES: Record<string, string> = {
  service: `제1조 (목적)
본 약관은 회원이 본 서비스(이하 "서비스")를 이용함에 있어 회사와 회원 간의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.

제2조 (이용계약의 성립)
이용계약은 회원이 본 약관에 동의하고 회사가 정한 가입 절차를 완료함으로써 성립합니다.

제3조 (서비스의 제공)
회사는 음악 취향 기반의 매칭 및 대화 기능을 제공합니다. 회사는 운영상·기술상 필요에 따라 서비스의 내용을 변경할 수 있습니다.

제4조 (회원의 의무)
회원은 타인의 정보를 도용하거나, 서비스 운영을 방해하는 행위, 관련 법령 및 공서양속에 반하는 행위를 하여서는 안 됩니다.

제5조 (이용제한)
회사는 회원이 본 약관을 위반한 경우 사전 통지 후 서비스 이용을 제한하거나 이용계약을 해지할 수 있습니다.`,
  privacy: `1. 수집하는 개인정보 항목
- 필수: 이메일, 비밀번호, 이름, 출생연도, 성별, 학교, 전공
- 서비스 이용 과정에서 생성되는 정보: 선택한 음악, 매칭/대화 기록

2. 개인정보의 수집·이용 목적
- 회원 식별 및 가입 의사 확인
- 음악 취향 기반 매칭 및 대화 서비스 제공
- 고객 문의 응대 및 부정 이용 방지

3. 보유 및 이용 기간
- 회원 탈퇴 시까지 보유하며, 탈퇴 후 관계 법령에 따른 보존 의무가 있는 경우 해당 기간 동안 보관합니다.

4. 동의 거부 권리
- 회원은 개인정보 수집·이용에 대한 동의를 거부할 권리가 있으나, 필수 항목 거부 시 서비스 이용이 제한됩니다.`,
  thirdParty: `1. 제공받는 자
- 매칭 상대 회원 (대화 기능 제공 목적)

2. 제공하는 항목
- 이름, 학교, 성별, 선택한 음악 등 매칭에 필요한 최소한의 프로필 정보

3. 제공받는 자의 이용 목적
- 회원 간 매칭 성사 및 대화 진행

4. 보유 및 이용 기간
- 매칭 관계가 유지되는 기간 동안이며, 매칭 종료 또는 회원 탈퇴 시 관련 법령에 따라 처리됩니다.

※ 회원은 본 동의를 거부할 수 있으나, 거부 시 매칭 서비스 이용이 제한됩니다.`,
};

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
  const [viewing, setViewing] = useState<TermItem | null>(null);
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
                onClick={() => setViewing(t)}
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

      {/* 약관 전문 모달 */}
      {viewing && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-end",
            zIndex: 100,
          }}
          onClick={() => setViewing(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "390px",
              maxHeight: "75vh",
              background: "white",
              borderTopLeftRadius: "20px",
              borderTopRightRadius: "20px",
              padding: "24px 24px 32px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <h2
                style={{
                  ...TYPOGRAPHY.bodyBold,
                  fontSize: "17px",
                  color: COLORS.text.primary,
                  margin: 0,
                }}
              >
                {viewing.label.replace("(필수) ", "")}
              </h2>
              <button
                type="button"
                aria-label="닫기"
                onClick={() => setViewing(null)}
                style={{
                  fontSize: "22px",
                  color: COLORS.text.secondary,
                  background: "none",
                  border: "none",
                  minWidth: "44px",
                  minHeight: "44px",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>
            <div
              style={{
                overflowY: "auto",
                ...TYPOGRAPHY.label,
                color: COLORS.text.secondary,
                lineHeight: 1.65,
                whiteSpace: "pre-wrap",
              }}
            >
              {TERM_BODIES[viewing.id] ?? "준비 중입니다."}
            </div>
          </div>
        </div>
      )}
    </PhoneFrame>
  );
}
