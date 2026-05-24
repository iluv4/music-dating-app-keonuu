# ONBOARDING — 뮤직매치 (Music Dating App)

> 새 작업자(사람/AI)가 **5분 안에 올라타는** 현재 기준 요약.
> 깊은 내용은 [HANDOVER.md](HANDOVER.md)·[research.md](research.md)·[PROJECT-STATUS.md](PROJECT-STATUS.md) 참고.
> 마지막 갱신: 2026-05-24

## 한 줄 요약
대학생 대상 **음악 취향 기반 1:1 매칭 + 채팅** 모바일 웹앱(PWA). Remix v2 + Supabase + Vercel.

## 좌표 (현재값)
| 항목 | 값 |
|------|-----|
| Repo | `iluv4/music-dating-app-keonuu` (main) |
| 배포 | Vercel `music-dating-app-keonuu.vercel.app` |
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

## 지금 열린 작업 (우선순위)
1. **PR #42 (동아리)** — 머지 전 `supabase/migration_club.sql` 적용 필수(`profiles.club` 컬럼 + 매칭 같은동아리 제외). 컬럼 없이 머지하면 프로필 저장 깨짐.
2. **PR #43 (색상)** — PWA theme-color #ff625d 통일. 머지 가능.
3. **프로필 사진 등록** — 스토리지 버킷 필요(`chat-images` 패턴 재활용).
4. **재매칭 "한 명 더"(1000원)** — 다중매칭+채팅목록 구조 결정 필요(제품 결정).
5. **푸시 활성화** — Vercel env `VAPID_PUBLIC_KEY/PRIVATE_KEY/SUBJECT` + 재배포. iOS는 홈화면 추가(PWA 설치)해야 수신.

## 알려진 함정
- **Vercel Preview env 누락** — Supabase 변수가 Production 스코프에만 → 프리뷰 배포는 DB/인증 화면 500. 검증은 main 머지 후 prod에서.
- **Supabase MCP 간헐 끊김** — 위 db:apply 스크립트 또는 SQL Editor로 우회.
- env는 추가만으론 안 잡힘 → **재배포해야 런타임 반영**.

## 컨벤션 (요약, 상세는 HANDOVER §9)
- DB 쿼리는 `src/lib/repos/*.server.ts` 안에서만. 새 타입은 `src/lib/db-types.ts`.
- 인증은 `src/lib/auth.server.ts` 헬퍼. 색/타이포는 `COLORS`/`TYPOGRAPHY` 토큰.
- 작업 흐름: 큰 변경은 plan 먼저 → 사용자 확인 → 구현. 한국어로 소통, 브랜치+PR.
