import type { InputHTMLAttributes, ReactNode } from "react";
import { COLORS, TYPOGRAPHY, RADIUS } from "~/lib/constants";

type TextInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: ReactNode;
};

export const TextInput = ({ label, style, ...rest }: TextInputProps) => {
  const input = (
    <input
      {...rest}
      style={{
        boxSizing: "border-box",
        display: "block",
        width: "100%",
        maxWidth: "100%",
        height: "56px",
        padding: "0 16px",
        background: COLORS.cardBg,
        border: "none",
        borderRadius: RADIUS.info,
        ...TYPOGRAPHY.body,
        color: COLORS.text.primary,
        ...style,
      }}
    />
  );

  if (!label) return input;

  return (
    <div>
      <div
        style={{
          ...TYPOGRAPHY.bodyBold,
          color: COLORS.text.primary,
          marginBottom: "10px",
        }}
      >
        {label}
      </div>
      {input}
    </div>
  );
};

export default TextInput;
