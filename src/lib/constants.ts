// 디자인 토큰 — Figma 시안 정합 (research.md 1.1 기준)
// 의사결정: Accent=#ff625d 화면 기준 유지 (plan_kim_0521_02 의사결정 로그)

export const COLORS = {
  accent: "#ff625d",
  accentSoft: "#ffeeed",
  bg: "#ffffff",
  cardBg: "#f9f9f9",
  cardBorder: "#e2e2e2",
  divider: "#dfdfdf",
  divider2: "#f3f3f3",
  text: {
    primary: "#000000",
    secondary: "#808080",
    helper: "#929292",
    placeholder: "#bfbfbf",
    muted: "#bdbdbd",
    veryMuted: "#9f9f9f",
    timer: "#d6d6d6",
  },
  nav: {
    active: "#ff625d",
    inactive: "#b0b8c1",
  },
} as const;

export const FONT_STACK = {
  brand: '"Pretendard", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  system: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif',
  avenir: '"Avenir Next", -apple-system, BlinkMacSystemFont, sans-serif',
} as const;

type TypographyToken = {
  fontFamily: string;
  fontWeight: number;
  fontSize: string;
  letterSpacing: string;
  lineHeight: number | string;
};

export const TYPOGRAPHY: Record<string, TypographyToken> = {
  display: {
    fontFamily: FONT_STACK.brand,
    fontWeight: 700,
    fontSize: "30px",
    letterSpacing: "-0.6px",
    lineHeight: 1.3,
  },
  headlineMd: {
    fontFamily: FONT_STACK.brand,
    fontWeight: 700,
    fontSize: "28px",
    letterSpacing: "-0.56px",
    lineHeight: 1.2,
  },
  headlineSm: {
    fontFamily: FONT_STACK.brand,
    fontWeight: 700,
    fontSize: "26px",
    letterSpacing: "-0.52px",
    lineHeight: 1.3,
  },
  title: {
    fontFamily: FONT_STACK.brand,
    fontWeight: 700,
    fontSize: "20px",
    letterSpacing: "0px",
    lineHeight: 1.35,
  },
  body: {
    fontFamily: FONT_STACK.brand,
    fontWeight: 500,
    fontSize: "16px",
    letterSpacing: "-0.32px",
    lineHeight: 1.4,
  },
  bodyBold: {
    fontFamily: FONT_STACK.brand,
    fontWeight: 600,
    fontSize: "16px",
    letterSpacing: "-0.32px",
    lineHeight: 1.4,
  },
  label: {
    fontFamily: FONT_STACK.brand,
    fontWeight: 400,
    fontSize: "14px",
    letterSpacing: "-0.28px",
    lineHeight: 1.4,
  },
  caption: {
    fontFamily: FONT_STACK.brand,
    fontWeight: 500,
    fontSize: "13px",
    letterSpacing: "-0.26px",
    lineHeight: 1.4,
  },
  tiny: {
    fontFamily: FONT_STACK.brand,
    fontWeight: 400,
    fontSize: "12px",
    letterSpacing: "-0.24px",
    lineHeight: 1.3,
  },
  tinyBold: {
    fontFamily: FONT_STACK.brand,
    fontWeight: 700,
    fontSize: "12px",
    letterSpacing: "-0.3px",
    lineHeight: 1.3,
  },
  nav: {
    fontFamily: FONT_STACK.brand,
    fontWeight: 600,
    fontSize: "11px",
    letterSpacing: "-0.22px",
    lineHeight: 1,
  },
  statusBar: {
    fontFamily: FONT_STACK.system,
    fontWeight: 600,
    fontSize: "17px",
    letterSpacing: "-0.408px",
    lineHeight: "22px",
  },
};

export const RADIUS = {
  card: "15px",
  info: "8px",
  alert: "12px",
  pill: "50px",
  inlineButton: "12px",
  smallButton: "20px",
  full: "9999px",
} as const;

export const SHADOW = {
  bottomNav: "0 -4px 10px rgba(0,0,0,0.18)",
  header: "0 4px 2px rgba(0,0,0,0.05)",
} as const;

export const SPACING = {
  pageX: "20px",
  pageXWide: "25px",
} as const;

export const FRAME = {
  width: "390px",
  statusBarHeight: "60px",
  homeIndicatorHeight: "34px",
  bottomNavHeight: "107px",
} as const;
