// ============================================================
// 가드레일 (안전 레이어)
// ============================================================
// 하네스에서 LLM 호출 "앞뒤"에 두는 안전장치. 모델은 무엇이든 말할 수
// 있으므로, 무엇을 허용할지는 하네스가 정한다.
//   - 입력 가드: 비싼 호출 "전에" 막을 건 막는다 (비용·악용 방지)
//   - 능력 게이팅: 특정 기능을 상태(관계 단계)에 따라 잠근다
// 러비더비의 짜릿모드(성인)가 연인 이상에서만 열리는 게 대표적인 예 —
// 안전(어린/낮은 관계 단계 차단)과 BM(고가 모드)이 만나는 지점이다.

import { CHAT_MODES } from "./modes";
import type { AffinityLevel, ChatMode } from "./types";

export interface GuardResult {
  ok: boolean;
  reason?: string;
}

/**
 * 능력 게이팅: 이 모드를 현재 관계 단계에서 쓸 수 있나?
 * (짜릿모드는 minLevel=4 → 연인 이상에서만)
 */
export function canUseMode(mode: ChatMode, level: AffinityLevel): GuardResult {
  const cfg = CHAT_MODES[mode];
  const min = cfg.minLevel ?? 1;
  if (level < min) {
    return {
      ok: false,
      reason: `${mode} 모드는 관계가 더 깊어져야 열려요. (현재 Lv.${level} · 필요 Lv.${min})`,
    };
  }
  return { ok: true };
}

// 입력 가드: 페르소나/시스템을 깨려는 시도를 가볍게 선제 차단 (데모 수준).
// 실서비스는 전용 분류기/모더레이션 API를 쓰지만, 패턴은 동일하다 —
// "비싼 메인 호출 전에, 싸게 거를 수 있는 건 거른다".
const INJECTION_PATTERNS = [
  /system\s*prompt/i,
  /너의?\s*(지시|규칙|프롬프트)/,
  /ignore\s+(previous|above)/i,
  /너는?\s*(ai|인공지능|챗봇|언어\s*모델)/,
];

export function checkInput(text: string): GuardResult {
  if (text.trim().length === 0) return { ok: false, reason: "빈 메시지" };
  if (text.length > 2000) return { ok: false, reason: "메시지가 너무 길어요" };
  for (const p of INJECTION_PATTERNS) {
    if (p.test(text)) {
      return {
        ok: false,
        reason: "캐릭터의 세계를 깨는 요청은 받을 수 없어요. (몰입 보호)",
      };
    }
  }
  return { ok: true };
}
