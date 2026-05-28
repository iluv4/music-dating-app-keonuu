import { useEffect, useRef, useState } from "react";
import {
  json,
  redirect,
  type ActionFunctionArgs,
} from "@remix-run/node";
import {
  Form,
  useActionData,
  useFetcher,
  useNavigate,
  useNavigation,
} from "@remix-run/react";
import StatusBar from "~/components/StatusBar";
import HomeIndicator from "~/components/HomeIndicator";
import PhoneFrame from "~/components/PhoneFrame";
import ProgressDots from "~/components/ProgressDots";
import TextInput from "~/components/TextInput";
import SignupStepNav from "~/components/SignupStepNav";
import { PrimaryButton } from "~/components/Button";
import { COLORS, TYPOGRAPHY } from "~/lib/constants";
import { requireUser } from "~/lib/auth.server";
import { upsertProfile } from "~/lib/repos/profiles.server";
import { captureServer } from "~/lib/analytics.server";
import { notifySlack, buildPaymentNotice } from "~/lib/slack.server";
import { readProfile, type ProfileForm } from "~/lib/profile-state";
import {
  isCampus,
  isMatchCampusPref,
  schoolRequiresCampus,
} from "~/lib/campus";
import { capture } from "~/lib/analytics.client";
import type { Gender } from "~/lib/db-types";

type ActionData = { error: string };

export async function action({ request }: ActionFunctionArgs) {
  const ctx = await requireUser(request);
  const fd = await request.formData();

  // intent === "skip" → "나중에 입금할게요" (입금자명 없이 통과)
  const skip = String(fd.get("intent") ?? "submit") === "skip";

  const name = String(fd.get("name") ?? "").trim();
  const birthYearStr = String(fd.get("birth_year") ?? "").trim();
  const gender = String(fd.get("gender") ?? "").trim() || null;
  const campusRaw = String(fd.get("campus") ?? "").trim();
  const campus = isCampus(campusRaw) ? campusRaw : "";
  // 학교는 사용자가 직접 입력(주최교는 기본 제안). 다른 대학도 가입 가능.
  const school = String(fd.get("school") ?? "").trim().slice(0, 80);
  const major = String(fd.get("major") ?? "").trim();
  const club = String(fd.get("club") ?? "").trim();
  const region = String(fd.get("region") ?? "").trim();
  const matchPrefRaw = String(fd.get("match_campus_pref") ?? "").trim();
  const matchCampusPref = isMatchCampusPref(matchPrefRaw) ? matchPrefRaw : "상관없음";
  const bankHolder = String(fd.get("bank_holder") ?? "").trim();

  // 사진 경로 — 본인 폴더(`${userId}/...`) 안 안전한 경로만 허용. 빈값/이상값이면 미저장.
  const photoPathRaw = String(fd.get("photo_path") ?? "").trim();
  const photoPath =
    photoPathRaw &&
    photoPathRaw.startsWith(`${ctx.user.id}/`) &&
    !photoPathRaw.includes("..") &&
    !photoPathRaw.includes("://")
      ? photoPathRaw
      : null;

  // 여성은 참가비 무료 — 입금자명 없이 통과(성비 불균형 완화).
  // self-declared 성별이라 어뷰징(남→여 위장)은 관리자 수동 승인에서 거른다.
  const free = gender === "female";

  const birthYear = Number(birthYearStr);
  // 캠퍼스가 나뉜 대학만 캠퍼스 필수.
  const campusOk = !schoolRequiresCampus(school) || !!campus;
  // 스킵·무료(여성)가 아니면 입금자명 필수
  const bankRequired = !skip && !free;
  if (!name || !birthYear || !school || !campusOk || !major || (bankRequired && !bankHolder)) {
    return json<ActionData>(
      {
        error: "프로필 정보가 누락됐어요. 이전 단계로 돌아가 다시 진행해주세요.",
      },
      { status: 400, headers: ctx.headers },
    );
  }

  const result = await upsertProfile(ctx.supabase, {
    user_id: ctx.user.id,
    name,
    birth_year: birthYear,
    gender: gender as Gender | null,
    school,
    campus: campus || null,
    major,
    club: club || null,
    region: region || null,
    match_campus_pref: matchCampusPref,
    bank_holder: bankHolder,
    photo_path: photoPath,
  });

  if (!result.ok) {
    return json<ActionData>(
      { error: "저장 중 오류가 발생했어요. 잠시 후 다시 시도해주세요." },
      { status: 500, headers: ctx.headers },
    );
  }

  // 프로필 완성 "성공" 이벤트 — 가입 후 결제 단계 이탈(가장 큰 누수) 측정용.
  await captureServer(ctx.user.id, "profile.completed", {
    skipped: skip,
    free,
    has_photo: !!photoPath,
  });

  // 자동 승인 없음 — 우리 계좌로 실제 입금한 사람만 관리자(/admin)가 수동 승인한다.
  // 가입/입금 신청을 팀 채널에 알려 관리자가 입금 내역과 대조해 승인하도록 한다.
  // (Slack Webhook 미설정 시 자동 no-op)
  await notifySlack(
    buildPaymentNotice({
      userId: ctx.user.id,
      name,
      school,
      major,
      bankHolder,
      skipped: skip,
      free,
    }),
  );

  // 입금 신청자·무료(여성) → 승인 대기 화면. 둘러보기만 원한 사람 → 익명 미리보기(탐색).
  return redirect(skip ? "/explore" : "/waiting", { headers: ctx.headers });
}

