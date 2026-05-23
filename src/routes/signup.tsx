import { useRef, useState } from "react";
import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { Form, Link, useActionData, useNavigate, useNavigation } from "@remix-run/react";
import StatusBar from "~/components/StatusBar";
import HomeIndicator from "~/components/HomeIndicator";
import PhoneFrame from "~/components/PhoneFrame";
import TextInput from "~/components/TextInput";
import SignupStepNav from "~/components/SignupStepNav";
import { PrimaryButton } from "~/components/Button";
import { COLORS, TYPOGRAPHY } from "~/lib/constants";
import { requireGuest } from "~/lib/auth.server";
import { createSupabaseServerClient } from "~/lib/supabase.server";
import { getSupabaseAdmin } from "~/lib/supabase-admin.server";

const EMAIL_RE = /^[\w.+-]+@[\w-]+\.[\w.-]+$/;

type ActionData = { error: string };

export async function loader({ request }: LoaderFunctionArgs) {
  // 이미 로그인된 사용자는 /music 으로
  const ctx = await requireGuest(request);
  return json({}, { headers: ctx.headers });
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!EMAIL_RE.test(email)) {
    return json<ActionData>({ error: "올바른 이메일 형식이 아닙니다." }, { status: 400 });
  }
  if (password.length < 8) {
    return json<ActionData>({ error: "비밀번호는 8자 이상이어야 합니다." }, { status: 400 });
  }
  if (password !== confirm) {
    return json<ActionData>({ error: "비밀번호가 일치하지 않습니다." }, { status: 400 });
  }

  // 1) admin API 로 사용자 생성 (이메일 발송 안 함, 자동 인증)
  //    무료 티어의 이메일 rate limit 회피 + 즉시 사용 가능
  const admin = getSupabaseAdmin();
  const { error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError) {
    const m = createError.message.toLowerCase();
    let msg = createError.message;
    if (m.includes("already") || m.includes("registered") || m.includes("exists")) {
      msg = "이미 가입된 이메일입니다.";
    }
    return json<ActionData>({ error: msg }, { status: 400 });
  }

  // 2) 정상 클라이언트로 로그인 → 쿠키 세션 발급
  const { supabase, headers } = createSupabaseServerClient(request);
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    return json<ActionData>(
      { error: "가입은 됐지만 로그인에 실패했어요. 다시 로그인해주세요." },
      { status: 500 },
    );
  }

  return redirect("/profile/basic", { headers });
}

export default function Signup() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const navigate = useNavigate();
  const submitting = navigation.state === "submitting";
  const formRef = useRef<HTMLFormElement>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const emailValid = EMAIL_RE.test(email);
  const passwordValid = password.length >= 8;
  const confirmValid = confirm === password && confirm.length > 0;
  const canSubmit = emailValid && passwordValid && confirmValid && !submitting;

  return (
    <PhoneFrame>
      <StatusBar />
      <SignupStepNav
        onBack={() => navigate("/terms")}
        onNext={() => formRef.current?.requestSubmit()}
        canNext={canSubmit}
      />
      <Form
        ref={formRef}
        method="post"
        style={{
          flex: 1,
          padding: "0 25px 120px",
          position: "relative",
        }}
      >
        <h1
          style={{
            ...TYPOGRAPHY.headlineMd,
            color: COLORS.text.primary,
            margin: 0,
            marginTop: "40px",
            marginBottom: "12px",
          }}
        >
          회원가입
        </h1>
        <p
          style={{
            ...TYPOGRAPHY.body,
            color: COLORS.text.helper,
            margin: 0,
            marginBottom: "32px",
          }}
        >
          사용하실 이메일로 가입할 수 있어요.
        </p>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          <TextInput
            label="이메일"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="hong@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <TextInput
            label="비밀번호"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="8자 이상"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <TextInput
            label="비밀번호 확인"
            name="confirm"
            type="password"
            autoComplete="new-password"
            placeholder="비밀번호를 다시 입력"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
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
            marginTop: "32px",
            textAlign: "center",
            ...TYPOGRAPHY.label,
            color: COLORS.text.helper,
          }}
        >
          이미 계정이 있어요?{" "}
          <Link
            to="/login"
            style={{
              color: COLORS.accent,
              fontWeight: 600,
              textDecoration: "underline",
            }}
          >
            로그인
          </Link>
        </div>

        <div
          style={{
            position: "absolute",
            bottom: "34px",
            left: 0,
            right: 0,
            padding: "0 25px",
          }}
        >
          <PrimaryButton
            type="submit"
            disabled={!canSubmit}
            style={{ width: "100%" }}
          >
            {submitting ? "가입 중..." : "가입하기"}
          </PrimaryButton>
        </div>
      </Form>
      <HomeIndicator />
    </PhoneFrame>
  );
}
