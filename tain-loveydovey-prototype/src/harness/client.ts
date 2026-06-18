// ============================================================
// Anthropic 클라이언트
// ============================================================
// 하네스의 "엔진 입구". 모든 LLM 호출은 여기를 통한다.
//
// 모델 선택도 하네스 설계의 일부다:
//  - MAIN_MODEL: 캐릭터의 실제 응답 생성 → 품질이 중요하므로 최상위 모델
//  - UTILITY_MODEL: 호감도 채점·요약 같은 "보조 작업" → 싸고 빠른 모델
// 비싼 모델을 모든 곳에 쓰면 비용이 폭발한다(러비더비의 실제 고민:
// "메시지당 LLM 추론 단가 vs 잼 단가"). 작업 난이도에 맞춰 모델을 고르는 것
// 자체가 하네스 엔지니어링이다.

import Anthropic from "@anthropic-ai/sdk";

export const client = new Anthropic(); // ANTHROPIC_API_KEY 환경변수에서 자동 인식

/** 캐릭터 응답 생성용 — 최상위 모델 */
export const MAIN_MODEL = "claude-opus-4-8";

/** 보조 작업(채점/요약)용 — 싸고 빠른 모델 */
export const UTILITY_MODEL = "claude-haiku-4-5";
