import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import StatusBar from "~/components/StatusBar";
import HomeIndicator from "~/components/HomeIndicator";
import PhoneFrame from "~/components/PhoneFrame";
import BottomNav from "~/components/BottomNav";
import { COLORS, TYPOGRAPHY, RADIUS } from "~/lib/constants";
import { approvedUserOrGuest } from "~/lib/auth.server";
import { listUserMatches } from "~/lib/repos/matches.server";
import PreviewBanner from "~/components/PreviewBanner";
import { PREVIEW_MATCH } from "~/lib/preview-data";

// 채팅 목록 — 진행 중인 모든 매칭을 보여준다(다중 매칭 지원).
// 연락을 끊지 않고 여러 상대와 동시에 대화할 수 있도록 단일 자동이동을 폐기.
export async function loader({ request }: LoaderFunctionArgs) {
  const ctx = await approvedUserOrGuest(request);
  // 비로그인 방문자 → 샘플 대화 1건으로 채팅 목록 미리보기
  if (ctx.guest) {
    return json({ guest: true as const, matches: [PREVIEW_MATCH] });
  }
  // 종료된 매칭도 회색으로 남겨 히스토리 유지(연락 끊겨도 기록은 보존).
  const matches = await listUserMatches(ctx.supabase, ctx.user.id, {
    status: "all",
  });
  return json({ guest: false as const, matches }, { headers: ctx.headers });
}

const AVATAR_BG = [
  "linear-gradient(135deg, #ffd1a8, #ff8c69)",
  "linear-gradient(135deg, #a8d8ff, #6f9eff)",
  "linear-gradient(135deg, #c9b3ff, #9b7bff)",
  "linear-gradient(135deg, #ffb3d1, #ff6f9e)",
  "linear-gradient(135deg, #b3f0d1, #5fcf9b)",
];

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "방금";
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}일 전`;
  return `${Math.floor(day / 7)}주 전`;
}

export default function ChatList() {
  const { guest, matches } = useLoaderData<typeof loader>();

  return (
    <PhoneFrame style={{ paddingBottom: "calc(76px + env(safe-area-inset-bottom, 0px))" }}>
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

      {guest && (
        <div style={{ padding: "12px 20px 0" }}>
          <PreviewBanner text="실제 매칭이 되면 여기서 바로 대화할 수 있어요." />
        </div>
      )}

      {guest && (
        <div style={{ padding: "12px 20px 0" }}>
          <Link
            to="/chat/ai"
            className="tappable"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "14px 16px",
              borderRadius: RADIUS.card,
              background: COLORS.accentSoft,
              border: `1px solid ${COLORS.accent}`,
              textDecoration: "none",
            }}
          >
            <span style={{ fontSize: "26px" }} aria-hidden>
              🤖
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  ...TYPOGRAPHY.bodyBold,
                  fontSize: "15px",
                  color: COLORS.text.primary,
                  margin: 0,
                }}
              >
                AI와 체험 대화하기
              </p>
              <p
                style={{
                  ...TYPOGRAPHY.tiny,
                  color: COLORS.text.helper,
                  margin: "3px 0 0",
                }}
              >
                매칭 상대와의 대화를 미리 주고받아 보세요
              </p>
            </div>
            <span style={{ color: COLORS.accent, fontSize: "18px" }}>›</span>
          </Link>
        </div>
      )}

      {matches.length === 0 ? (
        <div
          style={{
            flex: 1,
            padding: "80px 30px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
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
              margin: "0 0 10px",
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
      ) : (
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 0 16px" }}>
          {matches.map((m, i) => {
            const ended = m.status === "ended";
            const preview = m.lastMessage
              ? m.lastMessage.content || "사진을 보냈어요"
              : "새 매칭! 먼저 인사해보세요 🎵";
            return (
              <Link
                key={m.matchId}
                to={`/chat/${m.matchId}`}
                className="tappable"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  padding: "14px 20px",
                  textDecoration: "none",
                  opacity: ended ? 0.55 : 1,
                }}
              >
                <div
                  style={{
                    width: "52px",
                    height: "52px",
                    borderRadius: "50%",
                    background: AVATAR_BG[i % AVATAR_BG.length],
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
                    {m.partnerName}
                    {ended && (
                      <span
                        style={{
                          ...TYPOGRAPHY.caption,
                          color: COLORS.text.placeholder,
                          marginLeft: "6px",
                          fontWeight: 500,
                        }}
                      >
                        종료됨
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
                    {preview}
                  </p>
                </div>
                <span
                  style={{
                    ...TYPOGRAPHY.tiny,
                    color: COLORS.text.placeholder,
                    flexShrink: 0,
                  }}
                >
                  {timeAgo(m.lastMessage?.createdAt ?? m.matchedAt)}
                </span>
              </Link>
            );
          })}
        </div>
      )}

      <BottomNav active="chat" />
      <HomeIndicator />
    </PhoneFrame>
  );
}
