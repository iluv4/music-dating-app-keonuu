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
  approvedUserOrGuest,
  postApprovalDestination,
  requireApprovedUser,
} from "~/lib/auth.server";
import PreviewBanner from "~/components/PreviewBanner";
import { PREVIEW_SONGS, PREVIEW_MATCH } from "~/lib/preview-data";
import { listUserSongs } from "~/lib/repos/user-songs.server";
import { listUserGenres } from "~/lib/repos/user-genres.server";
import { listUserMatches, getMatchWithPartner } from "~/lib/repos/matches.server";
import { countUnreadNotifications } from "~/lib/repos/notifications.server";
import { GENRE_LABEL } from "~/lib/genres";
import { sendPushToUser } from "~/lib/push.server";
import { capture } from "~/lib/analytics.client";
import {
  syncPushIfGranted,
  enablePush,
  pushPermission,
} from "~/lib/push.client";

export async function loader({ request }: LoaderFunctionArgs) {
  const ctx = await approvedUserOrGuest(request);

  // 비로그인 방문자 → 샘플 매칭으로 홈 화면 미리보기
  if (ctx.guest) {
    return json({
      guest: true as const,
      songs: PREVIEW_SONGS,
      match: PREVIEW_MATCH,
      unread: 0,
      genres: [] as string[],
      capped: false,
    });
  }

  const dest = await postApprovalDestination(ctx.supabase, ctx.user.id);
  if (dest !== "/music") {
    throw redirect(dest, { headers: ctx.headers });
  }

  // 곡 저장 직후 캡 도달로 리다이렉트된 경우 안내 표시.
  const capped = new URL(request.url).searchParams.get("capped") === "1";

  const [songs, genres, matches, unread] = await Promise.all([
    listUserSongs(ctx.supabase, ctx.user.id),
    listUserGenres(ctx.supabase, ctx.user.id),
    listUserMatches(ctx.supabase, ctx.user.id),
    countUnreadNotifications(ctx.supabase, ctx.user.id),
  ]);

  return json(
    {
      guest: false as const,
      songs,
      match: matches[0] ?? null,
      unread,
      genres,
      capped,
    },
    { headers: ctx.headers },
  );
}

