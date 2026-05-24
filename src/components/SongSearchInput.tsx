import type { InputHTMLAttributes } from "react";
import NoteIcon from "~/components/NoteIcon";
import { COLORS, TYPOGRAPHY, RADIUS } from "~/lib/constants";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  loading?: boolean;
};

export const SongSearchInput = ({ loading, style, ...rest }: Props) => {
  return (
    <div
      style={{
        boxSizing: "border-box",
        width: "100%",
        height: "56px",
        padding: "0 14px",
        background: "white",
        border: `1px solid ${COLORS.cardBorder}`,
        borderRadius: RADIUS.alert,
        display: "flex",
        alignItems: "center",
        gap: "10px",
        ...style,
      }}
    >
      <NoteIcon size={18} />
      <input
        {...rest}
        style={{
          flex: 1,
          height: "100%",
          background: "transparent",
          border: "none",
          outline: "none",
          ...TYPOGRAPHY.body,
          color: COLORS.text.primary,
        }}
      />
      {loading && (
        <span
          style={{
            width: "14px",
            height: "14px",
            border: "none",
            background: COLORS.accent,
            borderRadius: "50%",
            opacity: 0.6,
            animation: "spin 0.8s linear infinite",
          }}
        />
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default SongSearchInput;
