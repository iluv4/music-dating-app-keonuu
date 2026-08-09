import {
  json,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "@remix-run/node";
import { useEffect, useRef } from "react";
import {
  Form,
  useLoaderData,
  useNavigation,
  useSearchParams,
} from "@remix-run/react";
import { getSupabaseAdmin } from "~/lib/supabase-admin.server";
import { sendPushToUser } from "~/lib/push.server";

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
  phone: string | null;
  bank_holder: string | null;
  photo_path: string | null;
  photo_signed_url: string | null;
  created_at: string;
};

// 운영팀 확인 대기 중인 추가 매칭(한 명 더 만나기). 승인 시 active 로 전환 + 양쪽 알림.
type PendingMatch = {
  matchId: string;
  createdAt: string;
  aName: string;
  bName: string;
};

// 가입 도중 이탈한 사람(프로필 미생성). bucket 으로 어디서 멈췄는지 구분.
type Dropoff = {
  userId: string;
  email: string;
  bucket: "account_only" | "profile_basic" | "profile_photo" | "profile_payment";
  at: string; // 마지막 활동/가입 시각 ISO
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
  const [profilesRes, matchesRes] = await Promise.all([
    admin
      .from("profiles")
      .select("user_id, name, birth_year, school, major, phone, bank_holder, photo_path, created_at")
      .eq("is_approved", false)
      .order("created_at", { ascending: true }),
    admin
      .from("matches")
      .select("id, user_a, user_b, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: true }),
  ]);

  if (profilesRes.error) {
    console.error("[admin.loader.profiles]", profilesRes.error);
    throw new Response("조회 오류", { status: 500 });
  }
  if (matchesRes.error) {
    console.error("[admin.loader.matches]", matchesRes.error);
    throw new Response("조회 오류", { status: 500 });
  }

  const rawMatches = (matchesRes.data ?? []) as unknown as {
    id: string;
    user_a: string;
    user_b: string;
    created_at: string;
  }[];

  // 대기 매칭 양쪽 실명 조회 (이름 대조용)
  const ids = Array.from(
    new Set(rawMatches.flatMap((m) => [m.user_a, m.user_b])),
  );
  const nameMap = new Map<string, string>();
  if (ids.length > 0) {
    const { data: names } = await admin
      .from("profiles")
      .select("user_id, name")
      .in("user_id", ids);
    for (const n of (names ?? []) as { user_id: string; name: string }[]) {
      nameMap.set(n.user_id, n.name);
    }
  }

  const pendingMatches: PendingMatch[] = rawMatches.map((m) => ({
    matchId: m.id,
    createdAt: m.created_at,
    aName: nameMap.get(m.user_a) ?? "(알 수 없음)",
    bName: nameMap.get(m.user_b) ?? "(알 수 없음)",
  }));

  // 가입 이탈 현황: 프로필을 끝내지 못한(= profiles 행 없는) 계정을 단계별로 분류.
  // - account_only : 계정만 생성, 단계 진입 기록 없음(가입폼 직후 이탈 또는 추적 도입 전 가입자)
  // - profile_basic: 프로필 입력 화면까지 갔으나 결제 단계 전 이탈
  // - profile_payment: 결제 화면까지 갔으나 입금자명 제출 전 이탈
  const [allProfilesRes, progressRes, usersRes] = await Promise.all([
    admin.from("profiles").select("user_id"),
    admin
      .from("onboarding_progress")
      .select("user_id, step, updated_at"),
    admin.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  const completed = new Set(
    ((allProfilesRes.data ?? []) as { user_id: string }[]).map(
      (r) => r.user_id,
    ),
  );
  const progressMap = new Map<string, { step: string; updated_at: string }>();
  for (const r of (progressRes.data ?? []) as {
    user_id: string;
    step: string;
    updated_at: string;
  }[]) {
    progressMap.set(r.user_id, { step: r.step, updated_at: r.updated_at });
  }

  const dropoffs: Dropoff[] = [];
  for (const u of usersRes.data?.users ?? []) {
    if (completed.has(u.id)) continue; // 프로필 완료자는 제외
    const prog = progressMap.get(u.id);
    const bucket: Dropoff["bucket"] = !prog
      ? "account_only"
      : prog.step === "profile_payment"
        ? "profile_payment"
        : prog.step === "profile_photo"
          ? "profile_photo"
          : "profile_basic";
    dropoffs.push({
      userId: u.id,
      email: u.email ?? "(이메일 없음)",
      bucket,
      at: prog?.updated_at ?? u.last_sign_in_at ?? u.created_at,
    });
  }
  // 최근 활동 순
  dropoffs.sort((a, b) => (a.at < b.at ? 1 : -1));

  // 입구컷: 신청자 사진 썸네일을 운영팀이 입금자명·학생증과 대조할 수 있게 서명 URL 첨부.
  const rawPending = (profilesRes.data ?? []) as unknown as Omit<
    Pending,
    "photo_signed_url"
  >[];
  const pending: Pending[] = await Promise.all(
    rawPending.map(async (p) => {
      let photo_signed_url: string | null = null;
      if (p.photo_path) {
        const { data } = await admin.storage
          .from("profile-photos")
          .createSignedUrl(p.photo_path, 600);
        photo_signed_url = data?.signedUrl ?? null;
      }
      return { ...p, photo_signed_url };
    }),
  );

  return json({ pending, pendingMatches, dropoffs });
}

export async function action({ request }: ActionFunctionArgs) {
  const fd = await request.formData();
  const key = String(fd.get("key") ?? "");
  assertKey(request, key);

  const admin = getSupabaseAdmin();
  const intent = String(fd.get("intent") ?? "approve");

  // 추가 매칭 승인: pending → active + 양쪽 매칭 알림/푸시
  if (intent === "confirm_match") {
    const matchId = String(fd.get("match_id") ?? "").trim();
    if (!matchId) {
      return json({ ok: false, error: "match_id 누락" }, { status: 400 });
    }
    const { data, error } = await admin
      .from("matches")
      .update({ status: "active" } as never)
      .eq("id", matchId)
      .eq("status", "pending")
      .select("id, user_a, user_b")
      .maybeSingle<{ id: string; user_a: string; user_b: string }>();

    if (error) {
      console.error("[admin.confirm_match]", error);
      return json({ ok: false, error: error.message }, { status: 500 });
    }
    if (!data) {
      // 이미 처리됐거나 없는 매칭 — 조용히 통과
      return json({ ok: true });
    }

    const { error: notiErr } = await admin.from("notifications").insert([
      {
        user_id: data.user_a,
        type: "match",
        title: "새 매칭이 성사됐어요!",
        body: "음악 취향이 통하는 상대와 매칭됐어요.",
        link: `/chat/${data.id}`,
      },
      {
        user_id: data.user_b,
        type: "match",
        title: "새 매칭이 성사됐어요!",
        body: "음악 취향이 통하는 상대와 매칭됐어요.",
        link: `/chat/${data.id}`,
      },
    ] as never);
    if (notiErr) console.error("[admin.confirm_match.noti]", notiErr);

    await Promise.allSettled(
      [data.user_a, data.user_b].map((uid) =>
        sendPushToUser(uid, {
          title: "새 매칭이 성사됐어요! 💘",
          body: "음악 취향이 통하는 상대와 매칭됐어요.",
          url: `/chat/${data.id}`,
        }),
      ),
    );
    return json({ ok: true });
  }

  // 기본: 입금(프로필) 승인
  const userId = String(fd.get("user_id") ?? "").trim();
  if (!userId) {
    return json({ ok: false, error: "user_id 누락" }, { status: 400 });
  }

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

const DROPOFF_META: Record<
  Dropoff["bucket"],
  { label: string; color: string; bg: string }
> = {
  profile_payment: { label: "결제 단계", color: "#b91c1c", bg: "#fee2e2" },
  profile_photo: { label: "사진 단계", color: "#9a3412", bg: "#ffedd5" },
  profile_basic: { label: "프로필 단계", color: "#b45309", bg: "#fef3c7" },
  account_only: { label: "가입만", color: "#6b7280", bg: "#f3f4f6" },
};

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${d
    .getHours()
    .toString()
    .padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
};

// 숫자만 저장된 연락처를 010-1234-5678 형태로.
const fmtPhone = (raw: string) => {
  const d = raw.replace(/\D/g, "");
  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return raw;
};

export default function Admin() {
  const { pending, pendingMatches, dropoffs } = useLoaderData<typeof loader>();
  const nav = useNavigation();
  const submitting = nav.state === "submitting";
  const [searchParams] = useSearchParams();
  // 승인 폼 재요청 시 같은 key를 다시 보내기 위해 URL의 key 사용
  const key = searchParams.get("key") ?? "";
  // Slack 승인 링크로 진입 시 해당 신청자를 강조·스크롤
  const focus = searchParams.get("focus");
  const focusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (focus && focusRef.current) {
      focusRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [focus]);

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
          {pending.map((p) => {
            const isFocused = focus === p.user_id;
            return (
            <div
              key={p.user_id}
              ref={isFocused ? focusRef : undefined}
              style={{
                border: isFocused ? "2px solid #ff625d" : "1px solid #eee",
                background: isFocused ? "#fff5f4" : "white",
                borderRadius: "12px",
                padding: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
              }}
            >
              {p.photo_signed_url ? (
                <a
                  href={p.photo_signed_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ flexShrink: 0 }}
                >
                  <img
                    src={p.photo_signed_url}
                    alt={`${p.name} 프로필 사진`}
                    style={{
                      width: "64px",
                      height: "64px",
                      borderRadius: "12px",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                </a>
              ) : (
                <div
                  title="사진 미등록"
                  style={{
                    width: "64px",
                    height: "64px",
                    borderRadius: "12px",
                    flexShrink: 0,
                    background: "#f3f3f3",
                    color: "#bbb",
                    fontSize: "11px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                    lineHeight: 1.2,
                  }}
                >
                  사진
                  <br />
                  없음
                </div>
              )}
              <div style={{ minWidth: 0, flex: 1 }}>
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
                  연락처:{" "}
                  {p.phone ? (
                    <a href={`tel:${p.phone}`} style={{ color: "#ff625d", fontWeight: 600 }}>
                      {fmtPhone(p.phone)}
                    </a>
                  ) : (
                    <b style={{ color: "#bbb" }}>미입력</b>
                  )}
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
            );
          })}
        </div>
      )}

      <h2 style={{ fontSize: "18px", margin: "40px 0 4px" }}>
        추가 매칭 승인
      </h2>
      <p style={{ color: "#888", fontSize: "14px", margin: "0 0 16px" }}>
        "한 명 더 만나기" 입금 확인 후 승인하면 양쪽에 매칭 알림이 발송돼요. 대기:{" "}
        <b>{pendingMatches.length}</b>건
      </p>

      {pendingMatches.length === 0 ? (
        <p style={{ color: "#aaa", padding: "24px 0", textAlign: "center" }}>
          대기 중인 추가 매칭이 없어요.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {pendingMatches.map((m) => (
            <div
              key={m.matchId}
              style={{
                border: "1px solid #eee",
                background: "white",
                borderRadius: "12px",
                padding: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: "15px", fontWeight: 600 }}>
                  {m.aName} ↔ {m.bName}
                </div>
                <div style={{ color: "#bbb", fontSize: "13px", marginTop: "4px" }}>
                  {fmtDate(m.createdAt)}
                </div>
              </div>
              <Form method="post" replace>
                <input type="hidden" name="key" value={key} />
                <input type="hidden" name="intent" value="confirm_match" />
                <input type="hidden" name="match_id" value={m.matchId} />
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
                  매칭 승인
                </button>
              </Form>
            </div>
          ))}
        </div>
      )}

      <h2 style={{ fontSize: "18px", margin: "40px 0 4px" }}>가입 이탈 현황</h2>
      <p style={{ color: "#888", fontSize: "14px", margin: "0 0 16px" }}>
        프로필을 끝내지 못한 계정. 결제 화면까지 갔다 멈춘 사람일수록 전환 가능성이
        높아요. 총 <b>{dropoffs.length}</b>명
      </p>

      {dropoffs.length === 0 ? (
        <p style={{ color: "#aaa", padding: "24px 0", textAlign: "center" }}>
          이탈한 가입자가 없어요.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {dropoffs.map((d) => {
            const meta = DROPOFF_META[d.bucket];
            return (
              <div
                key={d.userId}
                style={{
                  border: "1px solid #eee",
                  background: "white",
                  borderRadius: "10px",
                  padding: "12px 14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: 500,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {d.email}
                  </div>
                  <div
                    style={{ color: "#bbb", fontSize: "12px", marginTop: "3px" }}
                  >
                    {fmtDate(d.at)}
                  </div>
                </div>
                <span
                  style={{
                    flexShrink: 0,
                    fontSize: "12px",
                    fontWeight: 600,
                    color: meta.color,
                    background: meta.bg,
                    borderRadius: "6px",
                    padding: "4px 10px",
                    whiteSpace: "nowrap",
                  }}
                >
                  {meta.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
