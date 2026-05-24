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
import { listUserMatches } from "~/lib/repos/matches.server";

// "한 명 더 만나기" = 추가형 매칭 (현재 대화는 그대로 유지, 새 상대를 추가로 매칭).
// 참가비 입금 단계 후 find_additional_match 로 새 상대를 찾는다(기존 매칭 종료 안 함).

export async function loader({ request }: LoaderFunctionArgs) {
  const ctx = await requireApprovedUser(request);
  const matches = await listUserMatches(ctx.supabase, ctx.user.id);
  return json({ currentCount: matches.length }, { headers: ctx.headers });
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

  // 현재 매칭은 그대로 두고, 새 상대를 "추가로" 탐색 (다중 매칭)
  const { data, error } = await ctx.supabase.rpc("find_additional_match", {
    p_user_id: ctx.user.id,
  });
  if (error) {
    console.error("[rematch.find_additional_match]", error);
    return json(
      { error: "추가 매칭 중 문제가 발생했어요. 잠시 후 다시 시도해주세요." },
      { status: 500, headers: ctx.headers },
    );
  }
  const newId = data as string | null;
  if (newId) {
    return redirect(`/chat/${newId}`, { headers: ctx.headers });
  }
  // 새 후보 없음 → 채팅 목록으로 (안내)
  return redirect("/chat", { headers: ctx.headers });
}

export default function Rematch() {
  const { currentCount } = useLoaderData<typeof loader>();
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
          한 명 더 만나기
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
          한 명 더
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
          지금 나누는 <b style={{ color: COLORS.accent }}>{currentCount}개</b>의 대화는
          그대로 유지돼요. 참가비 입금 후 새로운 상대를{" "}
          <b style={{ color: COLORS.accent }}>추가로</b> 찾아드려요.
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
            추가 매칭 참가비 1,000원
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
            {submitting ? "처리 중..." : "입금 완료, 한 명 더 만나기"}
          </PrimaryButton>
        </div>
      </Form>
      <HomeIndicator />
    </PhoneFrame>
  );
}
