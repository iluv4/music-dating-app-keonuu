# CLAUDE.md

음악 데이팅 앱 (포트폴리오). Remix + Supabase + Vercel. 자세한 진행상태/배포정보는 `ONBOARDING.md` 참고.

## 협업 방식
- **한국어로 응답.**
- **자율로 진행한다.** 옵션 나열·확인 질문 최소화하고 최선의 판단으로 바로 실행 후 결과 보고. 코드 작업·커밋·PR·머지(`gh pr merge --squash --delete-branch`)까지 묻지 말고 진행.
- 사용자 입력이 꼭 필요한 항목(.env 시크릿, 실 계좌, 약관 전문, 제품 의사결정)만 "보류 목록"에 적고 나머지는 계속 진행.
- 파괴적/비가역 작업(force push, 데이터 삭제, prod 배포)은 신중히 — 자율 ≠ 위험감수.
- **Windows CMD 환경.** 사용자에게 건네는 명령은 CMD 호환으로(bash heredoc 금지, 커밋은 `-m` 여러 개). 내가 Bash 툴로 직접 실행하는 건 OK.

## 워크플로
- 작업은 main에서 브랜치 떼서 커밋 → push → `gh pr create` → 머지. **PR마다 새 브랜치**(같은 브랜치 연속 스쿼시 머지하면 main과 갈라져 충돌).
- 머지 후엔 `git merge origin/main`으로 동기화.
- 검증: 로컬 `.env`가 없어 dev 서버 시각검증 불가, Vercel 프리뷰도 Supabase env가 Production 스코프뿐이라 인증/DB 화면이 죽음 → **prod 머지 후 확인**.

## 코드 규칙
- 코드 변경 후 `npm run type-check`(tsc) + `npm run build`(remix build) 통과 확인.
- **브랜드색 코랄 `#ff625d`** (50: `#ffeeed`). 마젠타 `#ff0558`은 폐기 — 커밋하면 husky `lint:colors`가 차단.
- 구조: `src/routes/*`(Remix 라우트), `src/lib/*.server.ts`(서버전용), `src/lib/repos/*`(DB 접근), `src/components/*`.

## DB / 외부 시스템
- **SQL은 사용자가 Supabase SQL Editor에서 실행**(나는 직접 접근 없음). 또는 Supabase MCP / `npm run db:apply -- supabase/x.sql`(env `SUPABASE_DB_URL` 필요).
- 파일 구분: `.patch` = `git apply`(코드), `.sql` = SQL Editor.
- Vercel env는 추가만으로 안 잡힘 — **재배포해야 런타임 반영**. Production 스코프 체크 필수.
