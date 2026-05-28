import { useRef, useState } from "react";
import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useNavigate } from "@remix-run/react";
import StatusBar from "~/components/StatusBar";
import HomeIndicator from "~/components/HomeIndicator";
import PhoneFrame from "~/components/PhoneFrame";
import ProgressDots from "~/components/ProgressDots";
import SignupStepNav from "~/components/SignupStepNav";
import { PrimaryButton } from "~/components/Button";
import { COLORS, TYPOGRAPHY } from "~/lib/constants";
import { requireUser } from "~/lib/auth.server";
import { useProfile } from "~/lib/profile-state";
import { getSupabaseBrowser } from "~/lib/supabase.client";
import { getClientEnv } from "~/lib/env.client";
import { downscaleImage } from "~/lib/image.client";

const NEXT = "/profile/payment";
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

// 온보딩 사진 단계 — 기존엔 사진을 받는 단계가 없어 신규 가입자 전원 photo_path 가 NULL 이었다.
// 데이팅 앱에서 사진은 매칭 동기의 핵심이라 가입 흐름에 정식 단계로 넣는다.
// 업로드는 profile.edit 와 동일하게 비공개 profile-photos 버킷의 본인 폴더(`${userId}/`)에.
// 경로(photoPath)는 프로필 임시저장(sessionStorage)에 담아 다음(payment) 단계에서 함께 저장된다.
export async function loader({ request }: LoaderFunctionArgs) {
  const ctx = await requireUser(request);
  return json({ userId: ctx.user.id }, { headers: ctx.headers });
}

export default function ProfilePhoto() {
  const navigate = useNavigate();
  const { state, update, hydrated } = useProfile();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("이미지 파일만 올릴 수 있어요.");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setError("사진은 5MB 이하만 올릴 수 있어요.");
      return;
    }
    setUploading(true);
    try {
      const env = getClientEnv();
      const supabase = getSupabaseBrowser({
        url: env.SUPABASE_URL,
        anonKey: env.SUPABASE_ANON_KEY,
      });
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setError("로그인이 만료됐어요. 새로고침 후 다시 시도해주세요.");
        return;
      }
      const { blob, ext } = await downscaleImage(file, 800);
      const path = `${session.user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("profile-photos")
        .upload(path, blob, { contentType: blob.type, upsert: false });
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage
        .from("profile-photos")
        .createSignedUrl(path, 3600);
      update({ photoPath: path });
      setPreview(signed?.signedUrl ?? null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[onboarding photo upload]", err);
      setError(`사진 업로드 실패: ${msg}`);
    } finally {
      setUploading(false);
    }
  };

  const hasPhoto = hydrated && !!state.photoPath;

  return (
    <PhoneFrame>
      <StatusBar />
      <SignupStepNav
        onBack={() => navigate("/profile/basic")}
        onNext={() => !uploading && navigate(NEXT)}
        canNext={hydrated && !uploading}
      />
      <div
        style={{
          flex: 1,
          padding: "0 25px",
          paddingBottom: "120px",
          position: "relative",
          overflowY: "auto",
        }}
      >
        <img
          src="/images/logo.png"
          alt="pliting"
          style={{
            width: "120px",
            height: "auto",
            objectFit: "contain",
            marginTop: "20px",
            marginBottom: "16px",
            display: "block",
          }}
        />

        <div style={{ marginBottom: "30px" }}>
          <ProgressDots total={3} current={2} />
        </div>

        <h1
          style={{
            ...TYPOGRAPHY.headlineMd,
            color: COLORS.text.primary,
            margin: 0,
            marginBottom: "12px",
            lineHeight: 1.25,
          }}
        >
          <span style={{ color: COLORS.accent }}>프로필 사진</span>을<br />
          올려주세요!
        </h1>
        <p
          style={{
            ...TYPOGRAPHY.body,
            color: COLORS.text.helper,
            margin: 0,
            marginBottom: "32px",
          }}
        >
          사진은 매칭된 상대에게만 공개돼요. 매칭 확률이 크게 올라가요!
        </p>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            aria-label="프로필 사진 추가"
            style={{
              width: "160px",
              height: "160px",
              borderRadius: "50%",
              border: "none",
              padding: 0,
              background: preview ? "transparent" : COLORS.accentSoft,
              backgroundImage: preview ? `url(${preview})` : undefined,
              backgroundSize: "cover",
              backgroundPosition: "center",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {!preview && (
              <span style={{ fontSize: "48px" }}>{uploading ? "⏳" : "📷"}</span>
            )}
            <span
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                padding: "6px 0",
                background: "rgba(0,0,0,0.45)",
                color: "white",
                ...TYPOGRAPHY.tiny,
                fontWeight: 600,
              }}
            >
              {uploading ? "올리는 중" : preview ? "변경" : "사진 추가"}
            </span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handlePhoto}
            style={{ display: "none" }}
          />
          {error && (
            <p
              style={{
                ...TYPOGRAPHY.caption,
                color: COLORS.accent,
                marginTop: "12px",
                textAlign: "center",
              }}
            >
              {error}
            </p>
          )}
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: "34px",
          left: "20px",
          right: "20px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <PrimaryButton
          disabled={!hydrated || uploading}
          onClick={() => navigate(NEXT)}
          style={{ width: "100%" }}
        >
          {hasPhoto ? "다음으로" : "사진 올리고 계속하기"}
        </PrimaryButton>
        {!hasPhoto && (
          <button
            type="button"
            onClick={() => navigate(NEXT)}
            style={{
              ...TYPOGRAPHY.label,
              color: COLORS.text.helper,
              textDecoration: "underline",
              textUnderlineOffset: "3px",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px",
            }}
          >
            나중에 추가할게요
          </button>
        )}
      </div>
      <HomeIndicator />
    </PhoneFrame>
  );
}
