import { useEffect, useState } from "react";
import {
  json,
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "@remix-run/node";
import { useFetcher, useNavigate } from "@remix-run/react";
import StatusBar from "~/components/StatusBar";
import { requireApprovedUser } from "~/lib/auth.server";
import { updateProfile } from "~/lib/repos/profiles.server";
import HomeIndicator from "~/components/HomeIndicator";
import PhoneFrame from "~/components/PhoneFrame";
import { PrimaryButton } from "~/components/Button";
import { COLORS, TYPOGRAPHY } from "~/lib/constants";

export async function loader({ request }: LoaderFunctionArgs) {
  const ctx = await requireApprovedUser(request);
  return json({}, { headers: ctx.headers });
}

export async function action({ request }: ActionFunctionArgs) {
  const ctx = await requireApprovedUser(request);
  const fd = await request.formData();
  const ids = String(fd.get("genres") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  // 알려진 장르만, 최대 MAX_GENRES 개
  const valid = ids
    .filter((id) => GENRES.some((g) => g.id === id))
    .slice(0, MAX_GENRES);
  if (valid.length === 0) {
    return json({ error: "장르를 한 개 이상 선택해주세요." }, { status: 400 });
  }
  await updateProfile(ctx.supabase, ctx.user.id, { genres: valid });
  return redirect("/music-select", { headers: ctx.headers });
}

type Genre = {
  id: string;
  label: string;
  hue: string; // 디스크 색감 placeholder
};

// 디자인 순서: BALLAD/HIPHOP, POP/INDIE, ROCK/JAZZ (영문 라벨 통일)
const GENRES: Genre[] = [
  { id: "ballad", label: "BALLAD", hue: "#a8a8a8" },
  { id: "hiphop", label: "HIPHOP", hue: "#5d3a5f" },
  { id: "pop", label: "POP", hue: "#d4a373" },
  { id: "indie", label: "INDIE", hue: "#7a9eb0" },
  { id: "rock", label: "ROCK", hue: "#2e2e2e" },
  { id: "jazz", label: "JAZZ", hue: "#b08d57" },
];

const MAX_GENRES = 3;

export default function Genre() {
  const navigate = useNavigate();
  const fetcher = useFetcher<{ error?: string }>();
  const submitting = fetcher.state !== "idle";
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  // 앨범커버 이미지가 없는(로드 실패한) 장르는 기존 LP판 모양으로 대체
  const [imgFailed, setImgFailed] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= MAX_GENRES) {
          setToast(`최대 ${MAX_GENRES}개까지 선택할 수 있어요.`);
          return prev;
        }
        next.add(id);
      }
      return next;
    });
  };

  // 토스트 자동 사라짐
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(id);
  }, [toast]);

  return (
    <PhoneFrame>
      <StatusBar />
      <div
        style={{
          flex: 1,
          padding: "0 25px",
          paddingBottom: "120px",
          position: "relative",
        }}
      >
        {/* 헤더 */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: "20px",
            marginBottom: "32px",
          }}
        >
          <h1
            style={{
              ...TYPOGRAPHY.headlineMd,
              fontSize: "22px",
              color: COLORS.text.primary,
              margin: 0,
            }}
          >
            어떤 <span style={{ color: COLORS.accent }}>장르</span>를
            <br />
            좋아하세요?
          </h1>
          <button
            type="button"
            onClick={() => navigate("/music")}
            aria-label="닫기"
            style={{
              fontSize: "24px",
              color: COLORS.text.secondary,
              background: "none",
              border: "none",
              cursor: "pointer",
              minWidth: "44px",
              minHeight: "44px",
            }}
          >
            ✕
          </button>
        </div>

        <p
          style={{
            ...TYPOGRAPHY.label,
            color: COLORS.text.helper,
            margin: 0,
            marginBottom: "24px",
          }}
        >
          같은 장르를 선택한 상대를 찾아드려요. 최대 {MAX_GENRES}개 ({selected.size}/
          {MAX_GENRES})
        </p>

        {/* 장르 그리드 — 2열 큰 원형, 라벨은 원 위에 (디자인 정합) */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "18px",
            justifyItems: "center",
          }}
        >
          {GENRES.map((g) => {
            const isSelected = selected.has(g.id);
            return (
              <button
                key={g.id}
                type="button"
                aria-pressed={isSelected}
                aria-label={g.label}
                onClick={() => toggle(g.id)}
                aria-pressed={isSelected}
                style={{ width: "100%", padding: 0, background: "none", border: "none" }}
              >
                <div
                  style={{
                    width: "100%",
                    aspectRatio: "1 / 1",
                    borderRadius: "50%",
                    overflow: "hidden",
                    background: `radial-gradient(circle at 35% 35%, ${g.hue}, #2c2c2c 70%, #111 100%)`,
                    boxShadow: isSelected
                      ? `0 0 0 3px ${COLORS.accent}`
                      : "0 2px 8px rgba(0,0,0,0.15)",
                    transition: "box-shadow 0.15s",
                    position: "relative",
                  }}
                >
                  {!imgFailed.has(g.id) && (
                    <img
                      src={`/images/music_album_cover/${g.id}_cover.png`}
                      alt=""
                      onError={() =>
                        setImgFailed((prev) => new Set(prev).add(g.id))
                      }
                      style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        // 미선택 = 흑백, 선택 = 컬러
                        filter: isSelected ? "none" : "grayscale(1) brightness(0.8)",
                        transition: "filter 0.15s",
                      }}
                    />
                  )}
                  {/* 가독성용 어두운 오버레이 + 라벨 */}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "rgba(0,0,0,0.18)",
                    }}
                  >
                    <span
                      style={{
                        ...TYPOGRAPHY.bodyBold,
                        fontSize: "18px",
                        letterSpacing: "0.5px",
                        color: "white",
                        textShadow: "0 1px 4px rgba(0,0,0,0.6)",
                      }}
                    >
                      {g.label}
                    </span>
                  </div>
                  {isSelected && (
                    <div
                      style={{
                        position: "absolute",
                        top: "10px",
                        right: "10px",
                        width: "26px",
                        height: "26px",
                        borderRadius: "50%",
                        background: COLORS.accent,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M5 12.5L10 17.5L19 7"
                          stroke="white"
                          strokeWidth="2.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: "34px",
          left: "25px",
          right: "25px",
        }}
      >
        <PrimaryButton
          disabled={selected.size === 0 || submitting}
          onClick={() =>
            fetcher.submit(
              { genres: [...selected].join(",") },
              { method: "post" },
            )
          }
          style={{ maxWidth: "none" }}
        >
          {submitting ? "저장 중…" : "다음으로"}
        </PrimaryButton>
      </div>
      <HomeIndicator />

      {/* 토스트 */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: "120px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(0,0,0,0.78)",
            color: "white",
            padding: "10px 16px",
            borderRadius: "20px",
            ...TYPOGRAPHY.caption,
            fontSize: "13px",
            whiteSpace: "nowrap",
            zIndex: 50,
          }}
        >
          {toast}
        </div>
      )}

    </PhoneFrame>
  );
}
