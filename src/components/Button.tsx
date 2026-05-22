import type { ButtonHTMLAttributes, ReactNode } from "react";
import { COLORS, RADIUS, TYPOGRAPHY } from "~/lib/constants";

type BaseProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
};

export const PrimaryButton = ({
  children,
  disabled,
  style,
  ...rest
}: BaseProps) => {
  return (
    <button
      {...rest}
      disabled={disabled}
      style={{
        width: "100%",
        maxWidth: "350px",
        height: "62px",
        background: disabled ? COLORS.cardBorder : COLORS.accent,
        color: "white",
        borderRadius: RADIUS.pill,
        ...TYPOGRAPHY.title,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.65 : 1,
        ...style,
        border: "none",
      }}
    >
      {children}
    </button>
  );
};

type InlineButtonProps = BaseProps & {
  variant?: "solid" | "soft";
};

export const InlineButton = ({
  children,
  variant = "solid",
  disabled,
  style,
  ...rest
}: InlineButtonProps) => {
  const isSolid = variant === "solid";
  return (
    <button
      {...rest}
      disabled={disabled}
      style={{
        width: "251px",
        height: "45px",
        background: isSolid ? COLORS.accent : COLORS.accentSoft,
        color: isSolid ? "white" : COLORS.accent,
        borderRadius: RADIUS.inlineButton,
        ...TYPOGRAPHY.bodyBold,
        fontSize: "14px",
        letterSpacing: "-0.28px",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
        ...style,
      }}
    >
      {children}
    </button>
  );
};

export const SmallButton = ({
  children,
  disabled,
  style,
  ...rest
}: BaseProps) => {
  return (
    <button
      {...rest}
      disabled={disabled}
      style={{
        width: "126px",
        height: "40px",
        background: COLORS.accent,
        color: "white",
        borderRadius: RADIUS.smallButton,
        ...TYPOGRAPHY.bodyBold,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        ...style,
        border: "none",
      }}
    >
      {children}
    </button>
  );
};
