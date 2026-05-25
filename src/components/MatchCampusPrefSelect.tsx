import { COLORS, TYPOGRAPHY } from "~/lib/constants";
import {
  MATCH_CAMPUS_PREFS,
  MATCH_CAMPUS_PREF_LABEL,
  type MatchCampusPref,
} from "~/lib/campus";

type Props = {
  label?: string;
  value: MatchCampusPref;
  onChange: (pref: MatchCampusPref) => void;
};

// 어느 캠퍼스 상대와 매칭하고 싶은지. 양쪽이 서로 원할 때만 매칭됨.
export const MatchCampusPrefSelect = ({
  label = "매칭 희망 캠퍼스",
  value,
  onChange,
}: Props) => {
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
          {label}{" "}
          <span style={{ ...TYPOGRAPHY.caption, color: COLORS.text.placeholder, fontWeight: 500 }}>
            (누구와 만나고 싶나요?)
          </span>
        </label>
      )}
      <div style={{ display: "flex", gap: "10px" }}>
        {MATCH_CAMPUS_PREFS.map((p) => {
          const selected = value === p;
          return (
            <button
              key={p}
              type="button"
              onClick={() => onChange(p)}
              style={{
                flex: 1,
                height: "52px",
                borderRadius: "12px",
                border: "none",
                background: selected ? COLORS.accentSoft : COLORS.cardBg,
                color: selected ? COLORS.accent : COLORS.text.primary,
                ...TYPOGRAPHY.label,
                fontWeight: 700,
                cursor: "pointer",
                padding: "0 6px",
              }}
            >
              {MATCH_CAMPUS_PREF_LABEL[p]}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MatchCampusPrefSelect;
