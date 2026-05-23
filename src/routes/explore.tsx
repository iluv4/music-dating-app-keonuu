import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import StatusBar from "~/components/StatusBar";
import HomeIndicator from "~/components/HomeIndicator";
import PhoneFrame from "~/components/PhoneFrame";
import BottomNav from "~/components/BottomNav";
import { PrimaryButton } from "~/components/Button";
import { COLORS, TYPOGRAPHY, RADIUS } from "~/lib/constants";
import { getUser } from "~/lib/auth.server";
import { getProfileFields } from "~/lib/repos/profiles.server";
import { maskName } from "~/lib/format";

type DiscoverMember = {
  user_id: string;
  name: string;
  school: string;
  gender: string | null;
  song_count: number;
};

type PreviewMember = {
  gender: string | null;
  song_count: number;
};

// 로그인 없이도 "둘러보기"가 가능하도록 게스트를 허용한다.
// - 승인 회원: 실명·학교 포함 전체 목록 (list_discover_members)
// - 게스트/미승인: 이름·학교 등 식별정보를 제외한 익명 미리보기 (list_discover_preview)
//   → 실제 가입자의 PII를 비로그인 방문자에게 노출하지 않기 위함
export async function loader({ request }: LoaderFunctionArgs) {
  const ctx = await getUser(request);

  if (ctx.user) {
    const profile = await getProfileFields(ctx.supabase, ctx.user.id, [
      "is_approved",
    ]);
    if (profile?.is_approved) {
      const { data, error } = await ctx.supabase.rpc("list_discover_members", {
        p_user_id: ctx.user.id,
      });
      if (error) console.error("[explore.list_discover_members]", error);
      // 개인정보 보호: 실명은 마스킹해서만 클라이언트로 보낸다 (탐색에선 실명 비노출)
      const members = ((data ?? []) as DiscoverMember[]).map((m) => ({
        ...m,
        name: maskName(m.name),
      }));
      return json(
        { guest: false, members, preview: [] as PreviewMember[] },
        { headers: ctx.headers },
      );
    }
  }

  const { data, error } = await ctx.supabase.rpc("list_discover_preview");
  if (error) console.error("[explore.list_discover_preview]", error);
  return json(
    { guest: true, members: [] as DiscoverMember[], preview: (data ?? []) as PreviewMember[] },
    { headers: ctx.headers },
  );
}

const genderLabel = (g: string | null) =>
  g === "male" ? "남" : g === "female" ? "여" : "";

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
    <span style={{ color: COLORS.text.placeholder, fontSize: "18px", flexShrink: 0 }}>
      ›
    </span>
  </div>
);

// 게스트(비로그인)용 익명 미리보기 카드 — 이름·학교 없이 성별+곡수만
const PreviewCard = ({ m, idx }: { m: PreviewMember; idx: number }) => (
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
        음악 메이트
        {genderLabel(m.gender) && (
          <span
            style={{
              ...TYPOGRAPHY.caption,
              color: COLORS.text.helper,
              marginLeft: "6px",
              fontWeight: 500,
            }}
          >
            {genderLabel(m.gender)}
          </span>
        )}
      </p>
      <p
        style={{
          ...TYPOGRAPHY.label,
          color: COLORS.text.placeholder,
          margin: "3px 0 0",
        }}
      >
        가입하면 누군지 볼 수 있어요
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
  const data = useLoaderData<typeof loader>();
  const isGuest = data.guest;

  return (
    <PhoneFrame style={{ paddingBottom: isGuest ? "92px" : "107px" }}>
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

        {isGuest ? (
          data.preview.length === 0 ? (
            <div
              style={{
                padding: "60px 20px",
                textAlign: "center",
                ...TYPOGRAPHY.label,
                color: COLORS.text.placeholder,
                lineHeight: 1.6,
              }}
            >
              곧 더 많은 분들이 합류할 거예요!
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {data.preview.map((m, i) => (
                <PreviewCard key={i} m={m} idx={i} />
              ))}
            </div>
          )
        ) : data.members.length === 0 ? (
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
            {data.members.map((m, i) => (
              <Link
                key={m.user_id}
                to={`/member/${m.user_id}`}
                style={{ display: "block", textDecoration: "none" }}
              >
                <MemberCard m={m} idx={i} />
              </Link>
            ))}
          </div>
        )}
      </div>

      {isGuest ? (
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: "390px",
            padding: "12px 20px",
            paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
            background: "white",
            borderTop: `1px solid ${COLORS.divider2}`,
            display: "flex",
            justifyContent: "center",
            zIndex: 10,
          }}
        >
          <Link to="/welcome" style={{ display: "block", width: "100%" }}>
            <PrimaryButton style={{ width: "100%", maxWidth: "none" }}>
              가입하고 매칭 시작하기
            </PrimaryButton>
          </Link>
        </div>
      ) : (
        <>
          <BottomNav active="explore" />
          <HomeIndicator />
        </>
      )}
    </PhoneFrame>
  );
}
