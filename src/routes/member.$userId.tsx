import { useState } from "react";
import { json, redirect, type LoaderFunctionArgs } from "@remix-run/node";
import { Link, useLoaderData, useNavigate } from "@remix-run/react";
import StatusBar from "~/components/StatusBar";
import HomeIndicator from "~/components/HomeIndicator";
import PhoneFrame from "~/components/PhoneFrame";
import NoteIcon from "~/components/NoteIcon";
import { COLORS, TYPOGRAPHY, RADIUS } from "~/lib/constants";
import { getUser, requireApprovedUser } from "~/lib/auth.server";
import { maskName } from "~/lib/format";
import type { Song } from "~/lib/song-types";
import PreviewBanner from "~/components/PreviewBanner";
import { PrimaryButton } from "~/components/Button";
import { PREVIEW_MEMBER } from "~/lib/preview-data";

type MemberDetail = {
  user_id: string;
  name: string;
  school: string | null;
  gender: string | null;
  photo_path?: string | null;
  songs: Song[];
};

// 탐색에서 멤버 카드 클릭 → 그 사람의 프로필 + 선택 곡.
// get_member_detail RPC(SECURITY DEFINER)가 승인자 검증 후 반환.
export async function loader({ request, params }: LoaderFunctionArgs) {
  const userId = params.userId;
  if (!userId) throw redirect("/explore");

  // 비로그인 방문자 → 샘플 회원 상세로 미리보기 (실제 가입자 PII 노출 안 함)
  const base = await getUser(request);
  if (!base.user) {
    return json({
      guest: true as const,
      detail: PREVIEW_MEMBER as MemberDetail,
      photoUrl: null as string | null,
    });
  }

  const ctx = await requireApprovedUser(request);
  const { data, error } = await ctx.supabase.rpc("get_member_detail", {
    p_user_id: userId,
  });
  if (error || !data) {
    console.error("[member.get_member_detail]", error);
    throw redirect("/explore", { headers: ctx.headers });
  }
  const detail = data as MemberDetail;
  // 매칭 후 공개 원칙: 멤버 상세(탐색 경유)에서는 얼굴 사진을 노출하지 않는다.
  return json(
    { guest: false as const, detail, photoUrl: null as string | null },
    { headers: ctx.headers },
  );
}

const genderLabel = (g: string | null) =>
  g === "male" ? "남" : g === "female" ? "여" : "";

const AlbumThumb = ({ src }: { src?: string }) => {
  const [errored, setErrored] = useState(false);
  if (!src || errored) {
    return (
      <div
        style={{
          width: "48px",
          height: "48px",
          borderRadius: "10px",
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
        width: "48px",
        height: "48px",
        borderRadius: "10px",
        objectFit: "cover",
        background: COLORS.cardBg,
        flexShrink: 0,
      }}
    />
  );
};

export default function MemberDetail() {
  const { guest, detail, photoUrl } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const songs = detail.songs ?? [];

  return (
    <PhoneFrame>
      <StatusBar />

      {/* 헤더 */}
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
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="뒤로"
          style={{
            position: "absolute",
            left: "8px",
            fontSize: "22px",
            color: COLORS.text.secondary,
            padding: "4px 8px",
          }}
        >
          ‹
        </button>
        <h1
          style={{
            ...TYPOGRAPHY.bodyBold,
            fontSize: "17px",
            color: COLORS.text.primary,
            margin: 0,
          }}
        >
          프로필
        </h1>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "24px 20px 32px" }}>
        {guest && <PreviewBanner text="가입하면 이런 분들과 음악으로 매칭돼요." />}

        {/* 프로필 헤더 */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            marginBottom: "28px",
          }}
        >
          <div
            style={{
              width: "88px",
              height: "88px",
              borderRadius: "50%",
              background: photoUrl
                ? "transparent"
                : `linear-gradient(135deg, #ff9b97 0%, ${COLORS.accent} 100%)`,
              backgroundImage: photoUrl ? `url(${photoUrl})` : undefined,
              backgroundSize: "cover",
              backgroundPosition: "center",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "38px",
              marginBottom: "14px",
            }}
          >
            {!photoUrl && "🎵"}
          </div>
          <p
            style={{
              ...TYPOGRAPHY.bodyBold,
              fontSize: "20px",
              color: COLORS.text.primary,
              margin: 0,
            }}
          >
            {maskName(detail.name)}
            {genderLabel(detail.gender) && (
              <span
                style={{
                  ...TYPOGRAPHY.label,
                  color: COLORS.text.helper,
                  marginLeft: "8px",
                  fontWeight: 500,
                }}
              >
                {genderLabel(detail.gender)}
              </span>
            )}
          </p>
          {detail.school && (
            <p
              style={{
                ...TYPOGRAPHY.label,
                color: COLORS.text.helper,
                margin: "6px 0 0",
              }}
            >
              {detail.school}
            </p>
          )}
        </div>

        {/* 선택한 곡 */}
        <p
          style={{
            ...TYPOGRAPHY.bodyBold,
            fontSize: "15px",
            color: COLORS.text.primary,
            margin: "0 0 12px",
          }}
        >
          🎶 {maskName(detail.name)} 님의 음악 ({songs.length}곡)
        </p>

        {songs.length === 0 ? (
          <p
            style={{
              ...TYPOGRAPHY.label,
              color: COLORS.text.placeholder,
              padding: "24px 0",
              textAlign: "center",
            }}
          >
            아직 선택한 곡이 없어요.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {songs.map((s) => (
              <div
                key={s.songNo}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  background: "white",
                  borderRadius: RADIUS.info,
                  padding: "10px 14px",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                }}
              >
                <AlbumThumb src={s.albumImg} />
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
                    {s.title}
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
                    {s.artist}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {guest && (
        <div
          style={{
            padding: "12px 20px",
            paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
            background: "white",
            borderTop: `1px solid ${COLORS.divider2}`,
          }}
        >
          <Link to="/welcome" style={{ display: "block", textDecoration: "none" }}>
            <PrimaryButton style={{ width: "100%", maxWidth: "none" }}>
              가입하고 매칭 시작하기
            </PrimaryButton>
          </Link>
        </div>
      )}

      <HomeIndicator />
    </PhoneFrame>
  );
}
