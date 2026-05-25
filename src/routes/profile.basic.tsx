import { useEffect, type CSSProperties } from "react";
import { useNavigate } from "@remix-run/react";
import StatusBar from "~/components/StatusBar";
import HomeIndicator from "~/components/HomeIndicator";
import PhoneFrame from "~/components/PhoneFrame";
import ProgressDots from "~/components/ProgressDots";
import TextInput from "~/components/TextInput";
import DeptSelect from "~/components/DeptSelect";
import ClubSelect from "~/components/ClubSelect";
import SignupStepNav from "~/components/SignupStepNav";
import { PrimaryButton } from "~/components/Button";
import { COLORS, TYPOGRAPHY } from "~/lib/constants";
import { useProfile } from "~/lib/profile-state";

const CURRENT_YEAR = new Date().getFullYear();
const DEFAULT_SCHOOL = "상명대학교 천안";
const NEXT = "/profile/payment";

const genderBtnStyle = (selected: boolean): CSSProperties => ({
  flex: 1,
  height: "56px",
  borderRadius: "12px",
  border: "none",
  background: selected ? COLORS.accentSoft : COLORS.cardBg,
  color: selected ? COLORS.accent : COLORS.text.primary,
  ...TYPOGRAPHY.bodyBold,
});

// 가입 정보 입력 — 기존 basic(이름/연도/성별) + school(학교/학과/동아리)을 한 화면으로 통합.
// 상명대 천안 단일 캠퍼스라 학교는 자동입력·읽기전용. 이탈 줄이기 위한 단계 축소.
export default function ProfileBasic() {
  const navigate = useNavigate();
  const { state, update, hydrated } = useProfile();

  useEffect(() => {
    if (hydrated && !state.school.trim()) update({ school: DEFAULT_SCHOOL });
  }, [hydrated, state.school]);

  const yearNum = Number(state.birthYear);
  const canNext =
    hydrated &&
    state.name.trim().length >= 1 &&
    /^\d{4}$/.test(state.birthYear) &&
    yearNum >= 1950 &&
    yearNum <= CURRENT_YEAR &&
    (state.gender === "male" || state.gender === "female") &&
    state.major.trim().length >= 2;

  return (
    <PhoneFrame>
      <StatusBar />
      <SignupStepNav
        onBack={() => navigate(-1)}
        onNext={() => canNext && navigate(NEXT)}
        canNext={canNext}
      />
      <div
        style={{
          flex: 1,
          padding: "0 25px",
          paddingBottom: "120px",
          position: "relative",
          overflowY: "auto",
        }}
      >
        <div style={{ marginTop: "30px", marginBottom: "30px" }}>
          <ProgressDots total={2} current={1} />
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
          <span style={{ color: COLORS.accent }}>프로필 정보</span>를<br />
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
          상명대 천안캠퍼스 전용 서비스예요. 한 번에 입력하면 끝!
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
            placeholder="예) 2003"
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
          <TextInput
            label="학교"
            type="text"
            value={state.school || DEFAULT_SCHOOL}
            readOnly
            aria-readonly="true"
            style={{ background: COLORS.divider2, color: COLORS.text.secondary }}
            onChange={() => {}}
          />
          <DeptSelect
            label="학과"
            value={state.major}
            onChange={(major) => update({ major })}
          />
          <ClubSelect
            label="동아리"
            value={state.club}
            onChange={(club) => update({ club })}
          />
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
          onClick={() => navigate(NEXT)}
          style={{ width: "100%" }}
        >
          다음으로
        </PrimaryButton>
      </div>
      <HomeIndicator />
    </PhoneFrame>
  );
}
