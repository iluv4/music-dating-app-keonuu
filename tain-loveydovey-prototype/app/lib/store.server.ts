// ============================================================
// 세션 스토어 (인메모리 — 데모용)
// ============================================================
// 실제 서비스라면 Supabase 등 DB에 저장될 SessionState를, 여기선
// 서버 메모리 Map에 담는다. 서버 재시작 시 초기화됨(프로토타입이라 OK).
// 하네스 관점: "상태 영속화 계층"을 바꿔끼우는 자리 (DB로 교체 지점).

import { CHARACTERS } from "../../src/data/characters";
import type { SessionState } from "../../src/harness/types";

const store = new Map<string, SessionState>();

export function getSession(characterId: string): SessionState | null {
  const character = CHARACTERS.find((c) => c.id === characterId);
  if (!character) return null;

  let state = store.get(characterId);
  if (!state) {
    state = {
      character,
      mode: "찰떡",
      affinityScore: 0,
      recentTurns: [],
      memoryBook: "",
      jam: 50,
    };
    store.set(characterId, state);
  }
  return state;
}

export function saveSession(state: SessionState): void {
  store.set(state.character.id, state);
}

export { CHARACTERS };
