// ============================================================
// 채팅 모드 설정
// ============================================================
// 같은 모델, 같은 캐릭터라도 "모드"에 따라 출력 길이/톤/비용이 달라진다.
// 이건 하네스가 max_tokens 같은 파라미터와 스타일 지침을 바꿔서 만든다.
// 러비더비는 모드별로 소모 잼이 달라서 BM(수익모델)과 직접 연결된다.

import type { ChatMode, ChatModeConfig } from "./types.js";

export const CHAT_MODES: Record<ChatMode, ChatModeConfig> = {
  찰떡: {
    label: "찰떡",
    styleHint:
      "메신저 대화처럼 짧고 톡톡 튀게. 1~3문장. 이모지나 의성어를 가볍게 섞어도 좋다.",
    maxTokens: 300,
    jamCost: 1,
  },
  장문: {
    label: "장문",
    styleHint:
      "감정과 묘사를 풍부하게 담아 길게. 5문장 이상, 속마음과 분위기를 충분히 표현한다.",
    maxTokens: 1200,
    jamCost: 3,
  },
  스토리: {
    label: "스토리",
    styleHint:
      "소설처럼 서술한다. *행동·표정은 별표로 묘사*하고 대사는 큰따옴표로. 장면이 그려지게 쓴다.",
    maxTokens: 1500,
    jamCost: 5,
  },
};
