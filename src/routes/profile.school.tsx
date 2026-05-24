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

export default function ProfileSchool() {
  const navigate = useNavigate();
  const { state, update, hydrated } = useProfile();

  const canNext =
    hydrated &&
    state.school.trim().length >= 2 &&
    state.major.trim().length >= 2;

  return (
    <PhoneFrame>
      <StatusBar />
      <SignupStepNav
        onBack={() => navigate(-1)}
        onNext={() => navigate("/profile/payment")}
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
          <ProgressDots total={4} current={3} />
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
          <span style={{ color: COLORS.accent }}>학교</span>를
          <br />
          알려주세요!
        </h1>
        <p
          style={{
            ...TYPOGRAPHY.body,
            color: COLORS.text.helper,
            margin: 0,
            marginBottom: "32px",
          }}
        >
          재학 중인 학교와 학과를 입력해주세요.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <TextInput
            label="학교"
            type="text"
            placeholder="상명대학교 천안"
            value={state.school}
            onChange={(e) => update({ school: e.target.value })}
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
          onClick={() => navigate("/profile/payment")}
          style={{ width: "100%" }}
        >
          다음으로
        </PrimaryButton>
      </div>
      <HomeIndicator />
    </PhoneFrame>
  );
}
