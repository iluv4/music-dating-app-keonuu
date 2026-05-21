import type { CSSProperties, ReactNode } from "react";
import { FRAME } from "~/lib/constants";

type PhoneFrameProps = {
  children: ReactNode;
  style?: CSSProperties;
};

export const PhoneFrame = ({ children, style }: PhoneFrameProps) => {
  return (
    <div
      style={{
        width: FRAME.width,
        minHeight: "100vh",
        background: "white",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        margin: "0 auto",
        boxShadow: "0 0 10px rgba(0,0,0,0.06)",
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export default PhoneFrame;
