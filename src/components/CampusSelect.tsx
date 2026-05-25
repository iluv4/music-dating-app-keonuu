import { COLORS, TYPOGRAPHY, RADIUS } from "~/lib/constants";
import { CAMPUSES, DEFAULT_SCHOOL, type Campus } from "~/lib/campus";

type CampusSelectProps = {
  label?: string;
  value: Campus | "";
  onChange: (campus: Campus) => void;
};

// 학교는 상명대학교 고정, 캠퍼스(서울/천안)만 선택.
export const CampusSelect = ({
  label = "학교",
  value,
  onChange,
}: CampusSelectProps) => {
  return (
    <div>
      {label && (
        <label
          style={{
            ...TYPOGRAPHY.bodyBold,
            display: "block",
            color: COLORS.text.primary,
            marginBottom: "10px",
          }}
        >
          {label}
        </label>
      )}

      {/* 상명대학교 (고정) */}
      <div
        style={{
          boxSizing: "border-box",
          width: "100%",
          height: "56px",
          padding: "0 16px",
          display: "flex",
          alignItems: "center",
          background: COLORS.divider2,
          borderRadius: RADIUS.alert,
          ...TYPOGRAPHY.body,
          color: COLORS.text.secondary,
        }}
      >
        {DEFAULT_SCHOOL.name}
      </div>

      {/* 캠퍼스 선택 */}
      <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
        {CAMPUSES.map((c) => {
          const selected = value === c;
          return (
            <button
              key={c}
              type="button"
              onClick={() => onChange(c)}
              style={{
                flex: 1,
                height: "52px",
                borderRadius: "12px",
                border: "none",
                background: selected ? COLORS.accentSoft : COLORS.cardBg,
                color: selected ? COLORS.accent : COLORS.text.primary,
                ...TYPOGRAPHY.bodyBold,
                cursor: "pointer",
              }}
            >
              {c}캠
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CampusSelect;