export async function action({ request }: ActionFunctionArgs) {
  const ctx = await requireApprovedUser(request);
  // 재매칭(다시 결제)은 /rematch 에서 처리. 여기선 최초 매칭 탐색만.
  // 장르 우선 매칭(find_best_match) — 안 겹쳐도 후보가 있으면 매칭.
  const { data, error } = await ctx.supabase.rpc("find_best_match", {
    p_user_id: ctx.user.id,
  });

  if (error) {
    // 누적 매칭 캡 도달 → 후보 없음과 구분해 안내.
    if (error.message?.includes("match_cap_reached")) {
      return json(
        { error: null as string | null, capped: true },
        { headers: ctx.headers },
      );
    }
    console.error("[music.find_best_match]", error);
    return json(
      { error: "매칭 중 문제가 발생했어요. 잠시 후 다시 시도해주세요.", capped: false },
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
  return json(
    { error: null as string | null, capped: false },
    { headers: ctx.headers },
  );
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
  const { guest, songs, match, unread, genres, capped: loaderCapped } =
    useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const matching = navigation.state === "submitting";
  const capped = loaderCapped || actionData?.capped === true;
  const noCandidate =
    actionData != null && !actionData.error && !actionData.capped;
  const genreLabels = genres.map((g) => GENRE_LABEL[g] ?? g);

  // 알림 켜기 배너 — iOS는 권한요청이 사용자 제스처 안에서만 동작하므로 버튼으로 노출.
  // 자동으로는 "이미 허용된 경우만" 조용히 구독 동기화.
  const [pushUi, setPushUi] = useState<
    "hidden" | "prompt" | "denied" | "ios-install"
  >("hidden");
  useEffect(() => {
    if (guest) return; // 미리보기 방문자에겐 알림 권한 요청을 띄우지 않음
    void syncPushIfGranted();
    const perm = pushPermission();
    if (perm === "default") {
      setPushUi("prompt");
    } else if (perm === "denied") {
      setPushUi("denied");
    } else if (perm === "unsupported") {
      // iOS Safari 탭(미설치 PWA)에선 알림 API가 없음 → 홈 화면 추가 안내
      const ua = navigator.userAgent || "";
      const isIOS = /iphone|ipad|ipod/i.test(ua);
      const standalone =
        (window.navigator as unknown as { standalone?: boolean }).standalone ===
          true ||
        window.matchMedia?.("(display-mode: standalone)").matches === true;
      if (isIOS && !standalone) setPushUi("ios-install");
    }
  }, []);

  const onEnablePush = async () => {
    const r = await enablePush();
    if (r === "ok") setPushUi("hidden");
    else if (r === "denied") setPushUi("denied");
    else setPushUi("hidden"); // unsupported/no-vapid 등은 조용히 숨김
  };

  return (
    <PhoneFrame style={{ paddingBottom: "calc(76px + env(safe-area-inset-bottom, 0px))" }}>
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
        {!guest && (
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
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 24px" }}>
        {guest && <PreviewBanner />}

        {/* 알림 켜기 배너 — 권한 미설정 시 버튼 탭으로 권한 요청(iOS 필수) */}
        {!guest && pushUi !== "hidden" && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              background: COLORS.accentSoft,
              borderRadius: RADIUS.info,
              padding: "12px 14px",
              marginBottom: "16px",
            }}
          >
            <span style={{ fontSize: "20px" }}>🔔</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  ...TYPOGRAPHY.label,
                  color: COLORS.text.primary,
                  margin: 0,
                  fontWeight: 600,
                }}
              >
                {pushUi === "denied"
                  ? "알림이 차단돼 있어요"
                  : pushUi === "ios-install"
                    ? "아이폰은 홈 화면에 추가해야 알림 가능"
                    : "매칭·메시지 알림 받기"}
              </p>
              <p
                style={{
                  ...TYPOGRAPHY.tiny,
                  color: COLORS.text.helper,
                  margin: "2px 0 0",
                  lineHeight: 1.4,
                }}
              >
                {pushUi === "denied"
                  ? "기기 설정 > 알림에서 허용해주세요. (iOS는 홈 화면에 추가한 앱에서만 가능)"
                  : pushUi === "ios-install"
                    ? "공유 버튼 → '홈 화면에 추가' → 추가된 앱 아이콘으로 열어주세요"
                    : "새 매칭과 메시지를 놓치지 마세요"}
              </p>
            </div>
            {pushUi === "prompt" && (
              <button
                type="button"
                onClick={onEnablePush}
                style={{
                  flexShrink: 0,
                  background: COLORS.accent,
                  color: "white",
                  borderRadius: "999px",
                  padding: "8px 14px",
                  ...TYPOGRAPHY.caption,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                켜기
              </button>
            )}
          </div>
        )}

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
              {!guest && (
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
                  ＋ 한 명 더 만나기
                </button>
              )}
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
                {capped ? (
                  <>
                    매칭 기회를
                    <br />
                    모두 사용했어요
                  </>
                ) : (
                  <>
                    음악 취향이 통하는
                    <br />
                    상대를 찾아볼까요?
                  </>
                )}
              </p>

              {/* 선택한 장르 칩 — 어떤 취향으로 매칭되는지 노출 */}
              {!capped && genreLabels.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "6px",
                    justifyContent: "center",
                    marginTop: "12px",
                  }}
                >
                  {genreLabels.map((label) => (
                    <span
                      key={label}
                      style={{
                        ...TYPOGRAPHY.tiny,
                        fontWeight: 700,
                        color: COLORS.accent,
                        background: COLORS.accentSoft,
                        borderRadius: "999px",
                        padding: "4px 10px",
                        letterSpacing: "0.3px",
                      }}
                    >
                      {label}
                    </span>
                  ))}
                </div>
              )}

              <p
                style={{
                  ...TYPOGRAPHY.label,
                  color: COLORS.text.helper,
                  margin: "8px 0 0",
                }}
              >
                {capped
                  ? "더 만나려면 재입금 후 운영팀 승인이 필요해요."
                  : noCandidate
                    ? "아직 상대가 모이지 않았어요. 잠시 후 다시 시도해주세요."
                    : genreLabels.length > 0
                      ? "같은 장르를 고른 상대와 우선 매칭돼요."
                      : "선택한 음악 취향이 통하는 상대와 매칭돼요."}
              </p>
              {!capped && (
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
                      background: noCandidate
                        ? COLORS.cardBorder
                        : COLORS.accent,
                      color: "white",
                      cursor:
                        matching || noCandidate ? "not-allowed" : "pointer",
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
              )}
            </>
          )}
        </div>

      </div>

      <BottomNav active="home" />
      <HomeIndicator />
    </PhoneFrame>
  );
}
