import { useEffect, useRef, useState } from "react";
import {
  json,
  redirect,
  type ActionFunctionArgs,
} from "@remix-run/node";
import { Form, useActionData, useNavigate, useNavigation } from "@remix-run/react";
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
import { readProfile, type ProfileForm } from "~/lib/profile-state";
import type { Gender } from "~/lib/db-types";

type ActionData = { error: string };

export async function action({ request }: ActionFunctionArgs) {
  const ctx = await requireUser(request);
  const fd = await request.formData();

  const name = String(fd.get("name") ?? "").trim();
  const birthYearStr = String(fd.get("birth_year") ?? "").trim();
  const gender = String(fd.get("gender") ?? "").trim() || null;
  const school = String(fd.get("school") ?? "").trim();
  const major = String(fd.get("major") ?? "").trim();
  const bankHolder = String(fd.get("bank_holder") ?? "").trim();

  const birthYear = Number(birthYearStr);
  if (!name || !birthYear || !school || !major || !bankHolder) {
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
    major,
    bank_holder: bankHolder,
  });

  if (!result.ok) {
    return json<ActionData>(
      { error: "저장 중 오류가 발생했어요. 잠시 후 다시 시도해주세요." },
      { status: 500, headers: ctx.headers },
    );
  }

  // 가입 직후는 미승인 상태 → 승인 대기 화면으로 바로 이동
  return redirect("/waiting", { headers: ctx.headers });
}

export default function ProfilePayment() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const navigate = useNavigate();
  const submitting = navigation.state === "submitting";
  const formRef = useRef<HTMLFormElement>(null);

  const [profile, setProfile] = useState<ProfileForm | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [bankHolder, setBankHolder] = useState("");

  useEffect(() => {
    const p = readProfile();
    setProfile(p);
    setBankHolder(p.bankHolder ?? "");
    setHydrated(true);
  }, []);

  const canSubmit =
    hydrated && !!profile?.name && bankHolder.trim().length >= 2 && !submitting;

  return (
    <PhoneFrame>
      <StatusBar />
      <SignupStepNav
        onBack={() => navigate("/profile/school")}
        onNext={() => formRef.current?.requestSubmit()}
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
        <input type="hidden" name="major" value={profile?.major ?? ""} />

        <div style={{ marginTop: "30px", marginBottom: "40px" }}>
          <ProgressDots total={4} current={4} />
        </div>

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
            카카오뱅크 1234-5678-9012
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
            {submitting ? "저장 중..." : "확인"}
          </PrimaryButton>
        </div>
      </Form>
      <HomeIndicator />
    </PhoneFrame>
  );
}
