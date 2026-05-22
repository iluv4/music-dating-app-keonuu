import { Link, useLocation } from "@remix-run/react";
import { COLORS, TYPOGRAPHY, FRAME, SHADOW } from "~/lib/constants";

type NavKey = "home" | "explore" | "chat" | "my";

type NavItem = {
  key: NavKey;
  label: string;
  path: string;
  icon: string;
};

const NAV_ITEMS: NavItem[] = [
  { key: "home", label: "홈", path: "/music", icon: "/icons/nav-home-active.png" },
  { key: "explore", label: "탐색", path: "/explore", icon: "/icons/nav-explore.png" },
  { key: "chat", label: "채팅", path: "/chat", icon: "/icons/nav-chat.png" },
  { key: "my", label: "마이", path: "/mypage", icon: "/icons/nav-my-active.png" },
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
            <img
              src={item.icon}
              alt=""
              style={{
                width: "36px",
                height: "36px",
                filter: isActive ? "none" : "grayscale(1) opacity(0.55)",
              }}
            />
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
