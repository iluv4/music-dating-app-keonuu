import { useEffect, useState } from "react";
import {
  json,
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
import { capture } from "~/lib/analytics.client";
import { listUserMatches } from "~/lib/repos/matches.server";

// "한 명 더 만나기" = 추가형 매칭 (현재 대화는 그대로 유지, 새 상대를 추가로 매칭).
// 입금 후 request_additional_match 로 후보를 찾아 즉시 매칭(active)하고 양쪽에 알림을 보낸다.
// (관리자 승인 제거 — 바로 연결)

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
      { status: "error" as const, error: "입금자명을 입력해주세요." },
      { status: 400, headers: ctx.headers },
    );
  }

  // 현재 매칭은 그대로 두고, 새 상대를 "추가로" 즉시 매칭(active)
  const { data, error } = await ctx.supabase.rpc("request_additional_match", {
    p_user_id: ctx.user.id,
  });
  if (error) {
    console.error("[rematch.request_additional_match]", error);
    return json(
      {
        status: "error" as const,
        error: "추가 매칭 신청 중 문제가 발생했어요. 잠시 후 다시 시도해주세요.",
      },
      { status: 500, headers: ctx.headers },
    );
  }
  const matchId = data as string | null;
  if (matchId) {
    // 즉시 매칭 성사 — 새 대화방으로 안내.
    return json({ status: "matched" as const, matchId }, { headers: ctx.headers });
  }
  // 지금은 매칭 가능한 후보가 없음
  return json({ status: "none" as const }, { headers: ctx.headers });
}

export default function Rematch() {
  const { currentCount } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const navigate = useNavigate();
  const submitting = navigation.state === "submitting";
  const [bankHolder, setBankHolder] = useState("");

  useEffect(() => {
    if (actionData?.status === "matched") {
      capture("match.rematch_requested", { current_count: currentCount });
    }
  }, [actionData?.status, currentCount]);

  const Header = ({ title }: { title: string }) => (
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
        {title}
      </h1>
    </div>
  );

  // 즉시 매칭 성사 → 새 대화방 안내 화면
  if (actionData?.status === "matched") {
    return (
      <PhoneFrame>
        <StatusBar />
        <Header title="매칭 성사" />
        <div
          style={{
            flex: 1,
            padding: "48px 25px 40px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: "84px",
              height: "84px",
              borderRadius: "50%",
              background: COLORS.accentSoft,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "38px",
              marginBottom: "20px",
            }}
          >
            💘
          </div>
          <h2
            style={{
              ...TYPOGRAPHY.headlineSm,
              color: COLORS.text.primary,
              margin: "0 0 12px",
            }}
          >
            새로운 매칭이 성사됐어요!
          </h2>
          <p
            style={{
              ...TYPOGRAPHY.body,
              color: COLORS.text.helper,
              margin: "0 0 28px",
              lineHeight: 1.6,
            }}
          >
            음악 취향이 통하는 상대와 매칭됐어요.
            <br />
            지금 바로 대화를 시작해보세요.
          </p>
          <PrimaryButton
            type="button"
            onClick={() => navigate(`/chat/${actionData.matchId}`)}
            style={{ width: "100%" }}
          >
            대화 시작하기
          </PrimaryButton>
        </div>
        <HomeIndicator />
      </PhoneFrame>
    );
  }

  return (
    <PhoneFrame>
      <StatusBar />
      <Header title="한 명 더 만나기" />

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
            멋쟁이사자처럼 1002-5666-5941
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

        {actionData?.status === "error" && (
          <p style={{ ...TYPOGRAPHY.caption, color: COLORS.accent, marginTop: "16px" }}>
            {actionData.error}
          </p>
        )}
        {actionData?.status === "none" && (
          <p style={{ ...TYPOGRAPHY.caption, color: COLORS.text.helper, marginTop: "16px", lineHeight: 1.5 }}>
            지금은 매칭 가능한 상대가 없어요. 잠시 후 다시 시도해주세요.
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
