import { useId } from "react";
import { COLORS, TYPOGRAPHY, RADIUS } from "~/lib/constants";
import { SCHOOLS, findSchool, type Campus } from "~/lib/campus";

type CampusSelectProps = {
  label?: string;
  school: string;
  campus: Campus | "";
  onSchoolChange: (school: string) => void;
  onCampusChange: (campus: Campus) => void;
};

// 학교명 직접 입력(등록 대학은 자동완성) + 캠퍼스가 있는 대학이면 캠퍼스 버튼 노출.
export const CampusSelect = ({
  label = "학교",
  school,
  campus,
  onSchoolChange,
  onCampusChange,
}: CampusSelectProps) => {
  const listId = useId();
  const matched = findSchool(school);
  const campuses = matched?.campuses ?? [];

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

      {/* 학교명 직접 입력 — 등록 대학은 datalist 자동완성 */}
      <input
        type="text"
        list={listId}
        value={school}
        placeholder="학교명 입력 (예: 상명대학교)"
        onChange={(e) => onSchoolChange(e.target.value)}
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
        {SCHOOLS.map((s) => (
          <option key={s.id} value={s.name} />
        ))}
      </datalist>

      {/* 캠퍼스가 나뉜 대학만 캠퍼스 선택 */}
      {campuses.length > 0 && (
        <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
          {campuses.map((c) => {
            const selected = campus === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => onCampusChange(c)}
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
      )}
    </div>
  );
};

export default CampusSelect;
