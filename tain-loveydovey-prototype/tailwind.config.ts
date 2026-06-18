import type { Config } from "tailwindcss";

// 러비더비 톤 디자인 시스템 (리서치 기반: 핑크 메인 · 여성 타겟 · 따뜻/로맨틱)
export default {
  content: ["./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#FF5C8A", // 러비더비 핑크 (로즈핑크)
          50: "#FFF0F4",
          100: "#FFE1EA",
          200: "#FFC3D5",
          300: "#FFB3C7",
          400: "#FF85A8",
          500: "#FF5C8A",
          600: "#F23D72",
          700: "#C92E5A",
        },
        jam: "#FFC24B", // 잼(재화) 골드
        ink: "#2B2030", // 딥 플럼 텍스트
        sub: "#8A7E92", // 보조 텍스트
        cream: "#FFF8FA", // 배경 (연한 핑크빛 화이트)
      },
      fontFamily: {
        sans: [
          "Pretendard",
          "Apple SD Gothic Neo",
          "system-ui",
          "sans-serif",
        ],
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        soft: "0 4px 20px -4px rgba(255, 92, 138, 0.18)",
        card: "0 2px 12px -2px rgba(43, 32, 48, 0.08)",
      },
    },
  },
  plugins: [],
} satisfies Config;
