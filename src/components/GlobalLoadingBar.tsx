import { useEffect, useRef, useState } from "react";
import { useNavigation } from "@remix-run/react";
import { COLORS, FRAME } from "~/lib/constants";

// 화면 전환/폼 제출 중 상단 진행바.
// 멈춰 보이지 않도록 계속 차오르는 트리클 방식:
//  - 전환 시작 150ms 후 노출(즉시 전환은 깜빡임 없음)
//  - 남은 거리를 조금씩 채우며 90%까지 꾸준히 전진("계속 진행되는 느낌")
//  - 완료되면 100%까지 채운 뒤 페이드아웃
export default function GlobalLoadingBar() {
  const navigation = useNavigation();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timers = useRef<{
    start?: ReturnType<typeof setTimeout>;
    trickle?: ReturnType<typeof setInterval>;
    hide?: ReturnType<typeof setTimeout>;
  }>({});

  useEffect(() => {
    const clearAll = () => {
      clearTimeout(timers.current.start);
      clearInterval(timers.current.trickle);
      clearTimeout(timers.current.hide);
    };

    if (navigation.state !== "idle") {
      clearAll();
      timers.current.start = setTimeout(() => {
        setVisible(true);
        setProgress(8);
        // 남은 거리(90 - p)의 일부씩 + 최소 증가량 → 멈추지 않고 계속 전진
        timers.current.trickle = setInterval(() => {
          setProgress((p) => (p >= 90 ? p : p + Math.max(0.6, (90 - p) * 0.07)));
        }, 110);
      }, 150);
    } else {
      clearAll();
      // 진행 중이던 경우에만 마무리 애니메이션
      setProgress((p) => (p > 0 ? 100 : 0));
      timers.current.hide = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 300);
    }

    return clearAll;
  }, [navigation.state]);

  if (!visible && progress === 0) return null;

  return (
    <div
      role="progressbar"
      aria-label="화면을 불러오는 중"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
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
          height: "100%",
          width: `${progress}%`,
          borderRadius: "0 2px 2px 0",
          background: COLORS.accent,
          boxShadow: `0 0 8px ${COLORS.accent}`,
          opacity: visible ? 1 : 0,
          transition: "width 0.18s ease-out, opacity 0.3s ease",
        }}
      />
    </div>
  );
}
