import { COLORS } from "~/lib/constants";

type Props = {
  // onBack 미지정 시 뒤로가기 버튼을 숨긴다(가입 후 첫 단계 등 되돌아갈 곳이 없는 경우).
  onBack?: () => void;
  onNext: () => void;
  canNext: boolean;
};

// 회원가입 흐름 (terms / signup / profile.basic / profile.school / profile.payment) 의
// 공통 상단 네비. 좌측 뒤로 + 중앙 placeholder pill + 우측 앞으로.
export const SignupStepNav = ({ onBack, onNext, canNext }: Props) => (
  <div
    style={{
      height: "52px",
      padding: "0 12px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      flexShrink: 0,
    }}
  >
    {onBack ? (
      <button
        type="button"
        aria-label="뒤로"
        onClick={onBack}
        style={{
          width: "40px",
          height: "40px",
          fontSize: "24px",
          color: COLORS.text.secondary,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "none",
        }}
      >
        ‹
      </button>
    ) : (
      <span style={{ width: "40px", height: "40px", flexShrink: 0 }} />
    )}
    <div
      style={{
        flex: 1,
        margin: "0 8px",
        height: "14px",
        borderRadius: "100px",
        background: "#e5e5e5",
        maxWidth: "220px",
      }}
    />
    <button
      type="button"
      aria-label="다음"
      onClick={onNext}
      disabled={!canNext}
      style={{
        width: "40px",
        height: "40px",
        fontSize: "24px",
        color: canNext ? COLORS.text.secondary : "#cfcfcf",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: canNext ? "pointer" : "default",
        border: "none",
      }}
    >
      ›
    </button>
  </div>
);

export default SignupStepNav;
