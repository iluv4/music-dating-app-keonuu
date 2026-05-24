import { useEffect, useState } from "react";
import {
  json,
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "@remix-run/node";
import {
  Form,
  Link,
  useActionData,
  useLoaderData,
  useNavigate,
  useNavigation,
} from "@remix-run/react";
import StatusBar from "~/components/StatusBar";
import HomeIndicator from "~/components/HomeIndicator";
import PhoneFrame from "~/components/PhoneFrame";
import BottomNav from "~/components/BottomNav";
import { COLORS, TYPOGRAPHY, RADIUS } from "~/lib/constants";
import {
  postApprovalDestination,
  requireApprovedUser,
} from "~/lib/auth.server";
import { listUserSongs } from "~/lib/repos/user-songs.server";
import { listUserMatches, getMatchWithPartner } from "~/lib/repos/matches.server";
import { countUnreadNotifications } from "~/lib/repos/notifications.server";
import { sendPushToUser } from "~/lib/push.server";
import { capture } from "~/lib/analytics.client";
import { initPush } from "~/lib/push.client";

export async function loader({ request }: LoaderFunctionArgs) {
  const ctx = await requireApprovedUser(request);

  const dest = await postApprovalDestination(ctx.supabase, ctx.user.id);
  if (dest !== "/music") {
    throw redirect(dest, { headers: ctx.headers });
  }

  const [songs, matches, unread] = await Promise.all([
    listUserSongs(ctx.supabase, ctx.user.id),
    listUserMatches(ctx.supabase, ctx.user.id),
    countUnreadNotifications(ctx.supabase, ctx.user.id),
  ]);

  return json(
    { songs, match: matches[0] ?? null, unread },
    { headers: ctx.headers },
  );
}

export async function action({ request }: ActionFunctionArgs) {
  const ctx = await requireApprovedUser(request);
  // 재매칭(다시 결제)은 /rematch 에서 처리. 여기선 최초 매칭 탐색만.
  const { data, error } = await ctx.supabase.rpc("find_or_create_match", {
    p_user_id: ctx.user.id,
  });

  if (error) {
    console.error("[music.find_or_create_match]", error);
    return json(
      { error: "매칭 중 문제가 발생했어요. 잠시 후 다시 시도해주세요." },
      { status: 500, headers: ctx.headers },
    );
  }

  const matchId = data as string | null;
  if (matchId) {
    // 매칭된 상대에게 푸시 (본인은 채팅으로 이동하므로 상대만)
    try {
      const m = await getMatchWithPartner(ctx.supabase, matchId, ctx.user.id);
      if (m?.partnerId) {
        await sendPushToUser(m.partnerId, {
          title: "새 매칭이 성사됐어요! 💘",
          body: "음악 취향이 통하는 상대와 매칭됐어요.",
          url: `/chat/${matchId}`,
        });
      }
    } catch (e) {
      console.error("[music.match push]", e);
    }
    return redirect(`/chat/${matchId}`, { headers: ctx.headers });
  }

  // 후보 없음
  return json({ error: null as string | null }, { headers: ctx.headers });
}

const BellIcon = ({ hasAlert = false }: { hasAlert?: boolean }) => (
  <div style={{ position: "relative", width: 24, height: 24 }}>
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M12 3a6 6 0 0 0-6 6v3.586l-1.707 1.707A1 1 0 0 0 5 16h14a1 1 0 0 0 .707-1.707L18 12.586V9a6 6 0 0 0-6-6z"
        stroke="#222"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M10 19a2 2 0 0 0 4 0"
        stroke="#222"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
    {hasAlert && (
      <span
        style={{
          position: "absolute",
          top: 1,
          right: 1,
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: COLORS.accent,
          border: "none",
        }}
      />
    )}
  </div>
);

const ctaBase = {
  width: "100%",
  height: "48px",
  borderRadius: RADIUS.button,
  ...TYPOGRAPHY.bodyBold,
  fontSize: "15px",
  border: "none",
  cursor: "pointer",
} as const;

export default function Music() {
  const navigate = useNavigate();
  const { songs, match, unread } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const matching = navigation.state === "submitting";
  const noCandidate = actionData != null && !actionData.error;

  // 로그인 홈 진입 시 푸시 구독 시도 (VAPID 키 없으면 no-op)
  useEffect(() => {
    void initPush();
  }, []);

  // 매칭 성사 후 1시간 카운트다운 (생성시각 기준, 클라이언트 계산)
  const MATCH_WINDOW_MS = 60 * 60 * 1000;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!match) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [match]);
  const remainingMs = match
    ? new Date(match.matchedAt).getTime() + MATCH_WINDOW_MS - now
    : 0;
  const expired = remainingMs <= 0;
  const formatCountdown = (ms: number) => {
    const s = Math.max(0, Math.floor(ms / 1000));
    const hh = String(Math.floor(s / 3600)).padStart(2, "0");
    const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  };

  return (
    <PhoneFrame style={{ paddingBottom: "76px" }}>
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
        <h1
          style={{
            ...TYPOGRAPHY.bodyBold,
            fontSize: "17px",
            color: COLORS.text.primary,
            margin: 0,
          }}
        >
          뮤직매치
        </h1>
        <Link
          to="/notifications"
          aria-label="알림"
          style={{
            position: "absolute",
            top: "50%",
            right: "18px",
            transform: "translateY(-50%)",
          }}
        >
          <BellIcon hasAlert={unread > 0} />
        </Link>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 24px" }}>
        {/* 매칭 카드 */}
        <div
          style={{
            background: "white",
            border: "none",
            borderRadius: "20px",
            padding: "20px 18px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
            textAlign: "center",
          }}
        >
          {match ? (
            <>
              <div
                style={{
                  width: "84px",
                  height: "84px",
                  borderRadius: "50%",
                  margin: "0 auto 14px",
                  background:
                    "linear-gradient(135deg, #ff9d8a 0%, #ff625d 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "34px",
                }}
              >
                💘
              </div>

              {/* 1시간 카운트다운 */}
              <div
                style={{
                  display: "inline-block",
                  ...TYPOGRAPHY.caption,
                  fontVariantNumeric: "tabular-nums",
                  letterSpacing: "0.5px",
                  color: expired ? COLORS.text.placeholder : COLORS.accent,
                  background: expired ? COLORS.cardBg : COLORS.accentSoft,
                  padding: "4px 12px",
                  borderRadius: "999px",
                  marginBottom: "10px",
                  fontWeight: 600,
                }}
              >
                {expired ? "시간 만료" : `남은 시간 ${formatCountdown(remainingMs)}`}
              </div>

              <p
                style={{
                  ...TYPOGRAPHY.bodyBold,
                  fontSize: "16px",
                  color: COLORS.text.primary,
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                <span style={{ color: COLORS.accent }}>
                  {match.partnerName}
                </span>{" "}
                님과
                <br />
                매칭이 성사되었어요!
              </p>
              {match.partnerSchool && (
                <p
                  style={{
                    ...TYPOGRAPHY.label,
                    color: COLORS.text.helper,
                    margin: "8px 0 0",
                  }}
                >
                  {match.partnerSchool}
                </p>
              )}
              <button
                type="button"
                onClick={() => navigate(`/chat/${match.matchId}`)}
                style={{
                  ...ctaBase,
                  marginTop: "18px",
                  background: COLORS.accent,
                  color: "white",
                }}
              >
                채팅하러 가기
              </button>
              <button
                type="button"
                onClick={() => navigate("/rematch")}
                style={{
                  ...ctaBase,
                  marginTop: "10px",
                  background: COLORS.accentSoft,
                  color: COLORS.accent,
                }}
              >
                ＋ 매칭 한 번 더 하기
              </button>
            </>
          ) : (
            <>
              <div
                style={{
                  width: "84px",
                  height: "84px",
                  borderRadius: "50%",
                  margin: "0 auto 14px",
                  background: COLORS.accentSoft,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "34px",
                }}
              >
                🎧
              </div>
              <p
                style={{
                  ...TYPOGRAPHY.bodyBold,
                  fontSize: "16px",
                  color: COLORS.text.primary,
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                음악 취향이 통하는
                <br />
                상대를 찾아볼까요?
              </p>
              <p
                style={{
                  ...TYPOGRAPHY.label,
                  color: COLORS.text.helper,
                  margin: "8px 0 0",
                }}
              >
                {noCandidate
                  ? "아직 딱 맞는 상대를 찾지 못했어요. 잠시 후 다시 시도해주세요."
                  : "선택한 노래가 겹치는 상대와 매칭돼요."}
              </p>
              <Form method="post">
                <button
                  type="submit"
                  disabled={matching || noCandidate}
                  onClick={() =>
                    capture("match.search_started", {
                      song_count: songs.length,
                    })
                  }
                  style={{
                    ...ctaBase,
                    marginTop: "18px",
                    // 한 번 시도해 후보가 없으면 회색 비활성 → 연타 방지(팀 피드백)
                    background: noCandidate ? COLORS.cardBorder : COLORS.accent,
                    color: "white",
                    cursor: matching || noCandidate ? "not-allowed" : "pointer",
                    opacity: matching ? 0.7 : 1,
                  }}
                >
                  {matching
                    ? "매칭 중..."
                    : noCandidate
                      ? "잠시 후 다시 시도"
                      : "매칭 찾기"}
                </button>
              </Form>
            </>
          )}
        </div>

      </div>

      <BottomNav active="home" />
      <HomeIndicator />
    </PhoneFrame>
  );
}
