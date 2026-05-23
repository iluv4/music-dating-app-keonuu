import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { Form, useLoaderData, useNavigate } from "@remix-run/react";
import StatusBar from "~/components/StatusBar";
import HomeIndicator from "~/components/HomeIndicator";
import PhoneFrame from "~/components/PhoneFrame";
import BottomNav from "~/components/BottomNav";
import { SmallButton } from "~/components/Button";
import { COLORS, TYPOGRAPHY, RADIUS } from "~/lib/constants";
import { requireUser } from "~/lib/auth.server";
import { getProfile } from "~/lib/repos/profiles.server";

type Row = { label: string; value: string };

export async function loader({ request }: LoaderFunctionArgs) {
  const ctx = await requireUser(request);
  const profile = await getProfile(ctx.supabase, ctx.user.id);
  return json(
    { profile, email: ctx.user.email ?? "" },
    { headers: ctx.headers },
  );
}

export default function MyPage() {
  const { profile, email } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  const rows: Row[] = [
    { label: "이메일", value: email || "-" },
    { label: "이름", value: profile?.name ?? "-" },
    {
      label: "나이",
      value: profile?.birth_year ? `${profile.birth_year}년` : "-",
    },
    {
      label: "성별",
      value:
        profile?.gender === "male"
          ? "남자"
          : profile?.gender === "female"
          ? "여자"
          : "-",
    },
    { label: "학교", value: profile?.school ?? "-" },
    { label: "학과", value: profile?.major ?? "-" },
    { label: "입금자명", value: profile?.bank_holder ?? "-" },
  ];

  return (
    <PhoneFrame style={{ paddingBottom: "107px" }}>
      <StatusBar />
      <div style={{ position: "relative", flex: 1, paddingTop: "20px" }}>
        {/* 헤더 */}
        <div
          style={{
            position: "relative",
            height: "32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "20px",
          }}
        >
          <button
            type="button"
            aria-label="back"
            style={{
              position: "absolute",
              left: "20px",
              top: "4px",
              fontSize: "20px",
              color: COLORS.text.secondary,
            }}
            onClick={() => window.history.back()}
          >
            ‹
          </button>
          <span style={{ ...TYPOGRAPHY.bodyBold, color: COLORS.text.primary }}>
            마이 페이지
          </span>
        </div>

        {/* 프로필 */}
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <div
            style={{
              width: "143px",
              height: "143px",
              borderRadius: "50%",
              background: COLORS.accentSoft,
              margin: "0 auto 18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            <img
              src="/images/profile-mascot.png"
              alt=""
              style={{
                width: "132px",
                height: "132px",
                objectFit: "contain",
              }}
            />
          </div>
          <h2
            style={{
              ...TYPOGRAPHY.headlineMd,
              color: COLORS.text.primary,
              margin: 0,
              marginBottom: "10px",
            }}
          >
            {profile?.name ?? "사용자"}
          </h2>

          {/* 승인 상태 배지 (버튼과 세로로 분리해 간격 확보) */}
          <div style={{ marginBottom: "16px" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "5px 12px",
                borderRadius: "999px",
                background: profile?.is_approved
                  ? "#e8f5ee"
                  : COLORS.accentSoft,
                color: profile?.is_approved ? "#2c8a4f" : COLORS.accent,
                ...TYPOGRAPHY.caption,
                fontWeight: 600,
              }}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: profile?.is_approved ? "#2c8a4f" : COLORS.accent,
                }}
              />
              {profile?.is_approved ? "승인 완료" : "관리자 승인 대기 중"}
            </div>
          </div>
          <SmallButton onClick={() => navigate("/profile/edit")}>
            내 정보 수정
          </SmallButton>
          <div style={{ marginTop: "12px" }}>
            <Form method="post" action="/logout">
              <button
                type="submit"
                style={{
                  ...TYPOGRAPHY.caption,
                  color: COLORS.text.placeholder,
                  textDecoration: "underline",
                  border: "none",
                }}
              >
                로그아웃
              </button>
            </Form>
          </div>
        </div>

        {/* mehro 추천 카드 */}
        <div
          style={{
            margin: "30px 25px 20px",
            padding: "13px 14px",
            background: "white",
            border: "none",
            borderRadius: RADIUS.alert,
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <div
            style={{
              width: "50px",
              height: "48px",
              borderRadius: "8px",
              background: "#eaeaea",
              flexShrink: 0,
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                fontFamily: '"Avenir Next", -apple-system, sans-serif',
                fontWeight: 500,
                fontSize: "16px",
                color: COLORS.text.primary,
                margin: 0,
                marginBottom: "4px",
                lineHeight: 1.3,
              }}
            >
              chance with you
            </p>
            <p
              style={{
                fontFamily: '"Avenir Next", -apple-system, sans-serif',
                fontWeight: 500,
                fontSize: "13px",
                color: "#949494",
                margin: 0,
              }}
            >
              mehro
            </p>
          </div>
          <span style={{ color: COLORS.text.muted, fontSize: "20px" }}>⋯</span>
        </div>

        {/* 정보 박스 */}
        <div
          style={{
            margin: "0 25px",
            border: "none",
            borderRadius: RADIUS.info,
            overflow: "hidden",
          }}
        >
          {rows.map((row, idx) => (
            <div
              key={row.label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "14px 18px",
                borderBottom: "none",
              }}
            >
              <span
                style={{
                  ...TYPOGRAPHY.body,
                  color: COLORS.text.primary,
                }}
              >
                {row.label}
              </span>
              <span
                style={{
                  ...TYPOGRAPHY.body,
                  color: COLORS.text.secondary,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: "60%",
                  textAlign: "right",
                }}
              >
                {row.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      <BottomNav active="my" />
      <HomeIndicator />
    </PhoneFrame>
  );
}
