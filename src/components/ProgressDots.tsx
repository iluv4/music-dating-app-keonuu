import { COLORS } from "~/lib/constants";

type ProgressDotsProps = {
  total: number;
  current: number; // 1-based
};

export const ProgressDots = ({ total, current }: ProgressDotsProps) => {
  return (
    <div
      style={{
        display: "flex",
        gap: "6px",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {Array.from({ length: total }, (_, i) => {
        const isActive = i + 1 === current;
        const isDone = i + 1 < current;
        return (
          <span
            key={i}
            style={{
              display: "block",
              width: isActive ? "20px" : "6px",
              height: "6px",
              borderRadius: "3px",
              background:
                isActive || isDone ? COLORS.accent : COLORS.cardBorder,
              transition: "width 0.2s ease",
            }}
          />
        );
      })}
    </div>
  );
};

export default ProgressDots;
