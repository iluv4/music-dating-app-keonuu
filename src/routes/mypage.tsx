import { useEffect, useState } from "react";
import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { Form, useLoaderData, useNavigate } from "@remix-run/react";
import StatusBar from "~/components/StatusBar";
import HomeIndicator from "~/components/HomeIndicator";
import PhoneFrame from "~/components/PhoneFrame";
import BottomNav from "~/components/BottomNav";
import NoteIcon from "~/components/NoteIcon";
import { SmallButton } from "~/components/Button";
import { COLORS, TYPOGRAPHY, RADIUS } from "~/lib/constants";
import { getUser } from "~/lib/auth.server";
import { getProfile, signPhotoUrl } from "~/lib/repos/profiles.server";
import { formatSchool } from "~/lib/campus";
import { listUserSongs } from "~/lib/repos/user-songs.server";
import type { Song } from "~/lib/song-types";
import PreviewBanner from "~/components/PreviewBanner";
import { PREVIEW_PROFILE, PREVIEW_SONGS } from "~/lib/preview-data";
import { identify } from "~/lib/analytics.client";

type Row = { label: string; value: string };

export async function loader({ request }: LoaderFunctionArgs) {
  const ctx = await getUser(request);
  // 비로그인 방문자 → 샘플 프로필로 마이페이지 미리보기
  if (!ctx.user) {
    return json({
      guest: true as const,
      profile: PREVIEW_PROFILE,
      email: "preview@musicmatch.app",
      songs: PREVIEW_SONGS,
      photoUrl: null as string | null,
    });
  }
  const [profile, songs] = await Promise.all([
    getProfile(ctx.supabase, ctx.user.id),
    listUserSongs(ctx.supabase, ctx.user.id),
  ]);
  const photoUrl = await signPhotoUrl(ctx.supabase, profile?.photo_path);
  return json(
    {
      guest: false as const,
      userId: ctx.user.id,
      profile,
      email: ctx.user.email ?? "",
      songs,
      photoUrl,
    },
    { headers: ctx.headers },
  );
}

