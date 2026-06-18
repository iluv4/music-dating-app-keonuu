// 서비스 공개 도메인 (OG 메타·Slack 승인 링크 등 절대 URL 생성용, 서버 전용).
// 우선순위: SITE_URL(직접 지정) > Railway 자동 주입 도메인 > 기본 폴백.
// Railway는 RAILWAY_PUBLIC_DOMAIN 에 호스트(스킴 없음)를 자동 주입한다.
export function getSiteUrl(): string {
  const explicit = process.env.SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const railway = process.env.RAILWAY_PUBLIC_DOMAIN;
  if (railway) return `https://${railway}`;
  return "https://music-dating-app-keonuu.up.railway.app";
}
