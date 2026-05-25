import { useId } from "react";
import { COLORS, TYPOGRAPHY, RADIUS } from "~/lib/constants";
import { REGIONS } from "~/lib/campus";

type RegionSelectProps = {
  label?: string;
  value: string;
  onChange: (region: string) => void;
  placeholder?: string;
};

// 거주지역(고향·본가·자취) — datalist 자동완성 + 직접 입력.
export const RegionSelect = ({
  label = "거주지역",
  value,
  onChange,
  placeholder = "사는 지역 검색 (예: 서울, 천안)",
}: RegionSelectProps) => {
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
            (선택 · 가까운 상대 매칭에 사용)
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
        {REGIONS.map((r) => (
          <option key={r} value={r} />
        ))}
      </datalist>
    </div>
  );
};

export default RegionSelect;