const SongThumb = ({ src }: { src?: string }) => {
  const [errored, setErrored] = useState(false);
  if (!src || errored) {
    return (
      <div
        style={{
          width: "50px",
          height: "50px",
          borderRadius: "8px",
          background: COLORS.cardBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <NoteIcon size={20} color={COLORS.text.placeholder} />
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
        width: "50px",
        height: "50px",
        borderRadius: "8px",
        objectFit: "cover",
        flexShrink: 0,
      }}
    />
  );
};

export default function MyPage() {
  const data = useLoaderData<typeof loader>();
  const { guest, profile, email, songs, photoUrl } = data;
  const navigate = useNavigate();
  const mySongs: Song[] = songs ?? [];

  // person 트레잇 — PII 정책상 email/이름은 제외(traits_only).
  // 세그먼트·퍼널 분석용 분류 트레잇만 전송.
  useEffect(() => {
    if (data.guest) return;
    identify(data.userId, {
      gender: profile?.gender ?? null,
      birth_year: profile?.birth_year ?? null,
      school: profile?.school ?? null,
      campus: profile?.campus ?? null,
      region: profile?.region ?? null,
      is_approved: profile?.is_approved ?? null,
      has_photo: Boolean(photoUrl),
    });
  }, [data, profile, photoUrl]);

  const rows: Row[] = [
    { label: "이메일", value: email || "-" },
    { label: "이름", value: profile?.name ?? "-" },
    {
      label: "나이",
      value: profile?.birth_year ? `${profile.birth_year}년` : "-",
    },
    {
      label: "성별",
      value:
        profile?.gender === "male"
          ? "남자"
          : profile?.gender === "female"
          ? "여자"
          : "-",
    },
    { label: "학교", value: formatSchool(profile?.school, profile?.campus) },
    { label: "학과", value: profile?.major ?? "-" },
    { label: "거주지역", value: profile?.region || "-" },
    { label: "입금자명", value: profile?.bank_holder ?? "-" },
  ];

  return (
    <PhoneFrame style={{ paddingBottom: "calc(76px + env(safe-area-inset-bottom, 0px))" }}>
      <StatusBar />
      <div style={{ position: "relative", flex: 1, paddingTop: "20px" }}>
        {/* 헤더 */}
        <div
          style={{
            position: "relative",
            height: "32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "20px",
          }}
        >
          <button
            type="button"
            aria-label="back"
            style={{
              position: "absolute",
              left: "20px",
              top: "4px",
              fontSize: "20px",
              color: COLORS.text.secondary,
            }}
            onClick={() => window.history.back()}
          >
            ‹
          </button>
          <span style={{ ...TYPOGRAPHY.bodyBold, color: COLORS.text.primary }}>
            마이 페이지
          </span>
        </div>

        {guest && (
          <div style={{ padding: "0 20px" }}>
            <PreviewBanner text="가입하면 내 프로필을 만들고 음악으로 매칭돼요." />
          </div>
        )}

        {/* 프로필 */}
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <div
            style={{
              width: "143px",
              height: "143px",
              borderRadius: "50%",
              background: COLORS.accentSoft,
              margin: "0 auto 18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            <img
              src={photoUrl ?? "/images/profile-mascot.png"}
              alt=""
              style={
                photoUrl
                  ? { width: "100%", height: "100%", objectFit: "cover" }
                  : { width: "132px", height: "132px", objectFit: "contain" }
              }
            />
          </div>
          <h2
            style={{
              ...TYPOGRAPHY.headlineMd,
              color: COLORS.text.primary,
              margin: 0,
              marginBottom: "10px",
            }}
          >
            {profile?.name ?? "사용자"}
          </h2>

          {/* 승인 상태 배지 (버튼과 세로로 분리해 간격 확보) */}
          <div style={{ marginBottom: "16px" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "5px 12px",
                borderRadius: "999px",
                background: profile?.is_approved
                  ? "#e8f5ee"
                  : COLORS.accentSoft,
                color: profile?.is_approved ? "#2c8a4f" : COLORS.accent,
                ...TYPOGRAPHY.caption,
                fontWeight: 600,
              }}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: profile?.is_approved ? "#2c8a4f" : COLORS.accent,
                }}
              />
              {profile?.is_approved ? "승인 완료" : "관리자 승인 대기 중"}
            </div>
          </div>
          <SmallButton
            onClick={() => navigate(guest ? "/welcome" : "/profile/edit")}
            style={guest ? { width: "auto", padding: "0 18px" } : undefined}
          >
            {guest ? "가입하고 시작하기" : "내 정보 수정"}
          </SmallButton>
        </div>

        {/* 내 음악 — 실제 선택 곡 */}
        <div style={{ margin: "30px 25px 20px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              margin: "0 2px 8px",
            }}
          >
            <p
              style={{
                ...TYPOGRAPHY.caption,
                color: COLORS.text.helper,
                margin: 0,
                fontWeight: 600,
              }}
            >
              내 음악 {mySongs.length > 0 ? `(${mySongs.length}곡)` : ""}
            </p>
            {!guest && mySongs.length > 0 && (
              <button
                type="button"
                onClick={() => navigate("/genre")}
                style={{
                  ...TYPOGRAPHY.caption,
                  color: COLORS.accent,
                  fontWeight: 600,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px 2px",
                }}
              >
                변경 ›
              </button>
            )}
          </div>
          {mySongs.length === 0 ? (
            <button
              type="button"
              onClick={() => navigate("/genre")}
              style={{
                width: "100%",
                padding: "16px 14px",
                background: "white",
                borderRadius: RADIUS.alert,
                border: "none",
                ...TYPOGRAPHY.label,
                color: COLORS.text.placeholder,
                textAlign: "left",
                cursor: "pointer",
                boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
              }}
            >
              아직 선택한 곡이 없어요. 곡을 골라보세요 ›
            </button>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {mySongs.map((s) => (
                <div
                  key={s.songNo}
                  style={{
                    padding: "12px 14px",
                    background: "white",
                    borderRadius: RADIUS.alert,
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                  }}
                >
                  <SongThumb src={s.albumImg} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        ...TYPOGRAPHY.bodyBold,
                        fontSize: "15px",
                        color: COLORS.text.primary,
                        margin: "0 0 3px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {s.title}
                    </p>
                    <p
                      style={{
                        ...TYPOGRAPHY.tiny,
                        color: COLORS.text.placeholder,
                        margin: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {s.artist}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 정보 박스 — 카드 + 행 구분선 */}
        <div
          style={{
            margin: "0 25px",
            background: "white",
            borderRadius: RADIUS.info,
            overflow: "hidden",
            boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
          }}
        >
          {rows.map((row, idx) => (
            <div
              key={row.label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "15px 18px",
                borderBottom:
                  idx < rows.length - 1
                    ? `1px solid ${COLORS.divider2}`
                    : "none",
              }}
            >
              <span
                style={{
                  ...TYPOGRAPHY.body,
                  color: COLORS.text.primary,
                }}
              >
                {row.label}
              </span>
              <span
                style={{
                  ...TYPOGRAPHY.body,
                  color: COLORS.text.secondary,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: "60%",
                  textAlign: "right",
                }}
              >
                {row.value}
              </span>
            </div>
          ))}
        </div>

        {/* 로그아웃 (게스트는 가입 유도) */}
        {guest ? (
          <button
            type="button"
            onClick={() => navigate("/welcome")}
            style={{
              width: "calc(100% - 50px)",
              margin: "24px 25px 0",
              height: "48px",
              borderRadius: "12px",
              background: COLORS.accent,
              border: "none",
              ...TYPOGRAPHY.bodyBold,
              fontSize: "14px",
              color: "white",
              cursor: "pointer",
            }}
          >
            가입하고 시작하기
          </button>
        ) : (
          <>
            <Form method="post" action="/logout" style={{ margin: "24px 25px 0" }}>
              <button
                type="submit"
                style={{
                  width: "100%",
                  height: "48px",
                  borderRadius: "12px",
                  background: "white",
                  border: `1px solid ${COLORS.cardBorder}`,
                  ...TYPOGRAPHY.bodyBold,
                  fontSize: "14px",
                  color: COLORS.text.secondary,
                  cursor: "pointer",
                }}
              >
                로그아웃
              </button>
            </Form>
            <div style={{ textAlign: "center", margin: "16px 25px 0" }}>
              <button
                type="button"
                onClick={() => navigate("/account/delete")}
                style={{
                  ...TYPOGRAPHY.caption,
                  color: COLORS.text.placeholder,
                  textDecoration: "underline",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                회원탈퇴
              </button>
            </div>
          </>
        )}
      </div>

      <BottomNav active="my" />
      <HomeIndicator />
    </PhoneFrame>
  );
}
