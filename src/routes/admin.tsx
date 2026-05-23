import {
  json,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "@remix-run/node";
import { Form, useLoaderData, useNavigation } from "@remix-run/react";
import { getSupabaseAdmin } from "~/lib/supabase-admin.server";

// 입금 확인용 관리자 승인 화면.
// 접근 제어: 환경변수 ADMIN_KEY 와 ?key= 쿼리(또는 폼 hidden)가 일치해야 함.
// ADMIN_KEY 미설정 시 라우트 전체가 404 → 기능 비활성.
// service_role 클라이언트로 조회/승인하므로 RLS·자가승인 가드(guard_approval_change)를 우회한다.

type Pending = {
  user_id: string;
  name: string;
  birth_year: number | null;
  school: string | null;
  major: string | null;
  bank_holder: string | null;
  created_at: string;
};

function assertKey(request: Request, key: string | null) {
  const expected = process.env.ADMIN_KEY;
  // 미설정이면 기능 자체를 숨김(404). 설정됐는데 불일치해도 404.
  if (!expected || key !== expected) {
    throw new Response("Not Found", { status: 404 });
  }
}

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  assertKey(request, key);

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("profiles")
    .select("user_id, name, birth_year, school, major, bank_holder, created_at")
    .eq("is_approved", false)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[admin.loader]", error);
    throw new Response("조회 오류", { status: 500 });
  }

  return json({ pending: (data ?? []) as unknown as Pending[] });
}

export async function action({ request }: ActionFunctionArgs) {
  const fd = await request.formData();
  const key = String(fd.get("key") ?? "");
  assertKey(request, key);

  const userId = String(fd.get("user_id") ?? "").trim();
  if (!userId) {
    return json({ ok: false, error: "user_id 누락" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("profiles")
    .update({
      is_approved: true,
      approved_at: new Date().toISOString(),
    } as never)
    .eq("user_id", userId);

  if (error) {
    console.error("[admin.approve]", error);
    return json({ ok: false, error: error.message }, { status: 500 });
  }
  return json({ ok: true });
}

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${d
    .getHours()
    .toString()
    .padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
};

export default function Admin() {
  const { pending } = useLoaderData<typeof loader>();
  const nav = useNavigation();
  const submitting = nav.state === "submitting";
  // 승인 폼 재요청 시 같은 key를 다시 보내기 위해 현재 URL의 key 사용
  const key =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("key") ?? ""
      : "";

  return (
    <div
      style={{
        maxWidth: "720px",
        margin: "0 auto",
        padding: "32px 20px 80px",
        fontFamily: "system-ui, -apple-system, sans-serif",
        color: "#1a1a1a",
      }}
    >
      <h1 style={{ fontSize: "22px", margin: "0 0 4px" }}>입금 승인 관리</h1>
      <p style={{ color: "#888", fontSize: "14px", margin: "0 0 24px" }}>
        계좌 입금 내역과 입금자명을 대조한 뒤 승인하세요. 승인 대기:{" "}
        <b>{pending.length}</b>명
      </p>

      {pending.length === 0 ? (
        <p style={{ color: "#aaa", padding: "40px 0", textAlign: "center" }}>
          승인 대기 중인 신청이 없어요.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {pending.map((p) => (
            <div
              key={p.user_id}
              style={{
                border: "1px solid #eee",
                borderRadius: "12px",
                padding: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: "16px", fontWeight: 600 }}>
                  {p.name}{" "}
                  <span style={{ color: "#999", fontWeight: 400, fontSize: "13px" }}>
                    {p.birth_year ?? "-"}년생
                  </span>
                </div>
                <div style={{ color: "#666", fontSize: "13px", marginTop: "3px" }}>
                  {p.school ?? "-"} {p.major ?? ""}
                </div>
                <div style={{ fontSize: "13px", marginTop: "5px" }}>
                  입금자명:{" "}
                  <b style={{ color: p.bank_holder ? "#ff625d" : "#bbb" }}>
                    {p.bank_holder || "미입력(둘러보기)"}
                  </b>
                  <span style={{ color: "#bbb", marginLeft: "10px" }}>
                    {fmtDate(p.created_at)}
                  </span>
                </div>
              </div>
              <Form method="post" replace>
                <input type="hidden" name="key" value={key} />
                <input type="hidden" name="user_id" value={p.user_id} />
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    background: "#ff625d",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    padding: "10px 18px",
                    fontSize: "14px",
                    fontWeight: 600,
                    cursor: submitting ? "wait" : "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  승인
                </button>
              </Form>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
