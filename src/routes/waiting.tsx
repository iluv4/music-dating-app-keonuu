import { json, redirect, type LoaderFunctionArgs } from "@remix-run/node";
import { Form, Link, useLoaderData } from "@remix-run/react";
import StatusBar from "~/components/StatusBar";
import HomeIndicator from "~/components/HomeIndicator";
import PhoneFrame from "~/components/PhoneFrame";
import BottomNav from "~/components/BottomNav";
import { COLORS, TYPOGRAPHY, RADIUS } from "~/lib/constants";
import { postApprovalDestination, requireUser } from "~/lib/auth.server";
import { getProfileFields } from "~/lib/repos/profiles.server";
import { listUserMatches } from "~/lib/repos/matches.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const ctx = await requireUser(request);
  const profile = await getProfileFields(ctx.supabase, ctx.user.id, [
    "name",
    "bank_holder",
    "is_approved",
  ]);

  // 프로필 없음 → 가입 절차 미완료
  if (!profile) {
    throw redirect("/profile/basic", { headers: ctx.headers });
  }

  // 이미 승인됨 → 곡 선택 여부에 따라 분기
  if (profile.is_approved) {
    const dest = await postApprovalDestination(ctx.supabase, ctx.user.id);
    throw redirect(dest, { headers: ctx.headers });
  }

  // 매칭 기록 있으면 "재매칭 모드" 안내
  const matches = await listUserMatches(ctx.supabase, ctx.user.id);
  const hasMatched = matches.length > 0;

  return json(
    {
      name: profile.name,
      bankHolder: profile.bank_holder ?? "-",
      hasMatched,
    },
    { headers: ctx.headers },
  );
}

export default function Waiting() {
  const { name, bankHolder, hasMatched } = useLoaderData<typeof loader>();

  return (
    <PhoneFrame style={{ paddingBottom: "calc(76px + env(safe-area-inset-bottom, 0px))" }}>
      <StatusBar />
      <div
        style={{
          flex: 1,
          padding: "60px 25px 40px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        <img
          src="/images/payment-complete.png"
          alt=""
          style={{
            width: "180px",
            height: "180px",
            objectFit: "contain",
            marginBottom: "24px",
          }}
        />

        <h1
          style={{
            ...TYPOGRAPHY.headlineSm,
            color: COLORS.text.primary,
            margin: 0,
            marginBottom: "12px",
          }}
        >
          {hasMatched ? "다시 매칭하시려면" : "관리자 승인 대기 중"}
        </h1>
        <p
          style={{
            ...TYPOGRAPHY.body,
            color: COLORS.text.helper,
            margin: 0,
            marginBottom: "28px",
            lineHeight: 1.5,
          }}
        >
          {hasMatched ? (
            <>
              {name}님, 새로운 매칭을 원하시면
              <br />
              <span style={{ color: COLORS.accent, fontWeight: 600 }}>
                재입금 후 관리자 승인
              </span>
              이 필요해요.
            </>
          ) : (
            <>
              {name}님, 입금자명{" "}
              <span style={{ color: COLORS.accent, fontWeight: 600 }}>
                {bankHolder}
              </span>{" "}
              확인 후
              <br />
              매칭을 시작해드릴게요.
            </>
          )}
        </p>

        <div
          style={{
            width: "100%",
            padding: "16px 18px",
            background: COLORS.cardBg,
            border: "none",
            borderRadius: RADIUS.info,
            textAlign: "left",
            marginBottom: "20px",
          }}
        >
          <p
            style={{
              ...TYPOGRAPHY.caption,
              color: COLORS.text.helper,
              margin: 0,
              marginBottom: "8px",
            }}
          >
            안내
          </p>
          <ul
            style={{
              listStyle: "disc",
              paddingLeft: "18px",
              margin: 0,
              ...TYPOGRAPHY.label,
              color: COLORS.text.secondary,
              lineHeight: 1.6,
            }}
          >
            <li>입금 확인 후 영업일 기준 조만간 승인됩니다.</li>
            <li>승인 완료 시 매칭·채팅 기능을 이용할 수 있어요.</li>
            <li>오래 걸리면 운영팀에 문의해주세요.</li>
          </ul>
        </div>

        <Link
          to="/mypage"
          style={{
            ...TYPOGRAPHY.body,
            color: COLORS.accent,
            fontWeight: 600,
            textDecoration: "underline",
            marginBottom: "12px",
          }}
        >
          내 정보 확인
        </Link>

        <Form method="post" action="/logout">
          <button
            type="submit"
            style={{
              ...TYPOGRAPHY.caption,
              color: COLORS.text.placeholder,
              textDecoration: "underline",
            }}
          >
            로그아웃
          </button>
        </Form>
      </div>
      <BottomNav />
      <HomeIndicator />
    </PhoneFrame>
  );
}
