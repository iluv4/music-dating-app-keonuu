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
    <div
      style={{
        width: FRAME.width,
        height: FRAME.bottomNavHeight,
        background: "white",
        boxShadow: SHADOW.bottomNav,
        position: "fixed",
        bottom: 0,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 10,
      }}
    >
      {NAV_ITEMS.map((item, idx) => {
        const isActive = activeKey === item.key;
        const tabLeft = 22.5 + idx * 90;
        return (
          <Link
            key={item.key}
            to={item.path}
            style={{
              position: "absolute",
              top: "2px",
              left: `${tabLeft}px`,
              width: "75px",
              height: "103px",
              display: "block",
            }}
          >
            <img
              src={item.icon}
              alt=""
              style={{
                position: "absolute",
                top: "16px",
                left: "19.5px",
                width: "36px",
                height: "36px",
                filter: isActive ? "none" : "grayscale(1) opacity(0.55)",
              }}
            />
            <span
              style={{
                ...TYPOGRAPHY.nav,
                position: "absolute",
                top: "53.57px",
                left: "50%",
                transform: "translateX(-50%)",
                color: isActive ? COLORS.nav.active : COLORS.nav.inactive,
                whiteSpace: "nowrap",
              }}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
};

export default BottomNav;
