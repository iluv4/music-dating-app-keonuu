import { useMemo, useState } from "react";
import { COLORS, TYPOGRAPHY, RADIUS } from "~/lib/constants";
import { REGIONS } from "~/lib/campus";

type RegionSelectProps = {
  label?: string;
  value: string;
  onChange: (region: string) => void;
  placeholder?: string;
};

// 거주지역(고향·본가·자취) — 펼쳐지는 드롭다운 + 직접 입력.
export const RegionSelect = ({
  label = "거주지역",
  value,
  onChange,
  placeholder = "사는 지역 검색 (예: 서울, 천안)",
}: RegionSelectProps) => {
  const [open, setOpen] = useState(false);

  const matches = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return REGIONS;
    return REGIONS.filter((r) => r.toLowerCase().includes(q));
  }, [value]);

  return (
    <div style={{ position: "relative" }}>
      {label && (
        <label
          style={{
            ...TYPOGRAPHY.bodyBold,
            display: "block",
            color: COLORS.text.primary,
            marginBottom: "10px",
          }}
        >
          {label}{" "}
          <span style={{ ...TYPOGRAPHY.caption, color: COLORS.text.placeholder, fontWeight: 500 }}>
            (선택 · 가까운 상대 매칭에 사용)
          </span>
        </label>
      )}
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        style={{
          boxSizing: "border-box",
          width: "100%",
          height: "56px",
          padding: "0 16px",
          background: COLORS.cardBg,
          border: `1px solid ${COLORS.cardBorder}`,
          borderRadius: RADIUS.alert,
          ...TYPOGRAPHY.body,
          color: COLORS.text.primary,
        }}
      />

      {open && matches.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: label ? "92px" : "62px",
            left: 0,
            right: 0,
            maxHeight: "260px",
            overflowY: "auto",
            background: "white",
            border: `1px solid ${COLORS.cardBorder}`,
            borderRadius: RADIUS.info,
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            zIndex: 20,
          }}
        >
          {matches.map((r) => (
            <button
              key={r}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(r);
                setOpen(false);
              }}
              style={{
                width: "100%",
                display: "block",
                padding: "12px 14px",
                background: value === r ? COLORS.accentSoft : "white",
                border: "none",
                borderTop: `1px solid ${COLORS.divider2}`,
                cursor: "pointer",
                textAlign: "left",
                ...TYPOGRAPHY.label,
                color: COLORS.text.primary,
              }}
            >
              {r}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default RegionSelect;
