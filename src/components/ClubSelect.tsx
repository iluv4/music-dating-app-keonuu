import { useId } from "react";
import { COLORS, TYPOGRAPHY, RADIUS } from "~/lib/constants";
import { CLUBS } from "~/lib/clubs";

type ClubSelectProps = {
  label?: string;
  value: string;
  onChange: (name: string) => void;
  placeholder?: string;
};

// 동아리 입력 — datalist 자동완성(검색) + 목록에 없으면 직접 입력(자유 등록).
export const ClubSelect = ({
  label = "동아리",
  value,
  onChange,
  placeholder = "동아리 검색 (없으면 직접 입력)",
}: ClubSelectProps) => {
  const listId = useId();

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
            (선택 · 지인 매칭 제외에 사용)
          </span>
        </label>
      )}
      <input
        type="text"
        list={listId}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
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
      <datalist id={listId}>
        {CLUBS.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
    </div>
  );
};

export default ClubSelect;
