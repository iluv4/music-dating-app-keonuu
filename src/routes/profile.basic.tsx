import { type CSSProperties } from "react";
import { useNavigate } from "@remix-run/react";
import StatusBar from "~/components/StatusBar";
import HomeIndicator from "~/components/HomeIndicator";
import PhoneFrame from "~/components/PhoneFrame";
import ProgressDots from "~/components/ProgressDots";
import TextInput from "~/components/TextInput";
import CampusSelect from "~/components/CampusSelect";
import DeptSelect from "~/components/DeptSelect";
import ClubSelect from "~/components/ClubSelect";
import RegionSelect from "~/components/RegionSelect";
import MatchCampusPrefSelect from "~/components/MatchCampusPrefSelect";
import SignupStepNav from "~/components/SignupStepNav";
import { PrimaryButton } from "~/components/Button";
import { COLORS, TYPOGRAPHY } from "~/lib/constants";
import { useProfile } from "~/lib/profile-state";
import { schoolRequiresCampus, type Campus } from "~/lib/campus";

const CURRENT_YEAR = new Date().getFullYear();
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
// 학교는 직접 입력(주최교는 기본 제안). 캠퍼스가 나뉜 대학만 캠퍼스를 고른다.
export default function ProfileBasic() {
  const navigate = useNavigate();
  const { state, update, hydrated } = useProfile();

  const needsCampus = schoolRequiresCampus(state.school);

  // 학교를 바꾸면 캠퍼스·학과·동아리는 학교/캠퍼스별이라 초기화한다.
  const selectSchool = (school: string) => {
    if (school === state.school) return;
    update({ school, campus: "", major: "", club: "" });
  };

  // 캠퍼스를 바꾸면 학과·동아리는 캠퍼스별 목록이라 초기화한다.
  const selectCampus = (campus: Campus) => {
    if (campus === state.campus) return;
    update({ campus, major: "", club: "" });
  };

  const yearNum = Number(state.birthYear);
  const canNext =
    hydrated &&
    state.name.trim().length >= 1 &&
    /^\d{4}$/.test(state.birthYear) &&
    yearNum >= 1950 &&
    yearNum <= CURRENT_YEAR &&
    (state.gender === "male" || state.gender === "female") &&
    state.school.trim().length >= 2 &&
    (!needsCampus || state.campus !== "") &&
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
          음악 취향으로 만나는 대학생 소개팅. 한 번에 입력하면 끝!
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
          <CampusSelect
            label="학교"
            school={state.school}
            campus={state.campus}
            onSchoolChange={selectSchool}
            onCampusChange={selectCampus}
          />
          <DeptSelect
            label="학과"
            value={state.major}
            campus={state.campus}
            freeText={!needsCampus}
            onChange={(major) => update({ major })}
          />
          <ClubSelect
            label="동아리"
            value={state.club}
            campus={state.campus}
            onChange={(club) => update({ club })}
          />
          <RegionSelect
            label="거주지역"
            value={state.region}
            onChange={(region) => update({ region })}
          />
          {needsCampus && (
            <MatchCampusPrefSelect
              value={state.matchCampusPref}
              onChange={(matchCampusPref) => update({ matchCampusPref })}
            />
          )}
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
