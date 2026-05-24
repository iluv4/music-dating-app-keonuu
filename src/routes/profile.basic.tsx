import type { CSSProperties } from "react";
import { useNavigate } from "@remix-run/react";
import StatusBar from "~/components/StatusBar";
import HomeIndicator from "~/components/HomeIndicator";
import PhoneFrame from "~/components/PhoneFrame";
import ProgressDots from "~/components/ProgressDots";
import TextInput from "~/components/TextInput";
import SignupStepNav from "~/components/SignupStepNav";
import { PrimaryButton } from "~/components/Button";
import { COLORS, TYPOGRAPHY } from "~/lib/constants";
import { useProfile } from "~/lib/profile-state";

const CURRENT_YEAR = new Date().getFullYear();

const genderBtnStyle = (selected: boolean): CSSProperties => ({
  flex: 1,
  height: "56px",
  borderRadius: "12px",
  border: "none",
  background: selected ? COLORS.accentSoft : COLORS.cardBg,
  color: selected ? COLORS.accent : COLORS.text.primary,
  ...TYPOGRAPHY.bodyBold,
});

export default function ProfileBasic() {
  const navigate = useNavigate();
  const { state, update, hydrated } = useProfile();

  const yearNum = Number(state.birthYear);
  const canNext =
    hydrated &&
    state.name.trim().length >= 1 &&
    /^\d{4}$/.test(state.birthYear) &&
    yearNum >= 1950 &&
    yearNum <= CURRENT_YEAR &&
    (state.gender === "male" || state.gender === "female");

  return (
    <PhoneFrame>
      <StatusBar />
      <SignupStepNav
        onBack={() => navigate(-1)}
        onNext={() => navigate("/profile/school")}
        canNext={canNext}
      />
      <div
        style={{
          flex: 1,
          padding: "0 25px",
          paddingBottom: "120px",
          position: "relative",
        }}
      >
        <div style={{ marginTop: "30px", marginBottom: "30px" }}>
          <ProgressDots total={4} current={2} />
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
          기본 <span style={{ color: COLORS.accent }}>프로필 정보</span>를<br />
          작성해주세요!
        </h1>
        <p
          style={{
            ...TYPOGRAPHY.body,
            color: COLORS.text.helper,
            margin: 0,
            marginBottom: "32px",
          }}
        >
          가입을 위한 이름, 성별 및 나이를 작성해주세요.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <TextInput
            label="이름"
            type="text"
            placeholder="홍길동"
            value={state.name}
            onChange={(e) => update({ name: e.target.value })}
          />
          <TextInput
            label="태어난 연도"
            type="text"
            inputMode="numeric"
            maxLength={4}
            placeholder="2002"
            value={state.birthYear}
            onChange={(e) =>
              update({
                birthYear: e.target.value.replace(/\D/g, "").slice(0, 4),
              })
            }
          />
          <div>
            <div
              style={{
                ...TYPOGRAPHY.bodyBold,
                color: COLORS.text.primary,
                marginBottom: "10px",
              }}
            >
              성별
            </div>
            <div style={{ display: "flex", gap: "12px" }}>
              <button
                type="button"
                onClick={() => update({ gender: "male" })}
                style={genderBtnStyle(state.gender === "male")}
              >
                남성 ♂
              </button>
              <button
                type="button"
                onClick={() => update({ gender: "female" })}
                style={genderBtnStyle(state.gender === "female")}
              >
                여성 ♀
              </button>
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: "34px",
          left: "20px",
          right: "20px",
        }}
      >
        <PrimaryButton
          disabled={!canNext}
          onClick={() => navigate("/profile/school")}
          style={{ width: "100%" }}
        >
          다음으로
        </PrimaryButton>
      </div>
      <HomeIndicator />
    </PhoneFrame>
  );
}
