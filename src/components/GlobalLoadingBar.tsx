import { useEffect, useState } from "react";
import { useNavigation } from "@remix-run/react";
import { COLORS, FRAME } from "~/lib/constants";

// 화면 전환/폼 제출 중 상단 진행바.
// 150ms 이상 걸릴 때만 노출 → 즉시 전환은 깜빡임 없음, 느린 로딩은 "넘어가는 중" 표시.
export default function GlobalLoadingBar() {
  const navigation = useNavigation();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (navigation.state === "idle") {
      setShow(false);
      return;
    }
    const t = setTimeout(() => setShow(true), 150);
    return () => clearTimeout(t);
  }, [navigation.state]);

  if (!show) return null;

  return (
    <div
      role="progressbar"
      aria-label="화면을 불러오는 중"
      style={{
        position: "fixed",
        top: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: FRAME.width,
        maxWidth: "100%",
        height: "3px",
        zIndex: 9999,
        overflow: "hidden",
        pointerEvents: "none",
        background: COLORS.accentSoft,
      }}
    >
      <div
        style={{
          position: "absolute",
          height: "100%",
          width: "40%",
          borderRadius: "2px",
          background: COLORS.accent,
          animation: "loadingbar-slide 0.9s ease-in-out infinite",
        }}
      />
    </div>
  );
}
