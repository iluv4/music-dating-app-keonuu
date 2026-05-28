import { type CSSProperties, useEffect, useRef } from "react";
import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { getUser } from "~/lib/auth.server";
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
const NEXT = "/profile/photo";

const genderBtnStyle = (selected: boolean): CSSProperties => ({
  flex: 1,
  height: "56px",
  borderRadius: "12px",
  border: "none",
  background: selected ? COLORS.accentSoft : COLORS.cardBg,
  color: selected ? COLORS.accent : COLORS.text.primary,
  ...TYPOGRAPHY.bodyBold,
});

// 카카오 로그인 사용자는 기본 동의항목(닉네임/이름)으로 이름을 미리 채운다.
// scope·동의항목 승인 없이 받을 수 있는 값만 사용 — 성별/나이는 직접 입력.
export async function loader({ request }: LoaderFunctionArgs) {
  const { user, headers } = await getUser(request);
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const pick = (k: string) =>
    typeof meta[k] === "string" ? (meta[k] as string).trim() : "";
  const kakaoName =
    pick("name") || pick("full_name") || pick("nickname") || pick("preferred_username");
  return json({ kakaoName }, { headers });
}

// 가입 정보 입력 — 기존 basic(이름/연도/성별) + school(학교/학과/동아리)을 한 화면으로 통합.
// 학교는 직접 입력(주최교는 기본 제안). 캠퍼스가 나뉜 대학만 캠퍼스를 고른다.
export default function ProfileBasic() {
  const navigate = useNavigate();
  const { kakaoName } = useLoaderData<typeof loader>();
  const { state, update, hydrated } = useProfile();

  // 카카오 이름 자동 채움 — 사용자가 아직 입력하지 않았을 때만 1회.
  const prefilled = useRef(false);
  useEffect(() => {
    if (hydrated && !prefilled.current && kakaoName && !state.name) {
      prefilled.current = true;
      update({ name: kakaoName });
    }
  }, [hydrated, kakaoName, state.name, update]);

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
        onBack={() => navigate("/welcome")}
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
        <img
          src="/images/logo.png"
          alt="pliting"
          style={{
            width: "120px",
            height: "auto",
            objectFit: "contain",
            marginTop: "20px",
            marginBottom: "16px",
            display: "block",
          }}
        />

        <div style={{ marginBottom: "30px" }}>
          <ProgressDots total={3} current={1} />
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
            placeholder="태어난 연도를 입력해주세요 (예: 2002)"
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
