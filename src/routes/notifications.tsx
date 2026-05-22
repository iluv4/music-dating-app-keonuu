import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { Link, useLoaderData, useNavigate } from "@remix-run/react";
import StatusBar from "~/components/StatusBar";
import HomeIndicator from "~/components/HomeIndicator";
import PhoneFrame from "~/components/PhoneFrame";
import { COLORS, TYPOGRAPHY, RADIUS } from "~/lib/constants";
import { requireUser } from "~/lib/auth.server";
import {
  listNotifications,
  markAllNotificationsRead,
} from "~/lib/repos/notifications.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const ctx = await requireUser(request);
  const items = await listNotifications(ctx.supabase, ctx.user.id);
  // 목록을 본 시점에 모두 읽음 처리 (배지 클리어)
  await markAllNotificationsRead(ctx.supabase, ctx.user.id);
  return json({ items }, { headers: ctx.headers });
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "방금";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  return `${d}일 전`;
}

const ICON: Record<string, string> = {
  match: "💘",
  message: "💬",
  system: "🔔",
};

export default function Notifications() {
  const { items } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  return (
    <PhoneFrame>
      <StatusBar />
      <div
        style={{
          height: "52px",
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "white",
        }}
      >
        <button
          type="button"
          aria-label="뒤로"
          onClick={() => navigate(-1)}
          style={{
            position: "absolute",
            left: "12px",
            top: "50%",
            transform: "translateY(-50%)",
            fontSize: "22px",
            background: "none",
            border: "none",
            color: COLORS.text.primary,
            minWidth: "44px",
            minHeight: "44px",
            cursor: "pointer",
          }}
        >
          ‹
        </button>
        <h1
          style={{
            ...TYPOGRAPHY.bodyBold,
            fontSize: "17px",
            color: COLORS.text.primary,
            margin: 0,
          }}
        >
          알림
        </h1>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "12px 20px 24px" }}>
        {items.length === 0 ? (
          <div
            style={{
              padding: "80px 20px",
              textAlign: "center",
              ...TYPOGRAPHY.body,
              color: COLORS.text.placeholder,
            }}
          >
            아직 새로운 알림이 없어요.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {items.map((n) => {
              const inner = (
                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                    padding: "14px 16px",
                    background: n.is_read ? "white" : COLORS.accentSoft,
                    borderRadius: RADIUS.alert,
                    boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                    alignItems: "flex-start",
                  }}
                >
                  <span style={{ fontSize: "20px", lineHeight: 1.2 }}>
                    {ICON[n.type] ?? "🔔"}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        ...TYPOGRAPHY.bodyBold,
                        fontSize: "15px",
                        margin: 0,
                        color: COLORS.text.primary,
                      }}
                    >
                      {n.title}
                    </p>
                    {n.body && (
                      <p
                        style={{
                          ...TYPOGRAPHY.label,
                          margin: "4px 0 0",
                          color: COLORS.text.secondary,
                          lineHeight: 1.5,
                        }}
                      >
                        {n.body}
                      </p>
                    )}
                    <p
                      style={{
                        ...TYPOGRAPHY.caption,
                        margin: "6px 0 0",
                        color: COLORS.text.placeholder,
                      }}
                    >
                      {timeAgo(n.created_at)}
                    </p>
                  </div>
                </div>
              );
              return n.link ? (
                <Link key={n.id} to={n.link} style={{ textDecoration: "none" }}>
                  {inner}
                </Link>
              ) : (
                <div key={n.id}>{inner}</div>
              );
            })}
          </div>
        )}
      </div>

      <HomeIndicator />
    </PhoneFrame>
  );
}
