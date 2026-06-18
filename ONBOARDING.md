# ONBOARDING — 뮤직매치 (Music Dating App)

> 새 작업자(사람/AI)가 **5분 안에 올라타는** 현재 기준 요약.
> 깊은 내용은 [HANDOVER.md](HANDOVER.md)·[research.md](research.md)·[PROJECT-STATUS.md](PROJECT-STATUS.md) 참고.
> 마지막 갱신: 2026-05-25 (main = `fe9b1a1`, PR #59까지 머지)

## 한 줄 요약
대학생 대상 **음악 취향 기반 1:1 매칭 + 채팅** 모바일 웹앱(PWA). Remix v2 + Supabase + Railway.

## 좌표 (현재값)
| 항목 | 값 |
|------|-----|
| Repo | `iluv4/music-dating-app-keonuu` (main) |
| 배포 | Railway (GitHub `main` 자동 배포, `railway.json`). 도메인은 Railway 서비스 Settings → Networking 에서 확인/지정 |
| Supabase 프로젝트 | `exobcejmlbqylutmxqtj` |
| 디자인 | Figma `707rxeVk0SGe1nZB4BE0LR` |
| 브랜드 메인색 | **#ff625d (코랄)**, soft `#ffeeed` — 유일 기준, [constants.ts](src/lib/constants.ts) |

> ⚠️ HANDOVER.md의 옛 repo 주소(`keonU206/...`)·"매칭 100% 수동"·"미배포" 등은 **stale**. 위 표가 최신.

## 실행
```bash
npm install
npm run dev          # http://localhost:3000
npm run type-check   # tsc
npm run build        # remix build
```
`.env`는 [.env.example](.env.example) 참고. service_role·DB_URL은 서버 전용(절대 노출 금지).

## DB 마이그레이션 (중요)
SQL은 `supabase/*.sql`. 적용 경로 2가지:

1. **권장 — 스크립트 (MCP 안 끊김):**
   ```bash
   npm run db:apply -- supabase/migration_club.sql
   ```
   `.env`에 `SUPABASE_DB_URL`(Dashboard → Project Settings → Database → Connection string → URI) 필요.
2. **대시보드 SQL Editor:** 위 프로젝트 → SQL Editor → 붙여넣기 → Run. (Supabase MCP가 **간헐적으로 끊겨** `net::ERR_FAILED` 날 때의 폴백)

## 하네스 (이 repo에 박아둔 자동 장치)
- **색상 가드** — `npm run lint:colors`. 폐기된 색(#ff0558 등)이 있으면 실패. **pre-commit 훅**(husky)에서 자동 실행 → 색 충돌 재발 차단.
- **권한 허용목록** — [.claude/settings.json](.claude/settings.json). 안전·되돌릴 수 있는 명령(읽기·tsc·git status 등)은 프롬프트 없이 실행. push/PR/머지/DB쓰기는 프롬프트 유지.
- **db:apply** — 위 마이그레이션 스크립트.

## 그동안 한 일 (5/24 이후 main 머지분)
- **#58 구글 로그인 제거 + 둘러보기** — 미구현 OAuth 폐기. 비로그인 방문자가 홈/탐색/채팅/마이 + 회원상세 + 샘플 채팅방을 샘플 데이터로 미리보기(`approvedUserOrGuest` 게이트, 화면 상단 미리보기 배너+가입 CTA).
- **#59 채팅 고급 기능** — 본인 메시지 수정/삭제(soft delete), "펑"(읽으면 소멸), "한 번만 보기" 사진(1회 열람 후 스토리지 원본 삭제), 캡처 억제(워터마크·우클릭/드래그 차단·탭 이탈 가림). realtime UPDATE 구독으로 양쪽 실시간 반영. **DB `migration_chat_advanced.sql` prod 적용 완료.**
- **#57 재매칭 "한 명 더"** — 즉시 연결 대신 운영팀 확인(대기) 방식.
- **#54 채팅 이미지·전송 속도 개선**, **#53 승인대기 문구·미승인 채팅 차단**, **#52 `/배포` 슬래시 명령**, **#51 CLAUDE.md**.
- 이전 머지: #40 PWA Web Push, #42 동아리, #43 색상 통일, #46~#50(iOS 배너·토스 인터랙션·카톡 브리지 등).

## 지금 열린 PR (모두 draft, 머지 대기)
| PR | 내용 | 머지 전 필요 |
|----|------|-------------|
| **#62** 프로필 사진 업로드 | profile.edit 아바타 업로드 → `profile-photos` 비공개 버킷, 탐색/멤버/마이에 서명URL 노출 | ⚠️ **`supabase/migration_profile_photo.sql`** SQL Editor 실행 (컬럼·버킷·RLS·RPC) |
| **#55** 매칭 동시성 버그 fix | `find_or_create_match` advisory lock + active쌍 부분유니크 인덱스 | ⚠️ **`supabase/migration_match_concurrency.sql`** SQL Editor 실행 (중복 active쌍 있으면 먼저 정리). `find_additional_match`도 같은 패턴 수동 반영 필요 |
| **#63** 멜론 검색 캐싱+폴백 | 검색결과 인메모리 캐시(10분) + 장애 시 폴백곡 필터 반환 | SQL 불필요. 머지 가능 |
| **#61** 가입 출생연도 placeholder 안내문구 / **#60** welcome 로그인유도 문구 / **#56** 첫메시지 추천 카톡체 | 카피 다듬기 | SQL 불필요. 머지 가능 |
| #11/#14/#18/#19 | Vercel Analytics·마스코트·a11y·QA (5/23~24, base 오래됨) | 충돌 확인 후 정리 필요 |

## 남은 큰 작업
- **푸시 활성화** — Railway Variables `VAPID_PUBLIC_KEY/PRIVATE_KEY/SUBJECT` 추가(자동 재배포). iOS는 홈화면 추가(PWA 설치)해야 수신.
- 위 열린 PR 정리·머지 + 대기 중 SQL 2건 적용.

## 알려진 함정
- **검증은 prod에서** — 로컬 `.env`가 없어 dev 시각검증 불가. main 머지 → Railway 자동 배포 후 확인.
- **Supabase MCP 간헐 끊김** — 위 db:apply 스크립트 또는 SQL Editor로 우회.
- **Railway 도메인/SITE_URL** — OG 메타·Slack 승인 링크는 `SITE_URL` env(미설정 시 `RAILWAY_PUBLIC_DOMAIN` 자동 폴백)로 절대 URL을 만든다. 커스텀 도메인 쓰면 `SITE_URL` 명시.
- env(Variables) 변경 시 Railway가 자동 재배포로 반영. 안 되면 수동 Deploy.

## 컨벤션 (요약, 상세는 HANDOVER §9)
- DB 쿼리는 `src/lib/repos/*.server.ts` 안에서만. 새 타입은 `src/lib/db-types.ts`.
- 인증은 `src/lib/auth.server.ts` 헬퍼. 색/타이포는 `COLORS`/`TYPOGRAPHY` 토큰.
- 작업 흐름: 큰 변경은 plan 먼저 → 사용자 확인 → 구현. 한국어로 소통, 브랜치+PR.
