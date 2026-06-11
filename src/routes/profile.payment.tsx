import { useRef, useState } from "react";
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
import SignupStepNav from "~/components/SignupStepNav";
import { PrimaryButton } from "~/components/Button";
import { COLORS, TYPOGRAPHY } from "~/lib/constants";
import { postApprovalDestination, requireUser } from "~/lib/auth.server";
import { getProfileFields } from "~/lib/repos/profiles.server";
import { captureServer } from "~/lib/analytics.server";
import { notifySlack, buildPaymentNotice } from "~/lib/slack.server";
import { capture } from "~/lib/analytics.client";

type ActionData = { error: string };

// 결제(참가비) 단계 — 음악 프로필(장르·곡)을 다 만든 뒤 도달하는 마지막 게이트.
// 프로필 행은 이미 /profile/basic 에서 생성됐으므로 여기선 입금자명만 갱신한다.
export async function loader({ request }: LoaderFunctionArgs) {
  const ctx = await requireUser(request);
  const profile = await getProfileFields(ctx.supabase, ctx.user.id, [
    "name",
    "gender",
    "bank_holder",
    "is_approved",
  ]);
  if (!profile) {
    throw redirect("/profile/basic", { headers: ctx.headers });
  }
  // 이미 승인된 사용자는 결제 단계가 필요 없음 → 매칭 화면으로.
  if (profile.is_approved) {
    throw redirect("/music", { headers: ctx.headers });
  }
  return json(
    {
      name: profile.name,
      gender: profile.gender,
      bankHolder: profile.bank_holder ?? "",
    },
    { headers: ctx.headers },
  );
}

export async function action({ request }: ActionFunctionArgs) {
  const ctx = await requireUser(request);
  const fd = await request.formData();

  const profile = await getProfileFields(ctx.supabase, ctx.user.id, [
    "name",
    "gender",
    "school",
    "major",
  ]);
  if (!profile) {
    throw redirect("/profile/basic", { headers: ctx.headers });
  }

  // 여성은 참가비 무료 — 입금자명 없이 통과(성비 불균형 완화).
  // 남성은 입금자명 입력이 필수 — 결제가 매칭으로 가는 게이트다(스킵 없음).
  const free = profile.gender === "female";
  const bankHolder = String(fd.get("bank_holder") ?? "").trim();

  if (!free && bankHolder.length < 2) {
    return json<ActionData>(
      { error: "입금자명을 확인해주세요." },
      { status: 400, headers: ctx.headers },
    );
  }

  // 결제 완료 → 즉시 자동 승인 (관리자 승인 제거).
  // complete_payment RPC 가 입금자명 저장 + is_approved 를 한 번에 처리한다.
  {
    const { error } = await ctx.supabase.rpc("complete_payment", {
      p_bank_holder: bankHolder || null,
    });
    if (error) {
      console.error("[payment.complete_payment]", error);
      return json<ActionData>(
        { error: "처리 중 오류가 발생했어요. 잠시 후 다시 시도해주세요." },
        { status: 500, headers: ctx.headers },
      );
    }
  }

  await captureServer(ctx.user.id, "payment.submitted", { free });

  // 입금 내역 기록용 Slack 알림 (Webhook 미설정 시 자동 no-op).
  await notifySlack(
    buildPaymentNotice({
      userId: ctx.user.id,
      name: profile.name,
      school: profile.school,
      major: profile.major ?? "",
      bankHolder,
      skipped: false,
      free,
    }),
  );

  // 결제 완료(자동 승인) → 곡 보유 여부에 따라 매칭 화면 또는 곡 선택으로.
  const dest = await postApprovalDestination(ctx.supabase, ctx.user.id);
  return redirect(dest, { headers: ctx.headers });
}

export default function ProfilePayment() {
  const { name, gender, bankHolder: initialBankHolder } =
    useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const navigate = useNavigate();
  const submitting = navigation.state === "submitting";
  const formRef = useRef<HTMLFormElement>(null);
  const [bankHolder, setBankHolder] = useState(initialBankHolder);

  // 여성은 참가비 무료 → 입금자명 없이 바로 완료 가능.
  const isFemale = gender === "female";
  const canSubmit =
    (isFemale || bankHolder.trim().length >= 2) && !submitting;

  return (
    <PhoneFrame>
      <StatusBar />
      <SignupStepNav
        onBack={() => navigate(-1)}
        onNext={() => {
          if (!canSubmit) return;
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
        <img
          src="/images/logo.png"
          alt="pliting"
          style={{
            width: "120px",
            height: "auto",
            objectFit: "contain",
            marginTop: "20px",
            marginBottom: "24px",
            display: "block",
          }}
        />

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
              {name}님,
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
              입금 없이 바로 가입하고 매칭을 시작할 수 있어요!
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
              마지막!
              <br />
              <span style={{ color: COLORS.accent }}>입금자명</span>을 적어주세요
            </h1>
            <p
              style={{
                ...TYPOGRAPHY.body,
                color: COLORS.text.helper,
                margin: 0,
                marginBottom: "32px",
              }}
            >
              아래 계좌로 입금 후 입금자명을 입력하면 매칭이 시작돼요.
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
        </div>
      </Form>
      <HomeIndicator />
    </PhoneFrame>
  );
}
