// Slack Incoming Webhook 알림 (서버 전용)
// 환경변수 SLACK_WEBHOOK_URL 이 설정돼 있을 때만 동작. 없으면 no-op.
// 설정법: Slack → Apps → "Incoming Webhooks" 추가 → 채널 선택 → 생성된 URL을
//        Vercel 프로젝트 환경변수 SLACK_WEBHOOK_URL 에 등록.
//
// 실패해도 절대 가입/결제 흐름을 막지 않는다 (best-effort, 에러는 로그만).

export async function notifySlack(text: string): Promise<void> {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return; // 미설정 시 조용히 무시

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
  } catch (err) {
    console.error("[notifySlack]", err);
  }
}

// 서비스 도메인 (관리자 승인 링크 생성용). 필요 시 env SITE_URL 로 오버라이드.
const SITE_URL =
  process.env.SITE_URL ?? "https://music-dating-app-keonuu.vercel.app";

// 입금/가입 신청 알림 메시지 구성
// ADMIN_KEY 가 설정돼 있으면 해당 신청자를 바로 강조하는 승인 화면 링크를 첨부한다.
// (Slack 채널은 팀 전용이라 key 노출 허용 — 관리자 편의 우선)
export function buildPaymentNotice(params: {
  userId: string;
  name: string;
  school: string;
  major: string;
  bankHolder: string;
  skipped: boolean;
}): string {
  const { userId, name, school, major, bankHolder, skipped } = params;
  const lines = [
    "💸 *새 가입/입금 신청*",
    `• 이름: ${name}`,
    `• 학교/학과: ${school} ${major}`.trim(),
    skipped
      ? "• 입금: ⏭️ 나중에 입금(둘러보기)"
      : `• 입금자명: ${bankHolder || "-"}`,
  ];

  const adminKey = process.env.ADMIN_KEY;
  if (adminKey) {
    const url = `${SITE_URL}/admin?key=${encodeURIComponent(
      adminKey,
    )}&focus=${encodeURIComponent(userId)}`;
    lines.push(`• ✅ 승인하기: ${url}`);
  }
  return lines.join("\n");
}
