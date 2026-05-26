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
  useNavigate,
  useNavigation,
} from "@remix-run/react";
import StatusBar from "~/components/StatusBar";
import HomeIndicator from "~/components/HomeIndicator";
import PhoneFrame from "~/components/PhoneFrame";
import { COLORS, TYPOGRAPHY } from "~/lib/constants";
import { requireUser } from "~/lib/auth.server";
import { deleteAccount } from "~/lib/repos/account.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const ctx = await requireUser(request);
  return json({}, { headers: ctx.headers });
}

export async function action({ request }: ActionFunctionArgs) {
  const ctx = await requireUser(request);
  const fd = await request.formData();
  if (fd.get("confirm") !== "on") {
    return json({ error: "탈퇴 동의에 체크해주세요." }, { status: 400 });
  }
  try {
    await deleteAccount(ctx.user.id);
  } catch (err) {
    console.error("[account.delete]", err);
    return json(
      { error: "탈퇴 처리 중 문제가 생겼어요. 잠시 후 다시 시도해주세요." },
      { status: 500 },
    );
  }
  // 세션 쿠키 제거 후 환영 화면으로.
  await ctx.supabase.auth.signOut();
  return redirect("/welcome", { headers: ctx.headers });
}

export default function AccountDelete() {
  const actionData = useActionData<typeof action>();
  const navigate = useNavigate();
  const navigation = useNavigation();
  const [agreed, setAgreed] = useState(false);
  const submitting = navigation.state === "submitting";

  return (
    <PhoneFrame>
      <StatusBar />
      <div
        style={{
          height: "52px",
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "white",
        }}
      >
        <button
          type="button"
          aria-label="뒤로"
          onClick={() => navigate(-1)}
          style={{
            position: "absolute",
            left: "12px",
            top: "50%",
            transform: "translateY(-50%)",
            fontSize: "22px",
            background: "none",
            border: "none",
            color: COLORS.text.primary,
            minWidth: "44px",
            minHeight: "44px",
            cursor: "pointer",
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
          회원탈퇴
        </h1>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "24px 25px 32px" }}>
        <h2
          style={{
            ...TYPOGRAPHY.title,
            color: COLORS.text.primary,
            margin: "0 0 16px",
          }}
        >
          정말 탈퇴하시겠어요?
        </h2>
        <p
          style={{
            ...TYPOGRAPHY.body,
            color: COLORS.text.secondary,
            margin: "0 0 20px",
            lineHeight: 1.6,
          }}
        >
          탈퇴하면 아래 정보가 즉시 삭제되며 복구할 수 없어요.
        </p>
        <ul
          style={{
            ...TYPOGRAPHY.body,
            color: COLORS.text.secondary,
            margin: "0 0 28px",
            paddingLeft: "20px",
            lineHeight: 1.8,
          }}
        >
          <li>프로필·사진·선택한 음악</li>
          <li>매칭 기록과 주고받은 채팅·사진</li>
          <li>알림·푸시 구독 정보</li>
        </ul>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            ...TYPOGRAPHY.body,
            color: COLORS.text.primary,
            cursor: "pointer",
            marginBottom: "20px",
          }}
        >
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            style={{ width: "18px", height: "18px", accentColor: COLORS.accent }}
          />
          안내를 확인했고 탈퇴에 동의합니다.
        </label>

        {actionData?.error && (
          <p
            style={{
              ...TYPOGRAPHY.caption,
              color: COLORS.accent,
              margin: "0 0 16px",
            }}
          >
            {actionData.error}
          </p>
        )}

        <Form method="post">
          <input type="hidden" name="confirm" value={agreed ? "on" : "off"} />
          <button
            type="submit"
            disabled={!agreed || submitting}
            style={{
              width: "100%",
              height: "48px",
              borderRadius: "12px",
              background: agreed ? COLORS.accent : COLORS.cardBorder,
              border: "none",
              ...TYPOGRAPHY.bodyBold,
              fontSize: "14px",
              color: "white",
              cursor: agreed && !submitting ? "pointer" : "not-allowed",
            }}
          >
            {submitting ? "탈퇴 처리 중…" : "탈퇴하기"}
          </button>
        </Form>

        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{
            width: "100%",
            height: "48px",
            marginTop: "12px",
            borderRadius: "12px",
            background: "white",
            border: `1px solid ${COLORS.cardBorder}`,
            ...TYPOGRAPHY.bodyBold,
            fontSize: "14px",
            color: COLORS.text.secondary,
            cursor: "pointer",
          }}
        >
          돌아가기
        </button>
      </div>

      <HomeIndicator />
    </PhoneFrame>
  );
}
