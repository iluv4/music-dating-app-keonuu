import { useState } from "react";
import {
  json,
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "@remix-run/node";
import { Form, useActionData, useLoaderData, useNavigate, useNavigation } from "@remix-run/react";
import StatusBar from "~/components/StatusBar";
import HomeIndicator from "~/components/HomeIndicator";
import PhoneFrame from "~/components/PhoneFrame";
import TextInput from "~/components/TextInput";
import { PrimaryButton } from "~/components/Button";
import { COLORS, TYPOGRAPHY } from "~/lib/constants";
import { requireApprovedUser } from "~/lib/auth.server";
import { listUserMatches, endMatch } from "~/lib/repos/matches.server";

// "매칭 한 번 더 하기" = 재결제 후 재매칭 (팀 결정: 다시 돈 받고 매칭)
// 현재 매칭을 종료하고 새 상대를 찾기 전에 참가비 입금 단계를 거친다.

export async function loader({ request }: LoaderFunctionArgs) {
  const ctx = await requireApprovedUser(request);
  const matches = await listUserMatches(ctx.supabase, ctx.user.id);
  const current = matches[0] ?? null;
  if (!current) {
    // 진행 중 매칭이 없으면 그냥 매칭 화면으로
    throw redirect("/music", { headers: ctx.headers });
  }
  return json(
    { partnerName: current.partnerName },
    { headers: ctx.headers },
  );
}

export async function action({ request }: ActionFunctionArgs) {
  const ctx = await requireApprovedUser(request);
  const fd = await request.formData();
  const bankHolder = String(fd.get("bank_holder") ?? "").trim();
  if (bankHolder.length < 2) {
    return json(
      { error: "입금자명을 입력해주세요." },
      { status: 400, headers: ctx.headers },
    );
  }

  // 현재 매칭 종료
  const matches = await listUserMatches(ctx.supabase, ctx.user.id);
  const current = matches[0];
  if (current) {
    const ended = await endMatch(ctx.supabase, current.matchId);
    if (!ended.ok) {
      return json(
        { error: "매칭 종료에 실패했어요. 잠시 후 다시 시도해주세요." },
        { status: 500, headers: ctx.headers },
      );
    }
  }

  // 새 상대 탐색
  const { data, error } = await ctx.supabase.rpc("find_or_create_match", {
    p_user_id: ctx.user.id,
  });
  if (error) {
    console.error("[rematch.find_or_create_match]", error);
    return json(
      { error: "재매칭 중 문제가 발생했어요. 잠시 후 다시 시도해주세요." },
      { status: 500, headers: ctx.headers },
    );
  }
  const newId = data as string | null;
  if (newId) {
    return redirect(`/chat/${newId}`, { headers: ctx.headers });
  }
  // 후보 없음 → 매칭 화면 (후보 없음 안내)
  return redirect("/music", { headers: ctx.headers });
}

export default function Rematch() {
  const { partnerName } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const navigate = useNavigate();
  const submitting = navigation.state === "submitting";
  const [bankHolder, setBankHolder] = useState("");

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
          onClick={() => navigate("/music")}
          style={{
            position: "absolute",
            left: "8px",
            fontSize: "22px",
            color: COLORS.text.secondary,
            padding: "4px 8px",
          }}
        >
          ‹
        </button>
        <h1 style={{ ...TYPOGRAPHY.bodyBold, fontSize: "17px", margin: 0 }}>
          다시 매칭하기
        </h1>
      </div>

      <Form
        method="post"
        style={{ flex: 1, padding: "24px 25px", position: "relative" }}
      >
        <h2
          style={{
            ...TYPOGRAPHY.headlineMd,
            color: COLORS.text.primary,
            margin: "0 0 12px",
            lineHeight: 1.3,
          }}
        >
          새로운 인연을
          <br />
          만나볼까요?
        </h2>
        <p
          style={{
            ...TYPOGRAPHY.body,
            color: COLORS.text.helper,
            margin: "0 0 28px",
            lineHeight: 1.6,
          }}
        >
          현재 <b style={{ color: COLORS.accent }}>{partnerName}</b> 님과의 매칭이
          종료되고, 참가비 입금 후 새로운 상대를 찾아드려요.
        </p>

        <div
          style={{
            background: COLORS.cardBg,
            borderRadius: "12px",
            padding: "20px",
            marginBottom: "28px",
          }}
        >
          <p style={{ ...TYPOGRAPHY.caption, color: COLORS.text.secondary, margin: "0 0 8px" }}>
            입금 계좌
          </p>
          <p style={{ ...TYPOGRAPHY.bodyBold, color: COLORS.text.primary, margin: "0 0 4px" }}>
            카카오뱅크 1234-5678-9012
          </p>
          <p style={{ ...TYPOGRAPHY.label, color: COLORS.text.helper, margin: 0 }}>
            재매칭 참가비 5,000원
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
          <p style={{ ...TYPOGRAPHY.caption, color: COLORS.accent, marginTop: "16px" }}>
            {actionData.error}
          </p>
        )}

        <div style={{ position: "absolute", bottom: "34px", left: "25px", right: "25px" }}>
          <PrimaryButton
            type="submit"
            disabled={bankHolder.trim().length < 2 || submitting}
            style={{ width: "100%" }}
          >
            {submitting ? "처리 중..." : "입금 완료, 다시 매칭하기"}
          </PrimaryButton>
        </div>
      </Form>
      <HomeIndicator />
    </PhoneFrame>
  );
}
