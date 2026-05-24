import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { Link, useLoaderData, useNavigate } from "@remix-run/react";
import StatusBar from "~/components/StatusBar";
import HomeIndicator from "~/components/HomeIndicator";
import PhoneFrame from "~/components/PhoneFrame";
import { COLORS, TYPOGRAPHY } from "~/lib/constants";
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

function formatDate(iso: string): string {
  const d = new Date(iso);
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

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
          <div style={{ display: "flex", flexDirection: "column" }}>
            {items.map((n) => {
              const inner = (
                <div
                  style={{
                    padding: "16px 4px",
                    borderBottom: `1px solid ${COLORS.divider2}`,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    {!n.is_read && (
                      <span
                        style={{
                          width: "6px",
                          height: "6px",
                          borderRadius: "50%",
                          background: COLORS.accent,
                          flexShrink: 0,
                        }}
                      />
                    )}
                    {n.type === "system" && (
                      <span
                        style={{
                          ...TYPOGRAPHY.tiny,
                          fontSize: "11px",
                          fontWeight: 600,
                          color: COLORS.text.secondary,
                          background: COLORS.cardBg,
                          padding: "2px 8px",
                          borderRadius: "999px",
                          flexShrink: 0,
                        }}
                      >
                        공지
                      </span>
                    )}
                    <span
                      style={{
                        ...TYPOGRAPHY.bodyBold,
                        fontSize: "15px",
                        color: COLORS.text.primary,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {n.title}
                    </span>
                  </div>
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
                    {formatDate(n.created_at)}
                  </p>
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
