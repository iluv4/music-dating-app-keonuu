import { type CSSProperties, useEffect, useRef, useState } from "react";
import {
  json,
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "@remix-run/node";
import { Form, useActionData, useLoaderData, useNavigate, useNavigation, useFetcher } from "@remix-run/react";
import { getUser, requireUser } from "~/lib/auth.server";
import { upsertProfile } from "~/lib/repos/profiles.server";
import { captureServer } from "~/lib/analytics.server";
import StatusBar from "~/components/StatusBar";
import HomeIndicator from "~/components/HomeIndicator";
import PhoneFrame from "~/components/PhoneFrame";
import ProgressDots from "~/components/ProgressDots";
import TextInput from "~/components/TextInput";
import CampusSelect from "~/components/CampusSelect";
import SignupStepNav from "~/components/SignupStepNav";
import { PrimaryButton } from "~/components/Button";
import { COLORS, TYPOGRAPHY } from "~/lib/constants";
import { DEFAULT_SCHOOL, isCampus, schoolRequiresCampus, type Campus } from "~/lib/campus";

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

// 카카오 로그인 사용자는 기본 동의항목(닉네임/이름)으로 이름을 미리 채운다.
export async function loader({ request }: LoaderFunctionArgs) {
  const { user, headers } = await getUser(request);
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const pick = (k: string) =>
    typeof meta[k] === "string" ? (meta[k] as string).trim() : "";
  const kakaoName =
    pick("name") || pick("full_name") || pick("nickname") || pick("preferred_username");
  return json({ kakaoName }, { headers });
}

type ActionData = { error: string };

// 가입 핵심 정보만 입력 — 이름·출생년·성별·학교(+캠퍼스). 전공/동아리/지역/사진은 가입 후로 미룸.
// 여기서 프로필 행을 즉시 생성해(미승인 상태) 이탈 전에 사용자를 확보하고, 바로 장르 선택으로 넘긴다.
export async function action({ request }: ActionFunctionArgs) {
  const ctx = await requireUser(request);
  const fd = await request.formData();

  const name = String(fd.get("name") ?? "").trim();
  const birthYear = Number(String(fd.get("birth_year") ?? "").trim());
  const gender = String(fd.get("gender") ?? "").trim();
  const school = String(fd.get("school") ?? "").trim().slice(0, 80);
  const campusRaw = String(fd.get("campus") ?? "").trim();
  const campus = isCampus(campusRaw) ? campusRaw : "";
  // 연락처는 숫자만 저장(하이픈 제거). 휴대폰 번호 형식만 허용.
  const phone = String(fd.get("phone") ?? "").replace(/\D/g, "");

  const campusOk = !schoolRequiresCampus(school) || !!campus;
  const phoneOk = /^01[016789]\d{7,8}$/.test(phone);
  if (
    !name ||
    !birthYear ||
    birthYear < 1950 ||
    birthYear > CURRENT_YEAR ||
    (gender !== "male" && gender !== "female") ||
    school.length < 2 ||
    !campusOk ||
    !phoneOk
  ) {
    return json<ActionData>(
      { error: "입력 정보를 확인해주세요." },
      { status: 400, headers: ctx.headers },
    );
  }

  const result = await upsertProfile(ctx.supabase, {
    user_id: ctx.user.id,
    name,
    birth_year: birthYear,
    gender,
    school,
    campus: campus || null,
    phone,
    bank_holder: null,
  });

  if (!result.ok) {
    return json<ActionData>(
      { error: "저장 중 오류가 발생했어요. 잠시 후 다시 시도해주세요." },
      { status: 500, headers: ctx.headers },
    );
  }

  await captureServer(ctx.user.id, "profile.created", { gender });

  return redirect("/genre", { headers: ctx.headers });
}

export default function ProfileBasic() {
  const navigate = useNavigate();
  const navigation = useNavigation();
  const { kakaoName } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const tracker = useFetcher();
  const formRef = useRef<HTMLFormElement>(null);
  const submitting = navigation.state === "submitting";

  const [name, setName] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "">("");
  const [school, setSchool] = useState(DEFAULT_SCHOOL.name);
  const [campus, setCampus] = useState<Campus | "">("");
  const [phone, setPhone] = useState("");

  // 가입 이탈 추적: 이 단계 진입을 서버에 기록.
  useEffect(() => {
    tracker.submit(
      { step: "profile_basic" },
      { method: "post", action: "/profile/track" },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 카카오 이름 자동 채움 — 사용자가 아직 입력하지 않았을 때만 1회.
  useEffect(() => {
    if (kakaoName) setName((prev) => prev || kakaoName);
  }, [kakaoName]);

  const needsCampus = schoolRequiresCampus(school);

  // 학교를 바꾸면 캠퍼스는 학교별이라 초기화한다.
  const selectSchool = (next: string) => {
    if (next === school) return;
    setSchool(next);
    setCampus("");
  };

  const yearNum = Number(birthYear);
  const phoneValid = /^01[016789]\d{7,8}$/.test(phone);
  const canNext =
    name.trim().length >= 1 &&
    /^\d{4}$/.test(birthYear) &&
    yearNum >= 1950 &&
    yearNum <= CURRENT_YEAR &&
    (gender === "male" || gender === "female") &&
    school.trim().length >= 2 &&
    (!needsCampus || campus !== "") &&
    phoneValid &&
    !submitting;

  // 표시용 포맷(010-1234-5678) — 상태에는 숫자만 보관.
  const formatPhone = (digits: string) => {
    const d = digits.slice(0, 11);
    if (d.length < 4) return d;
    if (d.length < 8) return `${d.slice(0, 3)}-${d.slice(3)}`;
    return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  };

  return (
    <PhoneFrame>
      <StatusBar />
      <Form ref={formRef} method="post" style={{ display: "contents" }}>
        <input type="hidden" name="name" value={name} />
        <input type="hidden" name="birth_year" value={birthYear} />
        <input type="hidden" name="gender" value={gender} />
        <input type="hidden" name="school" value={school} />
        <input type="hidden" name="campus" value={campus} />
        <input type="hidden" name="phone" value={phone} />

        <SignupStepNav
          onBack={() => navigate("/welcome")}
          onNext={() => canNext && formRef.current?.requestSubmit()}
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
            <span style={{ color: COLORS.accent }}>기본 정보</span>만<br />
            입력하면 끝!
          </h1>
          <p
            style={{
              ...TYPOGRAPHY.body,
              color: COLORS.text.helper,
              margin: 0,
              marginBottom: "32px",
            }}
          >
            나머지 프로필은 가입 후 천천히 채울 수 있어요.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <TextInput
              label="이름"
              type="text"
              placeholder="홍길동"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <TextInput
              label="태어난 연도"
              type="text"
              inputMode="numeric"
              maxLength={4}
              placeholder="태어난 연도를 입력해주세요 (예: 2002)"
              value={birthYear}
              onChange={(e) =>
                setBirthYear(e.target.value.replace(/\D/g, "").slice(0, 4))
              }
            />
            <TextInput
              label="연락처"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              placeholder="010-1234-5678"
              value={formatPhone(phone)}
              onChange={(e) =>
                setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))
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
                  onClick={() => setGender("male")}
                  style={genderBtnStyle(gender === "male")}
                >
                  남성 ♂
                </button>
                <button
                  type="button"
                  onClick={() => setGender("female")}
                  style={genderBtnStyle(gender === "female")}
                >
                  여성 ♀
                </button>
              </div>
            </div>
            <CampusSelect
              label="학교"
              school={school}
              campus={campus}
              onSchoolChange={selectSchool}
              onCampusChange={(c) => setCampus(c)}
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
            type="submit"
            disabled={!canNext}
            style={{ width: "100%" }}
          >
            {submitting ? "저장 중..." : "다음으로"}
          </PrimaryButton>
        </div>
      </Form>
      <HomeIndicator />
    </PhoneFrame>
  );
}
