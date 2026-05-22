import { useEffect, useState } from "react";
import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useNavigate } from "@remix-run/react";
import StatusBar from "~/components/StatusBar";
import { requireApprovedUser } from "~/lib/auth.server";
import HomeIndicator from "~/components/HomeIndicator";
import PhoneFrame from "~/components/PhoneFrame";
import { PrimaryButton } from "~/components/Button";
import { COLORS, TYPOGRAPHY } from "~/lib/constants";

export async function loader({ request }: LoaderFunctionArgs) {
  const ctx = await requireApprovedUser(request);
  return json({}, { headers: ctx.headers });
}

type Genre = {
  id: string;
  label: string;
  hue: string; // 디스크 색감 placeholder
};

const GENRES: Genre[] = [
  { id: "ballad", label: "BALLAD", hue: "#a8a8a8" },
  { id: "rock", label: "ROCK", hue: "#2e2e2e" },
  { id: "jazz", label: "JAZZ", hue: "#b08d57" },
  { id: "indie", label: "인디", hue: "#7a9eb0" },
  { id: "pop", label: "팝", hue: "#d4a373" },
  { id: "hiphop", label: "HIPHOP", hue: "#5d3a5f" },
];

const MAX_GENRES = 3;

export default function Genre() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showExitModal, setShowExitModal] = useState(false);
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
            onClick={() => setShowExitModal(true)}
            aria-label="닫기"
            style={{ fontSize: "24px", color: COLORS.text.secondary }}
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
          관심 있는 장르를 최대 {MAX_GENRES}개까지 선택해주세요. ({selected.size}/{MAX_GENRES})
        </p>

        {/* 6개 장르 그리드 */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "20px",
            justifyItems: "center",
          }}
        >
          {GENRES.map((g) => {
            const isSelected = selected.has(g.id);
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => toggle(g.id)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "8px",
                  padding: 0,
                }}
              >
                <div
                  style={{
                    width: "92px",
                    height: "92px",
                    borderRadius: "50%",
                    overflow: "hidden",
                    background: `radial-gradient(circle at 35% 35%, ${g.hue}, #2c2c2c 70%, #111 100%)`,
                    border: "none",
                    boxShadow: isSelected
                      ? `0 0 0 3px ${COLORS.accent}`
                      : "0 2px 6px rgba(0,0,0,0.15)",
                    transition: "box-shadow 0.15s",
                    position: "relative",
                  }}
                >
                  {imgFailed.has(g.id) ? (
                    <div
                      style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        width: "26px",
                        height: "26px",
                        borderRadius: "50%",
                        background: "#1a1a1a",
                        border: "none",
                      }}
                    />
                  ) : (
                    <img
                      src={`/images/music_album_cover/${g.id}_cover.png`}
                      alt=""
                      onError={() =>
                        setImgFailed((prev) => new Set(prev).add(g.id))
                      }
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  )}
                </div>
                <span
                  style={{
                    ...TYPOGRAPHY.bodyBold,
                    fontSize: "14px",
                    color: isSelected ? COLORS.accent : COLORS.text.primary,
                  }}
                >
                  {g.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: "34px",
          left: "50%",
          transform: "translateX(-50%)",
        }}
      >
        <PrimaryButton
          disabled={selected.size === 0}
          onClick={() => navigate("/music-select")}
        >
          지금하기
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

      {/* 이탈 방지 모달 */}
      {showExitModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 100,
          }}
          onClick={() => setShowExitModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "300px",
              background: "white",
              borderRadius: "16px",
              padding: "28px 24px 20px",
              textAlign: "center",
            }}
          >
            <img
              src="/images/profile-mascot.png"
              alt=""
              style={{
                width: "110px",
                height: "110px",
                objectFit: "contain",
                marginBottom: "12px",
              }}
            />
            <p
              style={{
                ...TYPOGRAPHY.bodyBold,
                fontSize: "17px",
                color: COLORS.text.primary,
                margin: 0,
                marginBottom: "6px",
              }}
            >
              중간에 나가면 매칭이 어려워요
            </p>
            <p
              style={{
                ...TYPOGRAPHY.label,
                color: COLORS.text.helper,
                margin: 0,
                marginBottom: "20px",
              }}
            >
              취향 입력을 마저 진행해주세요.
            </p>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                onClick={() => navigate("/welcome")}
                style={{
                  flex: 1,
                  height: "46px",
                  borderRadius: "12px",
                  background: COLORS.cardBg,
                  color: COLORS.text.secondary,
                  ...TYPOGRAPHY.bodyBold,
                }}
              >
                나가기
              </button>
              <button
                type="button"
                onClick={() => setShowExitModal(false)}
                style={{
                  flex: 1,
                  height: "46px",
                  borderRadius: "12px",
                  background: COLORS.accent,
                  color: "white",
                  ...TYPOGRAPHY.bodyBold,
                }}
              >
                계속하기
              </button>
            </div>
          </div>
        </div>
      )}
    </PhoneFrame>
  );
}
