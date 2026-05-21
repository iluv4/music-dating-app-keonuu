import { useState } from "react";
import { json, redirect, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
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
import type { Song } from "~/lib/song-types";

export async function loader({ request }: LoaderFunctionArgs) {
  const ctx = await requireApprovedUser(request);

  const dest = await postApprovalDestination(ctx.supabase, ctx.user.id);
  if (dest !== "/music") {
    throw redirect(dest, { headers: ctx.headers });
  }

  const songs = await listUserSongs(ctx.supabase, ctx.user.id);
  return json({ songs }, { headers: ctx.headers });
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

export default function Music() {
  const navigate = useNavigate();
  const { songs } = useLoaderData<typeof loader>();
  const matchGenre = "인디"; // TODO 매칭 알고리즘 도입 시 동적

  return (
    <PhoneFrame style={{ paddingBottom: "107px" }}>
      <StatusBar />

      {/* 헤더 — 뮤직매치 + 알림 */}
      <div
        style={{
          height: "52px",
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "white",
          borderBottom: "none",
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
        <button
          type="button"
          aria-label="알림"
          onClick={() => alert("알림 (추후 구현)")}
          style={{
            position: "absolute",
            top: "50%",
            right: "18px",
            transform: "translateY(-50%)",
            padding: 0,
            background: "none",
            border: "none",
          }}
        >
          <BellIcon hasAlert />
        </button>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "20px 20px 24px",
        }}
      >
        {/* 매칭 카드 */}
        <div
          style={{
            background: "white",
            border: "none",
            borderRadius: "20px",
            padding: "14px 14px 18px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
          }}
        >
          {/* 매칭 상대 미리보기 (블러 placeholder + 타이머 오버레이) */}
          <div
            style={{
              position: "relative",
              width: "100%",
              aspectRatio: "1 / 1",
              borderRadius: "14px",
              overflow: "hidden",
              background:
                "linear-gradient(135deg, #d6cfc7 0%, #b5a89c 45%, #948276 100%)",
              marginBottom: "16px",
            }}
          >
            {/* 어두운 오버레이로 가독성 보강 */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "radial-gradient(circle at 50% 45%, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.35) 70%, rgba(0,0,0,0.5) 100%)",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span
                style={{
                  fontFamily: "Pretendard, sans-serif",
                  fontWeight: 800,
                  fontSize: "44px",
                  letterSpacing: "0.5px",
                  color: "white",
                }}
              >
                01:00:00
              </span>
            </div>
          </div>

          {/* 매칭 메시지 */}
          <p
            style={{
              ...TYPOGRAPHY.bodyBold,
              fontSize: "16px",
              color: COLORS.text.primary,
              textAlign: "center",
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            <span style={{ color: COLORS.accent, fontWeight: 700 }}>
              {matchGenre}
            </span>
            를 좋아하는 OO 님과
            <br />
            매칭이 성사되었어요!
          </p>

          {/* 버튼 */}
          <div
            style={{
              marginTop: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <button
              type="button"
              onClick={() => navigate("/chat")}
              style={{
                width: "100%",
                height: "48px",
                background: COLORS.accent,
                color: "white",
                borderRadius: RADIUS.pill,
                ...TYPOGRAPHY.bodyBold,
                fontSize: "15px",
                border: "none",
              }}
            >
              수락하기
            </button>
            <button
              type="button"
              onClick={() => navigate("/genre")}
              style={{
                width: "100%",
                height: "48px",
                background: COLORS.accentSoft,
                color: COLORS.accent,
                borderRadius: RADIUS.pill,
                ...TYPOGRAPHY.bodyBold,
                fontSize: "15px",
                border: "none",
              }}
            >
              + 매칭 한 번 더 하기
            </button>
          </div>
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
