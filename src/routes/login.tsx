import { useState } from "react";
import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { Form, Link, useActionData, useNavigation } from "@remix-run/react";
import StatusBar from "~/components/StatusBar";
import HomeIndicator from "~/components/HomeIndicator";
import PhoneFrame from "~/components/PhoneFrame";
import TextInput from "~/components/TextInput";
import { PrimaryButton } from "~/components/Button";
import { KakaoButton } from "~/components/SocialButton";
import { COLORS, TYPOGRAPHY } from "~/lib/constants";
import { postApprovalDestination, requireGuest } from "~/lib/auth.server";
import { createSupabaseServerClient } from "~/lib/supabase.server";
import { getProfileFields } from "~/lib/repos/profiles.server";

const EMAIL_RE = /^[\w.+-]+@[\w-]+\.[\w.-]+$/;

type ActionData = { error: string };

export async function loader({ request }: LoaderFunctionArgs) {
  const ctx = await requireGuest(request);
  return json({}, { headers: ctx.headers });
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!EMAIL_RE.test(email) || password.length === 0) {
    return json<ActionData>({ error: "이메일·비밀번호를 확인해주세요." }, { status: 400 });
  }

  const { supabase, headers } = createSupabaseServerClient(request);
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return json<ActionData>(
      { error: "이메일 또는 비밀번호가 올바르지 않습니다." },
      { status: 400 },
    );
  }

  // 프로필 + 승인 상태 확인 → 분기
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return json<ActionData>({ error: "로그인 처리 중 오류가 발생했습니다." }, { status: 500 });
  }

  const profile = await getProfileFields(supabase, user.id, [
    "user_id",
    "is_approved",
  ]);

  if (!profile) return redirect("/profile/basic", { headers });
  if (!profile.is_approved) return redirect("/profile/payment", { headers });
  const dest = await postApprovalDestination(supabase, user.id);
  return redirect(dest, { headers });
}

export default function Login() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const submitting = navigation.state === "submitting";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const canSubmit = EMAIL_RE.test(email) && password.length >= 1 && !submitting;

  return (
    <PhoneFrame>
      <StatusBar />
      <Form
        method="post"
        style={{
          flex: 1,
          padding: "0 25px 16px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <img
          src="/images/logo.png"
          alt="pliting"
          style={{
            width: "150px",
            height: "auto",
            objectFit: "contain",
            marginTop: "32px",
            marginBottom: "20px",
            display: "block",
          }}
        />

        <h1
          style={{
            ...TYPOGRAPHY.headlineMd,
            color: COLORS.text.primary,
            margin: 0,
            marginBottom: "12px",
          }}
        >
          로그인
        </h1>
        <p
          style={{
            ...TYPOGRAPHY.body,
            color: COLORS.text.helper,
            margin: 0,
            marginBottom: "32px",
          }}
        >
          음악 취향이 맞는 사람을 만나러 가볼까요?
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
            autoComplete="current-password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
            marginTop: "20px",
            textAlign: "right",
          }}
        >
          <button
            type="button"
            onClick={() => alert("관리자에게 문의해주세요 (MVP)")}
            style={{
              ...TYPOGRAPHY.caption,
              color: COLORS.text.secondary,
              textDecoration: "underline",
              padding: "8px 4px",
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            비밀번호를 잊으셨나요?
          </button>
        </div>

        <div
          style={{
            marginTop: "20px",
            textAlign: "center",
            ...TYPOGRAPHY.label,
            color: COLORS.text.helper,
          }}
        >
          아직 계정이 없어요?{" "}
          <Link
            to="/signup"
            style={{
              color: COLORS.accent,
              fontWeight: 600,
              textDecoration: "underline",
            }}
          >
            회원가입
          </Link>
        </div>

        {/* 본문과 하단 액션 사이 여백 */}
        <div style={{ flex: 1, minHeight: "24px" }} />

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <PrimaryButton type="submit" disabled={!canSubmit} style={{ width: "100%" }}>
            {submitting ? "로그인 중..." : "로그인"}
          </PrimaryButton>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              margin: "4px 0",
              ...TYPOGRAPHY.caption,
              color: COLORS.text.placeholder,
            }}
          >
            <span style={{ flex: 1, height: "1px", background: COLORS.divider }} />
            소셜 계정으로 로그인
            <span style={{ flex: 1, height: "1px", background: COLORS.divider }} />
          </div>

          <KakaoButton style={{ width: "100%" }}>카카오로 계속하기</KakaoButton>

          <Link
            to="/explore"
            style={{
              ...TYPOGRAPHY.label,
              color: COLORS.text.helper,
              textAlign: "center",
              textDecoration: "underline",
              textUnderlineOffset: "3px",
              marginTop: "4px",
            }}
          >
            로그인 없이 둘러볼게요
          </Link>
        </div>
      </Form>
      <HomeIndicator />
    </PhoneFrame>
  );
}
