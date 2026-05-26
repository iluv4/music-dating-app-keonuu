import { useMemo, useState } from "react";
import { COLORS, TYPOGRAPHY, RADIUS } from "~/lib/constants";
import { clubsForCampus } from "~/lib/clubs";
import type { Campus } from "~/lib/campus";

type ClubSelectProps = {
  label?: string;
  value: string;
  onChange: (name: string) => void;
  placeholder?: string;
  campus?: Campus | "";
};

// 동아리 입력 — 펼쳐지는 드롭다운(검색) + 목록에 없으면 직접 입력(자유 등록).
export const ClubSelect = ({
  label = "동아리",
  value,
  onChange,
  placeholder = "동아리 검색 (없으면 직접 입력)",
  campus = "",
}: ClubSelectProps) => {
  const [open, setOpen] = useState(false);
  const clubs = useMemo(() => (campus ? clubsForCampus(campus) : []), [campus]);

  const matches = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return clubs;
    return clubs.filter((c) => c.toLowerCase().includes(q));
  }, [clubs, value]);

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
            (선택 · 지인 매칭 제외에 사용)
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
          {matches.map((c) => (
            <button
              key={c}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(c);
                setOpen(false);
              }}
              style={{
                width: "100%",
                display: "block",
                padding: "12px 14px",
                background: value === c ? COLORS.accentSoft : "white",
                border: "none",
                borderTop: `1px solid ${COLORS.divider2}`,
                cursor: "pointer",
                textAlign: "left",
                ...TYPOGRAPHY.label,
                color: COLORS.text.primary,
              }}
            >
              {c}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClubSelect;
