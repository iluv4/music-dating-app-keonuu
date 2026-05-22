import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import StatusBar from "~/components/StatusBar";
import HomeIndicator from "~/components/HomeIndicator";
import PhoneFrame from "~/components/PhoneFrame";
import BottomNav from "~/components/BottomNav";
import { COLORS, TYPOGRAPHY, RADIUS } from "~/lib/constants";
import { requireApprovedUser } from "~/lib/auth.server";

type DiscoverMember = {
  user_id: string;
  name: string;
  school: string;
  gender: string | null;
  song_count: number;
};

export async function loader({ request }: LoaderFunctionArgs) {
  const ctx = await requireApprovedUser(request);
  const { data, error } = await ctx.supabase.rpc("list_discover_members", {
    p_user_id: ctx.user.id,
  });
  if (error) console.error("[explore.list_discover_members]", error);
  const members = (data ?? []) as DiscoverMember[];
  return json({ members }, { headers: ctx.headers });
}

const AVATAR_BG = [
  "linear-gradient(135deg, #ffd1a8, #ff8c69)",
  "linear-gradient(135deg, #a8d8ff, #6f9eff)",
  "linear-gradient(135deg, #c9b3ff, #9b7bff)",
  "linear-gradient(135deg, #ffb3d1, #ff6f9e)",
  "linear-gradient(135deg, #b3f0d1, #5fcf9b)",
];

const MemberCard = ({ m, idx }: { m: DiscoverMember; idx: number }) => (
  <div
    style={{
      background: "white",
      borderRadius: RADIUS.card,
      boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
      padding: "16px",
      display: "flex",
      alignItems: "center",
      gap: "14px",
    }}
  >
    <div
      style={{
        width: "52px",
        height: "52px",
        borderRadius: "50%",
        background: AVATAR_BG[idx % AVATAR_BG.length],
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "22px",
      }}
    >
      🎵
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <p
        style={{
          ...TYPOGRAPHY.bodyBold,
          fontSize: "15px",
          margin: 0,
          color: COLORS.text.primary,
        }}
      >
        {m.name}
        {m.gender && (
          <span
            style={{
              ...TYPOGRAPHY.caption,
              color: COLORS.text.helper,
              marginLeft: "6px",
              fontWeight: 500,
            }}
          >
            {m.gender === "male" ? "남" : m.gender === "female" ? "여" : ""}
          </span>
        )}
      </p>
      <p
        style={{
          ...TYPOGRAPHY.label,
          color: COLORS.text.helper,
          margin: "3px 0 0",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {m.school || "학교 미입력"}
      </p>
    </div>
    <div
      style={{
        ...TYPOGRAPHY.caption,
        color: COLORS.accent,
        background: COLORS.accentSoft,
        padding: "6px 10px",
        borderRadius: "999px",
        fontWeight: 600,
        flexShrink: 0,
      }}
    >
      ♪ {Number(m.song_count)}곡
    </div>
  </div>
);

export default function Explore() {
  const { members } = useLoaderData<typeof loader>();

  return (
    <PhoneFrame style={{ paddingBottom: "107px" }}>
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
          둘러보기
        </h1>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px 24px" }}>
        <p
          style={{
            ...TYPOGRAPHY.body,
            color: COLORS.text.secondary,
            margin: "0 0 16px",
            lineHeight: 1.5,
          }}
        >
          이런 분들이 음악으로 인연을 기다리고 있어요 🎶
        </p>

        {members.length === 0 ? (
          <div
            style={{
              padding: "60px 20px",
              textAlign: "center",
              ...TYPOGRAPHY.label,
              color: COLORS.text.placeholder,
              lineHeight: 1.6,
            }}
          >
            아직 둘러볼 회원이 없어요.
            <br />
            곧 더 많은 분들이 합류할 거예요!
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {members.map((m, i) => (
              <MemberCard key={m.user_id} m={m} idx={i} />
            ))}
          </div>
        )}
      </div>

      <BottomNav active="explore" />
      <HomeIndicator />
    </PhoneFrame>
  );
}