export default function ProfilePayment() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const navigate = useNavigate();
  const submitting = navigation.state === "submitting";
  const formRef = useRef<HTMLFormElement>(null);
  const tracker = useFetcher();

  const [profile, setProfile] = useState<ProfileForm | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [bankHolder, setBankHolder] = useState("");

  useEffect(() => {
    const p = readProfile();
    setProfile(p);
    setBankHolder(p.bankHolder ?? "");
    setHydrated(true);
    // 가입 이탈 추적: 결제 단계 진입 기록(여기서 이탈하면 프로필 행이 안 생김).
    tracker.submit(
      { step: "profile_payment" },
      { method: "post", action: "/profile/track" },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 여성은 참가비 무료 → 입금자명 없이 바로 완료 가능.
  const isFemale = profile?.gender === "female";
  const canSubmit =
    hydrated &&
    !!profile?.name &&
    (isFemale || bankHolder.trim().length >= 2) &&
    !submitting;

  return (
    <PhoneFrame>
      <StatusBar />
      <SignupStepNav
        onBack={() => navigate(-1)}
        onNext={() => {
          capture("payment.submitted");
          formRef.current?.requestSubmit();
        }}
        canNext={canSubmit}
      />
      <Form
        ref={formRef}
        method="post"
        style={{
          flex: 1,
          padding: "0 25px",
          paddingBottom: "120px",
          position: "relative",
        }}
      >
        {/* 이전 step 데이터 hidden 전달 */}
        <input type="hidden" name="name" value={profile?.name ?? ""} />
        <input type="hidden" name="birth_year" value={profile?.birthYear ?? ""} />
        <input type="hidden" name="gender" value={profile?.gender ?? ""} />
        <input type="hidden" name="school" value={profile?.school ?? ""} />
        <input type="hidden" name="campus" value={profile?.campus ?? ""} />
        <input type="hidden" name="major" value={profile?.major ?? ""} />
        <input type="hidden" name="club" value={profile?.club ?? ""} />
        <input type="hidden" name="region" value={profile?.region ?? ""} />
        <input
          type="hidden"
          name="match_campus_pref"
          value={profile?.matchCampusPref ?? "상관없음"}
        />
        <input type="hidden" name="photo_path" value={profile?.photoPath ?? ""} />

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

        <div style={{ marginBottom: "40px" }}>
          <ProgressDots total={3} current={3} />
        </div>

        {isFemale ? (
          <>
            <h1
              style={{
                ...TYPOGRAPHY.headlineMd,
                color: COLORS.text.primary,
                margin: 0,
                marginBottom: "12px",
              }}
            >
              여성은
              <br />
              <span style={{ color: COLORS.accent }}>참가비가 무료</span>예요 🎀
            </h1>
            <p
              style={{
                ...TYPOGRAPHY.body,
                color: COLORS.text.helper,
                margin: 0,
                marginBottom: "32px",
              }}
            >
              입금 없이 바로 가입할 수 있어요. 프로필 확인 후 승인해드릴게요!
            </p>
          </>
        ) : (
          <>
            <h1
              style={{
                ...TYPOGRAPHY.headlineMd,
                color: COLORS.text.primary,
                margin: 0,
                marginBottom: "12px",
              }}
            >
              입금자명을
              <br />
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
              아래 계좌로 입금 후 입금자명을 입력해주세요.
            </p>

            <div
              style={{
                background: COLORS.cardBg,
                border: "none",
                borderRadius: "12px",
                padding: "20px",
                marginBottom: "32px",
              }}
            >
              <p
                style={{
                  ...TYPOGRAPHY.caption,
                  color: COLORS.text.secondary,
                  margin: 0,
                  marginBottom: "8px",
                }}
              >
                입금 계좌
              </p>
              <p
                style={{
                  ...TYPOGRAPHY.bodyBold,
                  color: COLORS.text.primary,
                  margin: 0,
                  marginBottom: "4px",
                }}
              >
                멋쟁이사자처럼 1002-5666-5941
              </p>
              <p
                style={{
                  ...TYPOGRAPHY.label,
                  color: COLORS.text.helper,
                  margin: 0,
                }}
              >
                참가비 1,000원
              </p>
            </div>

            <TextInput
              label="입금자명"
              name="bank_holder"
              type="text"
              placeholder="홍길동"
              value={bankHolder}
              onChange={(e) => setBankHolder(e.target.value)}
            />
          </>
        )}

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
            left: 0,
            right: 0,
            padding: "0 25px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <PrimaryButton
            type="submit"
            disabled={!canSubmit}
            style={{ width: "100%" }}
          >
            {submitting
              ? "저장 중..."
              : isFemale
                ? "무료로 가입 완료"
                : "입금 완료했어요"}
          </PrimaryButton>
          {!isFemale && (
            <button
              type="submit"
              name="intent"
              value="skip"
              disabled={!hydrated || !profile?.name || submitting}
              style={{
                ...TYPOGRAPHY.label,
                color: COLORS.text.helper,
                textDecoration: "underline",
                textUnderlineOffset: "3px",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "4px",
              }}
            >
              나중에 입금할게요 (먼저 둘러보기)
            </button>
          )}
        </div>
      </Form>
      <HomeIndicator />
    </PhoneFrame>
  );
}
