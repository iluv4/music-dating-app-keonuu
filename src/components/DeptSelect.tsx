import { useMemo, useRef, useState } from "react";
import { COLORS, TYPOGRAPHY, RADIUS } from "~/lib/constants";
import {
  filterDepartments,
  COLLEGE_COLORS,
  type DeptLevel,
} from "~/lib/departments";

type DeptSelectProps = {
  label?: string;
  value: string;
  onChange: (name: string) => void;
  placeholder?: string;
};

const LEVEL_BADGE: Record<DeptLevel, { bg: string; color: string }> = {
  학부: { bg: "#eef2ff", color: "#4f46e5" },
  학과: { bg: "#ecfdf5", color: "#059669" },
  전공: { bg: COLORS.accentSoft, color: COLORS.accent },
};

export const DeptSelect = ({
  label = "학과",
  value,
  onChange,
  placeholder = "학과·전공 검색 (예: 소프트웨어, 디자인)",
}: DeptSelectProps) => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const groups = useMemo(() => filterDepartments(query), [query]);

  const select = (name: string) => {
    onChange(name);
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
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

      <input
        type="text"
        value={open ? query : value || query}
        placeholder={value ? value : placeholder}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        // 포커스 아웃 시 닫기 (항목 클릭이 먼저 처리되도록 지연)
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        style={{
          boxSizing: "border-box",
          width: "100%",
          height: "56px",
          padding: "0 16px",
          background: COLORS.cardBg,
          border: "none",
          borderRadius: RADIUS.info,
          ...TYPOGRAPHY.body,
          color: COLORS.text.primary,
        }}
      />

      {/* 선택된 학과 chip */}
      {value && !open && (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            marginTop: "10px",
            background: COLORS.accentSoft,
            color: COLORS.accent,
            borderRadius: "999px",
            padding: "6px 12px",
            ...TYPOGRAPHY.caption,
            fontWeight: 600,
          }}
        >
          {value}
          <button
            type="button"
            aria-label="학과 선택 해제"
            onClick={() => {
              onChange("");
              setQuery("");
            }}
            style={{
              background: "none",
              border: "none",
              color: COLORS.accent,
              cursor: "pointer",
              fontSize: "14px",
              lineHeight: 1,
              padding: 0,
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* 드롭다운 */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: label ? "92px" : "62px",
            left: 0,
            right: 0,
            maxHeight: "300px",
            overflowY: "auto",
            background: "white",
            border: `1px solid ${COLORS.cardBorder}`,
            borderRadius: RADIUS.info,
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            zIndex: 20,
          }}
        >
          {groups.length === 0 ? (
            <div
              style={{
                padding: "20px",
                textAlign: "center",
                ...TYPOGRAPHY.label,
                color: COLORS.text.placeholder,
              }}
            >
              검색 결과가 없어요.
            </div>
          ) : (
            groups.map((g) => (
              <div key={g.college}>
                <div
                  style={{
                    position: "sticky",
                    top: 0,
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 14px",
                    background: COLORS.divider2,
                    ...TYPOGRAPHY.caption,
                    fontWeight: 700,
                    color: COLORS.text.secondary,
                  }}
                >
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: COLLEGE_COLORS[g.college] ?? COLORS.accent,
                      flexShrink: 0,
                    }}
                  />
                  {g.college}
                </div>
                {g.items.map((it) => {
                  const badge = LEVEL_BADGE[it.level];
                  return (
                    <button
                      key={it.name}
                      type="button"
                      // onMouseDown so it fires before input blur
                      onMouseDown={(e) => {
                        e.preventDefault();
                        select(it.name);
                      }}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "10px",
                        padding: "12px 14px",
                        background:
                          value === it.name ? COLORS.accentSoft : "white",
                        border: "none",
                        borderTop: `1px solid ${COLORS.divider2}`,
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      <span
                        style={{
                          ...TYPOGRAPHY.label,
                          color: COLORS.text.primary,
                        }}
                      >
                        {it.name}
                      </span>
                      <span
                        style={{
                          flexShrink: 0,
                          background: badge.bg,
                          color: badge.color,
                          borderRadius: "6px",
                          padding: "2px 8px",
                          ...TYPOGRAPHY.tiny,
                          fontWeight: 700,
                        }}
                      >
                        {it.level}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default DeptSelect;
