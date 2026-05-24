import { json, redirect, type LoaderFunctionArgs } from "@remix-run/node";
import StatusBar from "~/components/StatusBar";
import HomeIndicator from "~/components/HomeIndicator";
import PhoneFrame from "~/components/PhoneFrame";
import BottomNav from "~/components/BottomNav";
import { COLORS, TYPOGRAPHY } from "~/lib/constants";
import { requireUser } from "~/lib/auth.server";
import { listUserMatches } from "~/lib/repos/matches.server";

// 인당 매칭은 1개 가정.
// - 매칭 있음 → 가장 최근 매칭 방으로 바로 리다이렉트
// - 매칭 없음 → 빈 상태 안내
export async function loader({ request }: LoaderFunctionArgs) {
  const ctx = await requireUser(request);
  const matches = await listUserMatches(ctx.supabase, ctx.user.id);

  if (matches.length > 0) {
    throw redirect(`/chat/${matches[0].matchId}`, { headers: ctx.headers });
  }

  return json({}, { headers: ctx.headers });
}

export default function ChatEmpty() {
  return (
    <PhoneFrame style={{ paddingBottom: "76px" }}>
      <StatusBar />
      <div
        style={{
          height: "52px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "white",
        }}
      >
        <h1
          style={{
            ...TYPOGRAPHY.bodyBold,
            fontSize: "17px",
            color: COLORS.text.primary,
            margin: 0,
          }}
        >
          채팅
        </h1>
      </div>

      <div
        style={{
          flex: 1,
          padding: "80px 30px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          textAlign: "center",
        }}
      >
        <img
          src="/images/profile-mascot.png"
          alt=""
          style={{
            width: "140px",
            height: "140px",
            objectFit: "contain",
            opacity: 0.7,
            marginBottom: "20px",
          }}
        />
        <p
          style={{
            ...TYPOGRAPHY.bodyBold,
            fontSize: "18px",
            color: COLORS.text.primary,
            margin: 0,
            marginBottom: "10px",
          }}
        >
          아직 매칭이 없어요
        </p>
        <p
          style={{
            ...TYPOGRAPHY.label,
            color: COLORS.text.helper,
            margin: 0,
            lineHeight: 1.6,
          }}
        >
          매칭이 성사되면 여기에서
          <br />
          대화를 시작할 수 있어요.
        </p>
      </div>

      <BottomNav active="chat" />
      <HomeIndicator />
    </PhoneFrame>
  );
}
