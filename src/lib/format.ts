// 개인정보 보호용 표시 헬퍼.

// 실명을 가려서 표시. 첫 글자만 남기고 나머지는 *로 마스킹.
// 예) "김민수" → "김**", "이수" → "이*", "Alex" → "A***"
// 매칭 상대·탐색 목록 등 본인이 아닌 사용자에게 노출되는 모든 곳에서 사용.
export function maskName(name: string | null | undefined): string {
  const n = (name ?? "").trim();
  if (!n) return "익명";
  const chars = [...n];
  if (chars.length === 1) return `${chars[0]}*`;
  return chars[0] + "*".repeat(chars.length - 1);
}
