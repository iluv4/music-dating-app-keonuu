import type { CSSProperties } from "react";
import { useState } from "react";
import {
  json,
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "@remix-run/node";
import {
  Form,
  useActionData,
  useLoaderData,
  useNavigate,
  useNavigation,
} from "@remix-run/react";
import StatusBar from "~/components/StatusBar";
import HomeIndicator from "~/components/HomeIndicator";
import PhoneFrame from "~/components/PhoneFrame";
import TextInput from "~/components/TextInput";
import CampusSelect from "~/components/CampusSelect";
import DeptSelect from "~/components/DeptSelect";
import RegionSelect from "~/components/RegionSelect";
import MatchCampusPrefSelect from "~/components/MatchCampusPrefSelect";
import { PrimaryButton } from "~/components/Button";
import { COLORS, TYPOGRAPHY } from "~/lib/constants";
import { requireUser } from "~/lib/auth.server";
import {
  DEFAULT_SCHOOL,
  isCampus,
  isMatchCampusPref,
  type Campus,
  type MatchCampusPref,
} from "~/lib/campus";
import {
  getProfileFields,
  updateProfile,
} from "~/lib/repos/profiles.server";

const CURRENT_YEAR = new Date().getFullYear();

export async function loader({ request }: LoaderFunctionArgs) {
  const ctx = await requireUser(request);
  const profile = await getProfileFields(ctx.supabase, ctx.user.id, [
    "name",
    "birth_year",
    "gender",
    "school",
    "campus",
    "major",
    "region",
    "match_campus_pref",
    "bank_holder",
  ]);

  if (!profile) {
    throw redirect("/profile/basic", { headers: ctx.headers });
  }

  return json({ profile }, { headers: ctx.headers });
}

type ActionData = { error: string };

export async function action({ request }: ActionFunctionArgs) {
  const ctx = await requireUser(request);
  const fd = await request.formData();

  const name = String(fd.get("name") ?? "").trim();
  const birthYearStr = String(fd.get("birth_year") ?? "").trim();
  const gender = String(fd.get("gender") ?? "").trim();
  const campusRaw = String(fd.get("campus") ?? "").trim();
  const campus = isCampus(campusRaw) ? campusRaw : "";
  const school = DEFAULT_SCHOOL.name;
  const major = String(fd.get("major") ?? "").trim();
  const region = String(fd.get("region") ?? "").trim();
  const matchPrefRaw = String(fd.get("match_campus_pref") ?? "").trim();
  const matchCampusPref = isMatchCampusPref(matchPrefRaw) ? matchPrefRaw : "상관없음";
  const bankHolder = String(fd.get("bank_holder") ?? "").trim();

  const birthYear = Number(birthYearStr);
  if (!name)
    return json<ActionData>(
      { error: "이름을 입력해주세요." },
      { status: 400, headers: ctx.headers },
    );
  if (!birthYear || birthYear < 1950 || birthYear > CURRENT_YEAR)
    return json<ActionData>(
      { error: "출생연도를 확인해주세요." },
      { status: 400, headers: ctx.headers },
    );
  if (gender !== "male" && gender !== "female")
    return json<ActionData>(
      { error: "성별을 선택해주세요." },
      { status: 400, headers: ctx.headers },
    );
  if (!campus)
    return json<ActionData>(
      { error: "캠퍼스를 선택해주세요." },
      { status: 400, headers: ctx.headers },
    );
  if (major.length < 2)
    return json<ActionData>(
      { error: "학과명을 확인해주세요." },
      { status: 400, headers: ctx.headers },
    );
  if (bankHolder.length < 2)
    return json<ActionData>(
      { error: "입금자명을 확인해주세요." },
      { status: 400, headers: ctx.headers },
    );

  const result = await updateProfile(ctx.supabase, ctx.user.id, {
    name,
    birth_year: birthYear,
    gender,
    school,
    campus,
    major,
    region: region || null,
    match_campus_pref: matchCampusPref,
    bank_holder: bankHolder,
  });

  if (!result.ok) {
    return json<ActionData>(
      { error: "저장 중 오류가 발생했어요." },
      { status: 500, headers: ctx.headers },
    );
  }

  return redirect("/mypage", { headers: ctx.headers });
}

const genderBtnStyle = (selected: boolean): CSSProperties => ({
  flex: 1,
  height: "56px",
  borderRadius: "12px",
  border: "none",
  background: selected ? COLORS.accentSoft : "white",
  color: selected ? COLORS.accent : COLORS.text.primary,
  ...TYPOGRAPHY.bodyBold,
});

export default function ProfileEdit() {
  const { profile } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const navigate = useNavigate();
  const submitting = navigation.state === "submitting";

  const [name, setName] = useState(profile.name);
  const [birthYear, setBirthYear] = useState(String(profile.birth_year ?? ""));
  const [gender, setGender] = useState<"male" | "female">(
    profile.gender ?? "male",
  );
  const [campus, setCampus] = useState<Campus | "">(
    isCampus(profile.campus) ? profile.campus : "",
  );
  const [major, setMajor] = useState(profile.major);
  const [region, setRegion] = useState(profile.region ?? "");
  const [matchCampusPref, setMatchCampusPref] = useState<MatchCampusPref>(
    isMatchCampusPref(profile.match_campus_pref)
      ? profile.match_campus_pref
      : "상관없음",
  );
  const [bankHolder, setBankHolder] = useState(profile.bank_holder ?? "");

  // 캠퍼스를 바꾸면 학과는 캠퍼스별 목록이라 초기화.
  const selectCampus = (next: Campus) => {
    if (next === campus) return;
    setCampus(next);
    setMajor("");
  };

  const yearNum = Number(birthYear);
  const canSubmit =
    name.trim().length >= 1 &&
    /^\d{4}$/.test(birthYear) &&
    yearNum >= 1950 &&
    yearNum <= CURRENT_YEAR &&
    (gender === "male" || gender === "female") &&
    campus !== "" &&
    major.trim().length >= 2 &&
    bankHolder.trim().length >= 2 &&
    !submitting;

  return (
    <PhoneFrame>
      <StatusBar />
      <Form
        method="post"
        style={{
          flex: 1,
          padding: "0 25px",
          paddingBottom: "120px",
          position: "relative",
        }}
      >
        {/* 헤더 */}
        <div
          style={{
            position: "relative",
            height: "52px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <button
            type="button"
            onClick={() => navigate("/mypage")}
            aria-label="back"
            style={{
              position: "absolute",
              left: 0,
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: "22px",
              color: COLORS.text.secondary,
              background: "none",
              padding: "4px 6px",
            }}
          >
            ‹
          </button>
          <h1
            style={{
              ...TYPOGRAPHY.bodyBold,
              fontSize: "17px",
              color: COLORS.text.primary,
              margin: 0,
            }}
          >
            내 정보 수정
          </h1>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            marginTop: "20px",
          }}
        >
          <TextInput
            label="이름"
            name="name"
            type="text"
            placeholder="홍길동"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <TextInput
            label="출생연도"
            name="birth_year"
            type="text"
            inputMode="numeric"
            maxLength={4}
            placeholder="2002"
            value={birthYear}
            onChange={(e) =>
              setBirthYear(e.target.value.replace(/\D/g, "").slice(0, 4))
            }
          />

          {/* 성별 */}
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
            <input type="hidden" name="gender" value={gender} />
            <div style={{ display: "flex", gap: "12px" }}>
              <button
                type="button"
                onClick={() => setGender("male")}
                style={genderBtnStyle(gender === "male")}
              >
                남자
              </button>
              <button
                type="button"
                onClick={() => setGender("female")}
                style={genderBtnStyle(gender === "female")}
              >
                여자
              </button>
            </div>
          </div>

          <input type="hidden" name="campus" value={campus} />
          <CampusSelect label="학교" value={campus} onChange={selectCampus} />

          <input type="hidden" name="major" value={major} />
          <DeptSelect
            label="학과"
            value={major}
            campus={campus}
            onChange={setMajor}
          />

          <input type="hidden" name="region" value={region} />
          <RegionSelect label="거주지역" value={region} onChange={setRegion} />

          <input
            type="hidden"
            name="match_campus_pref"
            value={matchCampusPref}
          />
          <MatchCampusPrefSelect
            value={matchCampusPref}
            onChange={setMatchCampusPref}
          />

          <TextInput
            label="입금자명"
            name="bank_holder"
            type="text"
            placeholder="홍길동"
            value={bankHolder}
            onChange={(e) => setBankHolder(e.target.value)}
          />
        </div>

        {actionData?.error && (
          <p
            style={{
              ...TYPOGRAPHY.caption,
              color: COLORS.accent,
              marginTop: "16px",
            }}
          >
            {actionData.error}
          </p>
        )}

        <div
          style={{
            position: "absolute",
            bottom: "34px",
            left: "50%",
            transform: "translateX(-50%)",
          }}
        >
          <PrimaryButton type="submit" disabled={!canSubmit}>
            {submitting ? "저장 중..." : "저장"}
          </PrimaryButton>
        </div>
      </Form>
      <HomeIndicator />
    </PhoneFrame>
  );
}
