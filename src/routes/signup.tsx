import { useRef, useState } from "react";
import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { Form, Link, useActionData, useNavigate, useNavigation } from "@remix-run/react";
import StatusBar from "~/components/StatusBar";
import HomeIndicator from "~/components/HomeIndicator";
import PhoneFrame from "~/components/PhoneFrame";
import TextInput from "~/components/TextInput";
import SignupStepNav from "~/components/SignupStepNav";
import { PrimaryButton } from "~/components/Button";
import { capture } from "~/lib/analytics.client";
import { COLORS, TYPOGRAPHY, RADIUS } from "~/lib/constants";
import { requireGuest } from "~/lib/auth.server";
import { createSupabaseServerClient } from "~/lib/supabase.server";
import { getSupabaseAdmin } from "~/lib/supabase-admin.server";
import { TERMS, TERM_BODIES, type TermItem } from "~/lib/terms-content";

const Check = ({ checked, size = 22 }: { checked: boolean; size?: number }) => (
  <span
    style={{
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: "50%",
      background: checked ? COLORS.accent : "#e5e5e5",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      transition: "background 0.15s",
    }}
  >
    <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
      <path
        d="M1 4.5L4 7.5L10 1"
        stroke="white"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </span>
);

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
  // 약관 동의는 회원가입 단계에 통합됨 — 미동의 제출 차단(클라 우회 대비 서버 검증)
  if (String(formData.get("terms_agreed") ?? "") !== "1") {
    return json<ActionData>({ error: "약관에 모두 동의해주세요." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  // 0) 가입 남용 방지 — IP당 최근 1시간 5회 제한.
  //    공개 액션이 service_role 로 무제한 계정 생성하는 걸 막는다.
  const ip =
    (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const SIGNUP_LIMIT = 5;
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: recentAttempts } = await admin
    .from("signup_attempts")
    .select("id", { count: "exact", head: true })
    .eq("ip", ip)
    .gte("created_at", since);
  if ((recentAttempts ?? 0) >= SIGNUP_LIMIT) {
    return json<ActionData>(
      { error: "가입 시도가 너무 많아요. 잠시 후 다시 시도해주세요." },
      { status: 429 },
    );
  }
  // 시도 기록 (성공/실패 무관하게 카운트). admin 클라가 untyped 라 insert 인자 캐스팅.
  await admin.from("signup_attempts").insert({ ip } as never);

  // 1) admin API 로 사용자 생성 (이메일 발송 안 함, 자동 인증)
  //    무료 티어의 이메일 rate limit 회피 + 즉시 사용 가능
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
  const [agreed, setAgreed] = useState<Record<string, boolean>>({});
  const [viewing, setViewing] = useState<TermItem | null>(null);

  const allChecked = TERMS.every((t) => agreed[t.id]);
  const toggle = (id: string) =>
    setAgreed((prev) => ({ ...prev, [id]: !prev[id] }));
  const toggleAll = () => {
    const next = !allChecked;
    setAgreed(
      TERMS.reduce<Record<string, boolean>>((acc, t) => {
        acc[t.id] = next;
        return acc;
      }, {}),
    );
  };

  const emailValid = EMAIL_RE.test(email);
  const passwordValid = password.length >= 8;
  const confirmValid = confirm === password && confirm.length > 0;
  const canSubmit =
    emailValid && passwordValid && confirmValid && allChecked && !submitting;

  return (
    <PhoneFrame>
      <StatusBar />
      <SignupStepNav
        onBack={() => navigate(-1)}
        onNext={() => formRef.current?.requestSubmit()}
        canNext={canSubmit}
      />
      <Form
        ref={formRef}
        method="post"
        onSubmit={() => capture("signup.submitted")}
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

        {/* 약관 동의 — 별도 화면 대신 가입 단계에 통합(이탈 축소) */}
        <input type="hidden" name="terms_agreed" value={allChecked ? "1" : ""} />
        <div style={{ marginTop: "24px" }}>
          <button
            type="button"
            onClick={toggleAll}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "14px 16px",
              background: allChecked ? COLORS.accentSoft : COLORS.cardBg,
              borderRadius: RADIUS.card,
              border: "none",
              textAlign: "left",
              cursor: "pointer",
              transition: "background 0.15s",
            }}
          >
            <Check checked={allChecked} />
            <span
              style={{
                ...TYPOGRAPHY.bodyBold,
                color: allChecked ? COLORS.accent : COLORS.text.primary,
              }}
            >
              약관 전체동의
            </span>
          </button>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {TERMS.map((t) => (
              <div
                key={t.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "10px 8px",
                }}
              >
                <button
                  type="button"
                  onClick={() => toggle(t.id)}
                  aria-label={`${t.label} 동의`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    flex: 1,
                    padding: 0,
                    background: "none",
                    border: "none",
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  <Check checked={!!agreed[t.id]} size={20} />
                  <span
                    style={{
                      ...TYPOGRAPHY.label,
                      color: agreed[t.id]
                        ? COLORS.text.primary
                        : COLORS.text.secondary,
                    }}
                  >
                    {t.label}
                  </span>
                </button>
                <button
                  type="button"
                  aria-label={`${t.label} 전문 보기`}
                  onClick={() => setViewing(t)}
                  style={{
                    color: COLORS.text.placeholder,
                    fontSize: "18px",
                    minWidth: "44px",
                    minHeight: "44px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "none",
                    border: "none",
                    flexShrink: 0,
                    cursor: "pointer",
                  }}
                >
                  ›
                </button>
              </div>
            ))}
          </div>
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
          이미 계정이 있으신가요?{" "}
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

      {/* 약관 전문 모달 */}
      {viewing && (
        <div
          className="overlay-in"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-end",
            zIndex: 100,
          }}
          onClick={() => setViewing(null)}
        >
          <div
            className="sheet-up"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "390px",
              maxHeight: "75vh",
              background: "white",
              borderTopLeftRadius: "20px",
              borderTopRightRadius: "20px",
              padding: "24px 24px 32px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <h2
                style={{
                  ...TYPOGRAPHY.bodyBold,
                  fontSize: "17px",
                  color: COLORS.text.primary,
                  margin: 0,
                }}
              >
                {viewing.label.replace("(필수) ", "")}
              </h2>
              <button
                type="button"
                aria-label="닫기"
                onClick={() => setViewing(null)}
                style={{
                  fontSize: "22px",
                  color: COLORS.text.secondary,
                  background: "none",
                  border: "none",
                  minWidth: "44px",
                  minHeight: "44px",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>
            <div
              style={{
                overflowY: "auto",
                ...TYPOGRAPHY.label,
                color: COLORS.text.secondary,
                lineHeight: 1.65,
                whiteSpace: "pre-wrap",
              }}
            >
              {TERM_BODIES[viewing.id] ?? "준비 중입니다."}
            </div>
          </div>
        </div>
      )}
    </PhoneFrame>
  );
}
