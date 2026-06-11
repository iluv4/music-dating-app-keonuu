// Slack Incoming Webhook 알림 (서버 전용)
// 환경변수 SLACK_WEBHOOK_URL 이 설정돼 있을 때만 동작. 없으면 no-op.
// 설정법: Slack → Apps → "Incoming Webhooks" 추가 → 채널 선택 → 생성된 URL을
//        Railway 서비스 환경변수 SLACK_WEBHOOK_URL 에 등록.
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

// 입금/가입 신청 알림 메시지 구성 (입금 내역 기록용).
// 관리자 승인은 제거됨 — 결제 완료 시 자동 승인되므로 별도 승인 링크는 없다.
export function buildPaymentNotice(params: {
  userId: string;
  name: string;
  school: string;
  major: string;
  bankHolder: string;
  skipped: boolean;
  free?: boolean;
}): string {
  const { name, school, major, bankHolder, skipped, free } = params;
  const lines = [
    "💸 *새 가입/입금 신청*",
    `• 이름: ${name}`,
    `• 학교/학과: ${school} ${major}`.trim(),
    free
      ? "• 입금: 🎀 여성 무료 가입(입금 불필요) — 자동 매칭 시작"
      : skipped
        ? "• 입금: ⏭️ 나중에 입금(둘러보기)"
        : `• 입금자명: ${bankHolder || "-"} — 자동 승인 완료`,
  ];
  return lines.join("\n");
}
