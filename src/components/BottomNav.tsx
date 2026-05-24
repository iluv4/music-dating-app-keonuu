import type { ComponentType } from "react";
import { Link, useLocation } from "@remix-run/react";
import { COLORS, TYPOGRAPHY, FRAME, SHADOW } from "~/lib/constants";
import {
  NavHomeIcon,
  NavSearchIcon,
  NavChatIcon,
  NavMyIcon,
} from "~/components/icons/NavIcons";

type NavKey = "home" | "explore" | "chat" | "my";

type IconComponent = ComponentType<{ size?: number; color?: string }>;

type NavItem = {
  key: NavKey;
  label: string;
  path: string;
  Icon: IconComponent;
};

// "탐색"은 is_approved 토글용 내부 디버그 화면 — 개발 환경에서만 노출
const SHOW_EXPLORE = process.env.NODE_ENV !== "production";

const NAV_ITEMS: NavItem[] = [
  { key: "home", label: "홈", path: "/music", Icon: NavHomeIcon },
  ...(SHOW_EXPLORE
    ? [{ key: "explore" as const, label: "탐색", path: "/explore", Icon: NavSearchIcon }]
    : []),
  { key: "chat", label: "채팅", path: "/chat", Icon: NavChatIcon },
  { key: "my", label: "마이", path: "/mypage", Icon: NavMyIcon },
];

const PATH_TO_KEY: Record<string, NavKey> = {
  "/music": "home",
  "/explore": "explore",
  "/chat": "chat",
  "/mypage": "my",
};

type BottomNavProps = {
  active?: NavKey;
};

export const BottomNav = ({ active }: BottomNavProps) => {
  const location = useLocation();
  const activeKey =
    active ??
    PATH_TO_KEY[location.pathname] ??
    (location.pathname.startsWith("/chat") ? "chat" : undefined);

  return (
    <nav
      style={{
        width: "100%",
        maxWidth: FRAME.width,
        height: FRAME.bottomNavHeight,
        background: "white",
        boxShadow: SHADOW.bottomNav,
        position: "fixed",
        bottom: 0,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 10,
        display: "flex",
        paddingTop: "14px",
      }}
    >
      {NAV_ITEMS.map((item) => {
        const isActive = activeKey === item.key;
        const Icon = item.Icon;
        return (
          <Link
            key={item.key}
            to={item.path}
            aria-label={item.label}
            aria-current={isActive ? "page" : undefined}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span
              style={{
                height: "26px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon
                size={24}
                color={isActive ? COLORS.nav.active : COLORS.nav.inactive}
              />
            </span>
            <span
              style={{
                ...TYPOGRAPHY.nav,
                color: isActive ? COLORS.nav.active : COLORS.nav.inactive,
                whiteSpace: "nowrap",
              }}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
};

export default BottomNav;
