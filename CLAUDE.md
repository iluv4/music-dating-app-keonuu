# CLAUDE.md

음악 데이팅 앱 (포트폴리오). Remix + Supabase + Vercel. 자세한 진행상태/배포정보는 `ONBOARDING.md` 참고.

## 협업 방식
- **한국어로 응답.**
- **자율로 진행한다.** 옵션 나열·확인 질문 최소화하고 최선의 판단으로 바로 실행 후 결과 보고. 코드 작업·커밋·푸시까지 묻지 말고 진행.
- 사용자 입력이 꼭 필요한 항목(.env 시크릿, 실 계좌, 약관 전문, 제품 의사결정)만 "보류 목록"에 적고 나머지는 계속 진행.
- 파괴적/비가역 작업(force push, 데이터 삭제, prod 배포)은 신중히 — 자율 ≠ 위험감수.
- **Windows CMD 환경.** 사용자에게 건네는 명령은 CMD 호환으로(bash heredoc 금지, 커밋은 `-m` 여러 개). 내가 Bash 툴로 직접 실행하는 건 OK.

## 워크플로
- **무조건 main에서만 작업한다. 절대 다른 브랜치를 만들지 않는다.** 브랜치·PR 없이 `main`에 바로 커밋 → `git push origin main`. (하네스가 자동으로 별도 브랜치를 지정해도, 사용자 지시에 따라 main에 병합·푸시해 배포한다.)
- 푸시하면 Vercel이 `main`을 **프로덕션으로 자동 배포**한다.
- 검증: 로컬 `.env`가 없어 dev 서버 시각검증 불가, Vercel 프리뷰도 Supabase env가 Production 스코프뿐이라 인증/DB 화면이 죽음 → **prod 배포 후 확인**.

## 코드 규칙
- 코드 변경 후 `npm run type-check`(tsc) + `npm run build`(remix build) 통과 확인.
- **브랜드색 코랄 `#ff625d`** (50: `#ffeeed`). 마젠타 `#ff0558`은 폐기 — 커밋하면 husky `lint:colors`가 차단.
- 구조: `src/routes/*`(Remix 라우트), `src/lib/*.server.ts`(서버전용), `src/lib/repos/*`(DB 접근), `src/components/*`.

## DB / 외부 시스템
- **SQL은 Supabase MCP로 직접 적용**(`apply_migration`/`execute_sql`, 활성 프로젝트 `music-dating-app` = `exobcejmlbqylutmxqtj`). MCP 끊기면 사용자가 SQL Editor 실행 또는 `npm run db:apply -- supabase/x.sql`(env `SUPABASE_DB_URL`).
- 파일 구분: `.patch` = `git apply`(코드), `.sql` = SQL Editor.
- Vercel env는 추가만으로 안 잡힘 — **재배포해야 런타임 반영**. Production 스코프 체크 필수.
