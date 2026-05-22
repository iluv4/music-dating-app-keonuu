import { useState } from "react";
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
import NoteIcon from "~/components/NoteIcon";
import { COLORS, TYPOGRAPHY, RADIUS } from "~/lib/constants";
import {
  postApprovalDestination,
  requireApprovedUser,
} from "~/lib/auth.server";
import { listUserSongs } from "~/lib/repos/user-songs.server";
import { listUserMatches } from "~/lib/repos/matches.server";
import { countUnreadNotifications } from "~/lib/repos/notifications.server";
import { capture } from "~/lib/analytics.client";
import type { Song } from "~/lib/song-types";

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

const AlbumThumb = ({ src, size }: { src?: string; size: number }) => {
  const [errored, setErrored] = useState(false);
  if (!src || errored) {
    return (
      <div
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: "10px",
          background: COLORS.cardBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <NoteIcon size={size * 0.4} color={COLORS.text.placeholder} />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      onError={() => setErrored(true)}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: "10px",
        objectFit: "cover",
        background: COLORS.cardBg,
        flexShrink: 0,
      }}
    />
  );
};

const SongCard = ({ song }: { song: Song }) => (
  <div
    style={{
      flexShrink: 0,
      width: "230px",
      padding: "10px 14px",
      background: "white",
      border: "none",
      borderRadius: RADIUS.info,
      display: "flex",
      alignItems: "center",
      gap: "10px",
    }}
  >
    <AlbumThumb src={song.albumImg} size={42} />
    <div style={{ flex: 1, minWidth: 0 }}>
      <p
        style={{
          ...TYPOGRAPHY.bodyBold,
          fontSize: "14px",
          margin: 0,
          color: COLORS.text.primary,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {song.title}
      </p>
      <p
        style={{
          ...TYPOGRAPHY.tiny,
          margin: "2px 0 0",
          color: COLORS.text.placeholder,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {song.artist}
      </p>
    </div>
    <span style={{ color: COLORS.text.placeholder, fontSize: "16px" }}>›</span>
  </div>
);

const ctaBase = {
  width: "100%",
  height: "48px",
  borderRadius: RADIUS.pill,
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

  return (
    <PhoneFrame style={{ paddingBottom: "107px" }}>
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
                    "linear-gradient(135deg, #ffb3b0 0%, #ff625d 100%)",
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
                  disabled={matching}
                  onClick={() =>
                    capture("match_search_clicked", {
                      song_count: songs.length,
                    })
                  }
                  style={{
                    ...ctaBase,
                    marginTop: "18px",
                    background: COLORS.accent,
                    color: "white",
                    opacity: matching ? 0.7 : 1,
                  }}
                >
                  {matching ? "매칭 중..." : "매칭 찾기"}
                </button>
              </Form>
            </>
          )}
        </div>

        {/* 내가 선택한 음악 섹션 */}
        <div style={{ marginTop: "28px" }}>
          <button
            type="button"
            onClick={() => navigate("/music-select")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "none",
              padding: 0,
              marginBottom: "6px",
              border: "none",
            }}
          >
            <span
              style={{
                ...TYPOGRAPHY.bodyBold,
                fontSize: "15px",
                color: COLORS.text.primary,
              }}
            >
              어떤 노래를 선택하실지 고민이신가요?
            </span>
            <span style={{ color: COLORS.text.placeholder, fontSize: "16px" }}>
              ›
            </span>
          </button>
          <p
            style={{
              ...TYPOGRAPHY.label,
              color: COLORS.text.placeholder,
              margin: 0,
              marginBottom: "12px",
            }}
          >
            취향이 같으면 대화도 쉬워져요! 노래를 둘러보세요.
          </p>

          {songs.length === 0 ? (
            <p
              style={{
                ...TYPOGRAPHY.label,
                color: COLORS.text.placeholder,
                padding: "16px 0",
              }}
            >
              아직 선택한 곡이 없어요.
            </p>
          ) : (
            <div
              style={{
                display: "flex",
                gap: "10px",
                overflowX: "auto",
                paddingBottom: "4px",
                marginLeft: "-20px",
                marginRight: "-20px",
                paddingLeft: "20px",
                paddingRight: "20px",
              }}
            >
              {songs.map((s) => (
                <SongCard key={s.songNo} song={s} />
              ))}
            </div>
          )}
        </div>
      </div>

      <BottomNav active="home" />
      <HomeIndicator />
    </PhoneFrame>
  );
}
