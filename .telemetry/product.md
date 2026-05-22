# Product Model — 뮤직매치 (Music Dating App)

> 자동 생성 (코드베이스 분석 기반). product-tracking-model-product 스킬 산출물에 해당.

## What it is
음악 취향(같은 곡) 기반 대학생 소개팅 앱. Remix v2 + Supabase + Vercel. 모바일 웹(폰 프레임 UI).

## Category
B2C 소셜/데이팅. 그룹 계층 없음 — **user-level 트래킹만**.

## Primary value action
**매칭 성사** (`match.created`). 그 전후로 노래 선택 → 매칭 시도 → 채팅이 핵심 가치 루프.

## Entity model
- **user** (auth.users) — id_property: `user_id` (uuid)
- **profile** (1:1 user) — name, birth_year, gender, school, major, bank_holder, is_approved
- **user_songs** (N) — 선택 곡
- **match** (두 user) — status: active|ended
- **message** (match 내) — realtime
- **notification** — type: match|message|system

## Core flows
1. **가입**: 소셜 OAuth(카카오/구글) → auth.callback
2. **프로필 퍼널**: profile.basic → school → payment(입금자명) → /waiting
3. **승인**: 관리자 수동 (is_approved=true) — 서버/DB 측, 클라 이벤트 아님
4. **곡 선택**: genre(장르) → music-select(멜론 검색/차트)
5. **매칭**: /music "매칭 찾기" → find_or_create_match RPC → /chat
6. **채팅**: realtime 메시지, 채팅 끊기(end_match)
7. **알림**: 매칭/메시지 시 notifications 생성, 종 아이콘 배지

## Commercial
참가비 5,000원 무통장입금(수동 확인). 결제 시스템 미연동 — billing 이벤트는 현재 없음 (퍼널 전환만 추적).

## Destinations
PostHog (이미 스캐폴딩됨: `src/lib/analytics.client.ts`, autocapture pageview + 2개 커스텀 이벤트).

## Decisions (autonomous defaults)
- **Naming**: greenfield → `object.action` snake_case
- **pii_policy**: `traits_only` — name은 identify 트레잇으로만(pii:true), 이벤트 프로퍼티엔 PII 금지. email은 트래킹에 사용 안 함.
- **internal_user_policy**: 현재 미적용. 추후 테스트 계정 제외 권장(is_internal 트레잇).
- **group hierarchy**: 없음 (B2C).
</content>
