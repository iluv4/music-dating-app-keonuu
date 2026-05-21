import { FRAME } from "~/lib/constants";

export const HomeIndicator = () => {
  return (
    <div
      style={{
        width: FRAME.width,
        height: FRAME.homeIndicatorHeight,
        background: "white",
        position: "relative",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: "absolute",
          bottom: "8.57px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "138.789px",
          height: "4.604px",
          background: "black",
          borderRadius: "100px",
        }}
      />
    </div>
  );
};

export default HomeIndicator;
