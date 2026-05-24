import type { InputHTMLAttributes, ReactNode } from "react";
import { COLORS, TYPOGRAPHY, RADIUS } from "~/lib/constants";

type TextInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: ReactNode;
};

export const TextInput = ({ label, style, id, name, ...rest }: TextInputProps) => {
  // 라벨↔input 연결용 id (스크린리더 접근성)
  const inputId = id ?? (typeof name === "string" ? name : undefined);

  const input = (
    <input
      id={inputId}
      name={name}
      {...rest}
      style={{
        boxSizing: "border-box",
        display: "block",
        width: "100%",
        maxWidth: "100%",
        height: "56px",
        padding: "0 16px",
        background: COLORS.cardBg,
        border: `1px solid ${COLORS.cardBorder}`,
        borderRadius: RADIUS.alert,
        ...TYPOGRAPHY.body,
        color: COLORS.text.primary,
        ...style,
      }}
    />
  );

  if (!label) return input;

  return (
    <div>
      <label
        htmlFor={inputId}
        style={{
          ...TYPOGRAPHY.bodyBold,
          display: "block",
          color: COLORS.text.primary,
          marginBottom: "10px",
        }}
      >
        {label}
      </label>
      {input}
    </div>
  );
};

export default TextInput;
