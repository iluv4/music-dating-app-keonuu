import { useEffect } from "react";
import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useRevalidator } from "@remix-run/react";
import StatusBar from "~/components/StatusBar";
import HomeIndicator from "~/components/HomeIndicator";
import PhoneFrame from "~/components/PhoneFrame";
import BottomNav from "~/components/BottomNav";
import { COLORS, TYPOGRAPHY, RADIUS } from "~/lib/constants";
import { requireUser } from "~/lib/auth.server";
import { getProfile } from "~/lib/repos/profiles.server";
import { listUserMatches } from "~/lib/repos/matches.server";
import { listUserSongs } from "~/lib/repos/user-songs.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const ctx = await requireUser(request);
  const [profile, matches, songs] = await Promise.all([
    getProfile(ctx.supabase, ctx.user.id),
    listUserMatches(ctx.supabase, ctx.user.id),
    listUserSongs(ctx.supabase, ctx.user.id),
  ]);
  return json(
    {
      profile,
      matchCount: matches.length,
      songCount: songs.length,
      email: ctx.user.email ?? "",
    },
    { headers: ctx.headers },
  );
}

const StatCard = ({ label, value }: { label: string; value: string }) => (
  <div
    style={{
      padding: "16px 14px",
      background: "white",
      borderRadius: RADIUS.alert,
      textAlign: "center",
      boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
    }}
  >
    <p
      style={{
        ...TYPOGRAPHY.caption,
        color: COLORS.text.placeholder,
        margin: 0,
        marginBottom: "6px",
      }}
    >
      {label}
    </p>
    <p
      style={{
        ...TYPOGRAPHY.headlineSm,
        fontSize: "22px",
        color: COLORS.text.primary,
        margin: 0,
      }}
    >
      {value}
    </p>
  </div>
);

const FeatureRow = ({
  name,
  allowed,
}: {
  name: string;
  allowed: boolean;
}) => (
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "10px 0",
    }}
  >
    <span style={{ ...TYPOGRAPHY.label, color: COLORS.text.primary }}>
      {name}
    </span>
    <span
      style={{
        fontSize: "13px",
        fontWeight: 600,
        color: allowed ? "#2c8a4f" : COLORS.accent,
      }}
    >
      {allowed ? "✓ 가능" : "✗ 차단"}
    </span>
  </div>
);

export default function Explore() {
  const data = useLoaderData<typeof loader>();
  const revalidator = useRevalidator();

  // 5초마다 자동 새로고침 — Supabase Dashboard 에서 is_approved 토글 시 바로 반영
  useEffect(() => {
    const id = setInterval(() => revalidator.revalidate(), 5000);
    return () => clearInterval(id);
  }, [revalidator]);

  const isApproved = data.profile?.is_approved ?? false;

  return (
    <PhoneFrame style={{ paddingBottom: "107px" }}>
      <StatusBar />

      {/* 헤더 */}
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
          탐색 (테스트)
        </h1>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
        }}
      >
        {/* 상태 카드 */}
        <div
          style={{
            padding: "24px 20px",
            background: isApproved ? "#e8f5ee" : COLORS.accentSoft,
            borderRadius: "16px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 14px",
              borderRadius: "999px",
              background: "white",
              ...TYPOGRAPHY.caption,
              color: isApproved ? "#2c8a4f" : COLORS.accent,
              fontWeight: 600,
              marginBottom: "14px",
            }}
          >
            <span
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                background: isApproved ? "#2c8a4f" : COLORS.accent,
              }}
            />
            {isApproved ? "승인 완료" : "미승인"}
          </div>
          <p
            style={{
              ...TYPOGRAPHY.headlineSm,
              fontSize: "22px",
              margin: 0,
              color: COLORS.text.primary,
            }}
          >
            is_approved: <code>{String(isApproved)}</code>
          </p>
          <p
            style={{
              ...TYPOGRAPHY.label,
              margin: "8px 0 0",
              color: COLORS.text.helper,
            }}
          >
            {data.email}
          </p>
        </div>

        {/* 상태별 안내 */}
        <div
          style={{
            padding: "16px 18px",
            background: "white",
            borderRadius: RADIUS.alert,
            boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
          }}
        >
          <p
            style={{
              ...TYPOGRAPHY.bodyBold,
              margin: 0,
              marginBottom: "10px",
              color: COLORS.text.primary,
            }}
          >
            {isApproved ? "🟢 매칭 가능 상태" : "🔴 매칭 불가 상태"}
          </p>
          <p
            style={{
              ...TYPOGRAPHY.label,
              color: COLORS.text.secondary,
              margin: 0,
              lineHeight: 1.6,
            }}
          >
            {isApproved
              ? "장르 선택·음악 선택·매칭 화면 접근 가능. 관리자가 새 매칭을 생성하면 자동으로 미승인으로 강등됩니다."
              : "매칭 기능(/genre·/music-select·/music)은 /waiting 으로 튕깁니다. 기존 매칭과의 채팅은 그대로 가능. Supabase Dashboard 에서 is_approved=true 로 변경하세요."}
          </p>
        </div>

        {/* 통계 */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "10px",
          }}
        >
          <StatCard label="선택한 곡" value={`${data.songCount}/3`} />
          <StatCard label="진행 매칭" value={String(data.matchCount)} />
        </div>

        {/* 기능별 접근 표 */}
        <div
          style={{
            padding: "16px 18px",
            background: "white",
            borderRadius: RADIUS.alert,
            boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
          }}
        >
          <p
            style={{
              ...TYPOGRAPHY.bodyBold,
              margin: 0,
              marginBottom: "8px",
              color: COLORS.text.primary,
            }}
          >
            기능 접근 상태
          </p>
          <FeatureRow name="장르 선택 (/genre)" allowed={isApproved} />
          <FeatureRow name="음악 선택 (/music-select)" allowed={isApproved} />
          <FeatureRow name="매칭 화면 (/music)" allowed={isApproved} />
          <FeatureRow name="채팅 (/chat)" allowed={true} />
          <FeatureRow name="마이페이지 (/mypage)" allowed={true} />
        </div>

        {/* 사용 안내 */}
        <div
          style={{
            padding: "14px 16px",
            background: COLORS.cardBg,
            borderRadius: RADIUS.info,
            ...TYPOGRAPHY.caption,
            color: COLORS.text.placeholder,
            lineHeight: 1.7,
          }}
        >
          ⚙️ 테스트 방법
          <br />
          1. Supabase Dashboard → Table Editor → profiles
          <br />
          2. 본인 row 의 is_approved 셀 토글 (false ↔ true)
          <br />
          3. 이 페이지는 5초마다 자동 새로고침됨
        </div>
      </div>

      <BottomNav active="explore" />
      <HomeIndicator />
    </PhoneFrame>
  );
}
