// 하단 네비게이션 아이콘 (디자인시스템 멋사_1조 Figma 기반).
// 원본 SVG의 고정 색을 currentColor 로 치환 → 부모가 color 로 활성/비활성 제어.
// 높이만 size 로 고정하고 너비는 viewBox 비율로 자동 → 글리프별 자연 비율 유지.

type IconProps = {
  size?: number;
  color?: string;
};

const svgStyle = (size: number) =>
  ({ height: size, width: "auto", display: "block" }) as const;

// 홈 (Icon/home)
export const NavHomeIcon = ({ size = 26, color = "currentColor" }: IconProps) => (
  <svg
    viewBox="0 0 27 29.9058"
    fill="none"
    style={svgStyle(size)}
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M11.5479 0.72223C12.6713 -0.240743 14.3287 -0.240743 15.4521 0.72223L25.9521 9.72223C26.617 10.2922 27 11.1238 27 11.9996V26.9058C26.9998 28.5625 25.6567 29.9058 24 29.9058H20.3574C18.7007 29.9058 17.3576 28.5625 17.3574 26.9058V22.189C17.3573 20.0588 15.6302 18.3316 13.5 18.3316C11.3699 18.3317 9.64265 20.0589 9.64258 22.189V26.9058C9.64237 28.5625 8.29931 29.9058 6.64258 29.9058H3C1.34327 29.9058 0.000205627 28.5625 0 26.9058V11.9996C0 11.1238 0.382974 10.2922 1.04785 9.72223L11.5479 0.72223Z"
      fill={color}
    />
  </svg>
);

// 탐색 (Icon/search)
export const NavSearchIcon = ({ size = 26, color = "currentColor" }: IconProps) => (
  <svg
    viewBox="0 0 30 30"
    fill="none"
    style={svgStyle(size)}
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <circle cx="12.75" cy="12.75" r="11.25" stroke={color} strokeWidth="3" />
    <path
      d="M21 21L28.5 28.5"
      stroke={color}
      strokeWidth="3"
      strokeLinecap="round"
    />
  </svg>
);

// 채팅 (Icon/comment)
export const NavChatIcon = ({ size = 26, color = "currentColor" }: IconProps) => (
  <svg
    viewBox="0 0 27 23.991"
    fill="none"
    style={svgStyle(size)}
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M21 18.6865L20.6261 17.2339L19.5 17.5238V18.6865H21ZM19.7061 22.2529L20.7938 21.2201L20.7937 21.22L19.7061 22.2529ZM16.499 18.876L17.5867 17.843L17.1431 17.376H16.499V18.876ZM19.5 1.5V3C21.9853 3 24 5.01472 24 7.5H25.5H27C27 3.35786 23.6421 0 19.5 0V1.5ZM25.5 7.5H24V12.876H25.5H27V7.5H25.5ZM25.5 12.876H24C24 14.9705 22.5674 16.7341 20.6261 17.2339L21 18.6865L21.3739 20.1392C24.6081 19.3066 27 16.3728 27 12.876H25.5ZM21 18.6865H19.5V21.7363H21H22.5V18.6865H21ZM21 21.7363H19.5C19.5 21.0593 20.3268 20.7283 20.7938 21.2201L19.7061 22.2529L18.6183 23.2858C20.0184 24.7603 22.5 23.7685 22.5 21.7363H21ZM19.7061 22.2529L20.7937 21.22L17.5867 17.843L16.499 18.876L15.4114 19.9089L18.6184 23.2859L19.7061 22.2529ZM16.499 18.876V17.376H7.5V18.876V20.376H16.499V18.876ZM7.5 18.876V17.376C5.01472 17.376 3 15.3613 3 12.876H1.5H0C0 17.0181 3.35786 20.376 7.5 20.376V18.876ZM1.5 12.876H3V7.5H1.5H0V12.876H1.5ZM1.5 7.5H3C3 5.01472 5.01472 3 7.5 3V1.5V0C3.35786 0 0 3.35786 0 7.5H1.5ZM7.5 1.5V3H19.5V1.5V0H7.5V1.5Z"
      fill={color}
    />
  </svg>
);

// 마이 (Icon/my)
export const NavMyIcon = ({ size = 26, color = "currentColor" }: IconProps) => (
  <svg
    viewBox="0 0 27.2236 29.4231"
    fill="none"
    style={svgStyle(size)}
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <rect
      x="6.92855"
      width="13.0125"
      height="13.0125"
      rx="6.50627"
      fill={color}
    />
    <path
      d="M13.6123 14.4182C21.1299 14.4183 27.2236 20.5128 27.2236 28.0305C27.2236 28.7996 26.6002 29.4231 25.8311 29.4231H1.39258C0.623479 29.4231 0 28.7996 0 28.0305C0 20.5127 6.09457 14.4182 13.6123 14.4182Z"
      fill={color}
    />
  </svg>
);
