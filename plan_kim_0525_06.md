# Plan — 장르 우선 매칭 (곡 완전 일치 완화)

> 작성일: 2026-05-25
> 범위: 장르 영속화 + 장르 교집합 매칭 + 불편함 방지(동시 1매칭·누적 캡) + 자동 매칭 시점
> 배경: 윤철진님 의견 + 벚꽃 소개팅 피드백 반영

---

## 🎯 핵심 변경

"노래 완전 일치"에서 **"장르 우선, 안 겹쳐도 무조건 매칭"**으로 완화. 부스가 많아
사람이 분산되면 같은 곡을 고른 이성이 없어 아무도 매칭이 안 되는 문제를 해소한다.

---

## 1) 장르 영속화 (가장 중요한 버그 수정)

기존 `genre.tsx`는 선택한 장르를 `useState`로만 들고 있다가 `/music-select`로 넘어가며
버려졌다. 장르 기반 매칭 자체가 불가능했던 원인.

- `user_genres` 테이블 신설 (`user_id`, `genre`, `selected_at`, PK `(user_id, genre)`).
- RLS: 본인 행만 select/insert/delete. 타인 장르는 SECURITY DEFINER 매칭 함수만 읽음.
- `repos/user-genres.server.ts` — `listUserGenres` / `replaceUserGenres`(replace 전략).
- `genre.tsx`에 loader(기존 선택 복원) + action(저장 후 `/music-select`) 추가.
- `lib/genres.ts` — 장르 정의 단일 소스 + `sanitizeGenres`(알려진 id·중복 제거·최대 3개).

## 2) 장르 교집합 매칭 (`find_best_match`)

- 정렬: **장르 겹침 수 → 곡 겹침 수 → random**.
- 후보가 하나라도 있으면 **장르 0개 겹쳐도 무조건 매칭** → 아무도 안 남게 함
  (록만 고른 사람도 결국 매칭됨).
- 후보 조건: 이성 + 승인 + 곡 1곡 이상 + 나와 기존 매칭 없음
  + 후보도 동시 활성 매칭 없음 + 후보 누적 캡 미만.
- 동시성: 기존 함수들과 같은 advisory lock 키 + `matches_active_pair_uniq` 부분 유니크
  인덱스 `on conflict do nothing`으로 같은 쌍 동시 생성 방지.

## 3) 불편함 방지 (벚꽃 소개팅 피드백)

- **동시 활성 매칭 1개** — 이미 active 매칭이 있으면 새로 만들지 않고 그 id 반환.
  한 번에 여러 명한테 연락 오는 일을 구조적으로 차단.
- **누적 캡 2회** — 지금까지 참여한 매칭(상태 무관)이 2건이면 차단(`match_cap_reached`).
  재입금하면 1→2회까지 허용, 그 이상은 막음("추가 결제하면 더" + "너무 많으면 불편" 둘 다 만족).

## 4) 실행 시점

- `/music-select` 곡 저장 **직후 자동 매칭**(`find_best_match`) → 성사 시 `/chat/:id`,
  후보 없으면 `/music`(대기 카드), 캡 도달이면 `/music?capped=1`.
- 운영팀용 일괄 매칭 `run_matching_sweep()`(service_role 전용) — 대기자들을
  장르/곡 겹침 우선으로 짝지어 active 매칭 생성, 생성 건수 반환.

## 5) 라우팅 수정

- 매칭 후 강등(미승인)됐어도 **활성 매칭이 있으면** `/waiting` 대신 채팅방으로:
  - `waiting.tsx` loader: 미승인 + 활성 매칭 → `/chat/:id`.
  - `requireMatchAccess`: `requireApprovedUser` 대신 직접 검사 → 매칭 참여자면 미승인이어도 채팅 허용.
- `music.tsx`: 매칭 RPC를 `find_best_match`로 교체, 대기 카드에 **선택한 장르 칩** 노출,
  누적 캡 도달 시 재입금 안내로 분기.

---

## ⚠️ 주의

- **DB 마이그레이션 직접 실행 필요**: `supabase/migrations/20260525_genre_matching.sql`을
  Supabase SQL Editor에서 실행해야 작동(테이블 + RPC 생성). 미적용 시 장르 저장/매칭이 깨짐.
- `npm run type-check` 통과(기존부터 있던 tsconfig `baseUrl` deprecation 경고는 무관).
- 로컬 `.env` 부재로 시각검증 불가 → prod 머지 후 확인 권장.

---

## 🔁 폴백/하위호환

- 장르 미설정 기존 사용자: 장르 겹침 0으로 계산돼 곡 겹침 → random 순으로 매칭(폴백 동작).
- `find_or_create_match` 등 기존 함수는 그대로 둠(재매칭/관리자 경로). 신규 자동 매칭만 `find_best_match` 사용.
