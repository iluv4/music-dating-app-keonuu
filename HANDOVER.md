# HANDOVER — 음악 매칭 앱 (Music Dating App)

> 다음 작업자(AI 에이전트 또는 개발자)에게 전달하는 인수인계 문서.
> 마지막 갱신: 2026-05-21
> 작업 환경: Windows / Remix v2 + Supabase / Node 18+

---

## 1. 프로젝트 한 줄 요약

대학생 대상 **음악 취향 기반 1:1 매칭 + 채팅** 모바일 웹앱. 멋사 1조 축제용 MVP.
사용자가 곡 3개·장르 3개를 고르면 관리자가 수동 매칭, 매칭된 두 사람이 채팅.

---

## 2. 현재 상태

### ✅ 구현 완료
- Remix v2 풀스택 (Vite+RR 잔재 제거 완료)
- Supabase 이메일/비밀번호 가입 (admin API 로 이메일 rate limit 회피)
- 약관 → 가입 → 프로필 → 입금자명 → 승인 대기 흐름
- 관리자 수동 승인 (Supabase Dashboard 토글)
- 장르 선택 (최대 3개)
- 멜론 검색 (Melona 비공식 라이브러리) + 차트 추천
- 곡 선택 최대 3개 + DB 영속화
- 관리자 수동 매칭 (matches row insert)
- 매칭 시 양쪽 `is_approved` 자동 강등 (재매칭 = 재입금)
- 1:1 채팅 + Supabase Realtime
- 채팅 끊기 (soft delete, status='ended')
- 마이페이지 + 정보 수정 + 로그아웃
- /explore 승인 상태 테스트 페이지

### ⏳ 미구현 (우선순위순)
- **매칭 알고리즘 자동화** (현재 100% 관리자 수동) ← 다음 작업의 핵심
- 배포 (Vercel/Fly.io 후보)
- 카카오 OAuth (현재 이메일만)
- 푸시 알림 (Realtime 은 접속자만)
- 읽음 표시·타이핑 UI (`read_at` 컬럼은 저장됨)
- 메시지 페이지네이션 (50개 limit)
- 결제 자동화 (현재 수동 계좌이체 확인)
- 신고·차단

---

## 3. 기술 스택

| 영역 | 선택 | 비고 |
|------|------|------|
| 프론트 | Remix v2.17 + React 18 + TypeScript | 파일기반 라우팅 (dotted: `profile.basic.tsx` = `/profile/basic`) |
| 백엔드 | Supabase | Postgres + Auth + Realtime + RLS |
| 외부 API | Melona (비공식 멜론 스크래퍼) | 무한정 fallback JSON 30곡 준비 |
| 스타일 | 인라인 styles + globals.css | CSS-in-JS 안 씀, 디자인 토큰은 [constants.ts](src/lib/constants.ts) |
| 호스팅 | 미정 | Vercel / Fly.io 후보 |
| 디자인 | Figma file `707rxeVk0SGe1nZB4BE0LR` | research.md 에 토큰 정리됨 |

---

## 4. 환경 설정

### 4.1 .env 필요 변수 ([.env.example](.env.example) 참고)
```
SUPABASE_URL=https://<프로젝트ref>.supabase.co
SUPABASE_ANON_KEY=eyJ... (클라이언트 노출 OK)
SUPABASE_SERVICE_ROLE_KEY=eyJ... (서버 전용, 절대 노출 금지)
SESSION_SECRET=32byte 이상 random hex
```
`.env` 는 `.gitignore` 됨. service_role 은 `*.server.ts` 모듈에서만 사용.

### 4.2 실행
```bash
npm install
npm run dev         # http://localhost:3000
npm run type-check  # tsc no-emit
npm run build       # remix build
npm start           # remix-serve build/index.js
```

---

## 5. 폴더 구조 핵심

```
src/
├ lib/
│  ├ db-types.ts              ★ DB row 타입 단일 소스
│  ├ supabase.server.ts        서버 클라이언트 (쿠키 세션, RLS 적용)
│  ├ supabase.client.ts        브라우저 클라이언트 (Realtime용)
│  ├ supabase-admin.server.ts  service_role 클라이언트 (rate limit 우회용)
│  ├ auth.server.ts            ★ requireUser / requireApprovedUser / requireMatchAccess
│  ├ env.client.ts             window.ENV 접근 헬퍼
│  ├ constants.ts              ★ 디자인 토큰 (COLORS, TYPOGRAPHY 등)
│  ├ profile-state.ts          sessionStorage 임시 폼 (가입 흐름 중)
│  ├ song-types.ts             공용 Song 타입
│  ├ song-fallback.json        Melona 실패 대비 30곡
│  ├ song-selection.ts         useSelectedSongs 훅 (in-memory)
│  ├ melona-cache.server.ts    차트 5분 메모리 캐시
│  ├ useDebouncedValue.ts      검색 디바운스
│  └ repos/                    ★ DB 접근 계층 (모든 쿼리 여기 캡슐화)
│     ├ profiles.server.ts
│     ├ user-songs.server.ts
│     ├ matches.server.ts
│     └ messages.server.ts
│
├ components/
│  ├ PhoneFrame, StatusBar, HomeIndicator, BottomNav
│  ├ SignupStepNav             회원가입 흐름 상단 ‹ ___ ›
│  ├ ProgressDots              4 dots progress
│  ├ Button.tsx                Primary/Inline/Small 3종
│  ├ TextInput.tsx
│  ├ NoteIcon.tsx              SVG inline 음표
│  ├ SongSearchInput / SongDropdown / SelectedSongCard / RecommendedSongCard
│  └ ProfileStepLayout         (현재 미사용, 삭제 검토 가능)
│
└ routes/
   ├ _index.tsx                / 스플래시 → 3초 후 /welcome
   ├ welcome.tsx               /welcome 시작
   ├ terms.tsx                 /terms 약관 (익명 OK)
   ├ signup.tsx                /signup 이메일/비번 (admin createUser)
   ├ login.tsx                 /login
   ├ logout.tsx                action only
   ├ profile.tsx               /profile/* 부모 레이아웃 (requireUser)
   ├ profile._index.tsx         → /profile/basic redirect
   ├ profile.basic.tsx         닉네임 + 연도 + 성별
   ├ profile.school.tsx        학교 + 학과
   ├ profile.payment.tsx       입금자명 + DB upsert (Form action)
   ├ profile.edit.tsx          /profile/edit 정보 수정
   ├ waiting.tsx               승인 대기 (BottomNav 포함)
   ├ genre.tsx                 장르 3개 선택
   ├ music-select.tsx          곡 3개 선택 + DB save (Form action)
   ├ music.tsx                 메인 (사용자 곡 + 매칭 카드 placeholder)
   ├ chat._index.tsx           매칭 1개로 자동 redirect / 빈 상태
   ├ chat.$matchId.tsx         채팅방 + Realtime + 끊기 버튼
   ├ mypage.tsx                정보 + 수정·로그아웃
   ├ explore.tsx               is_approved 테스트 페이지
   ├ api.melon.search.tsx      Resource Route: 멜론 검색
   └ api.melon.chart.tsx       Resource Route: 멜론 차트
```

---

## 6. 데이터베이스 스키마 (Supabase)

### 6.1 테이블

```sql
-- profiles (1 user = 1 row)
profiles (
  user_id uuid PK fk → auth.users(id) on delete cascade,
  name text NOT NULL,            -- 닉네임
  birth_year int (1950-2010),
  gender text ('male'|'female'),
  school text NOT NULL,
  major text NOT NULL,
  bank_holder text,
  is_approved boolean DEFAULT false,
  approved_at timestamptz,
  approved_by uuid fk → auth.users(id) on delete set null,
  created_at, updated_at timestamptz
)

-- user_songs (사용자별 1~3행)
user_songs (
  id uuid PK,
  user_id uuid fk → auth.users(id) on delete cascade,
  song_no bigint,                 -- 멜론 song id
  title, artist text,
  album, album_img text,
  selected_at timestamptz,
  UNIQUE (user_id, song_no)
)

-- matches (페어, user_a < user_b 강제)
matches (
  id uuid PK,
  user_a, user_b uuid fk → auth.users(id) on delete cascade,
  created_at timestamptz,
  status text ('active'|'ended') DEFAULT 'active',
  ended_at timestamptz,
  ended_by uuid fk → auth.users(id),
  UNIQUE (user_a, user_b),
  CHECK user_a < user_b
)

-- messages (match별)
messages (
  id uuid PK,
  match_id uuid fk → matches(id) on delete cascade,
  sender_id uuid fk → auth.users(id) on delete cascade,
  content text (1-2000자),
  created_at timestamptz,
  read_at timestamptz
)
```

### 6.2 RLS 정책 요약
- **profiles**: SELECT (본인 OR 매칭된 상대), INSERT/UPDATE (본인). `is_approved` 직접 변경은 `guard_approval_change` 트리거가 차단.
- **user_songs**: SELECT/INSERT/DELETE (본인).
- **matches**: SELECT (참여자), UPDATE 정책 없음 (RPC `end_match` 만 가능).
- **messages**: SELECT/INSERT (매칭 참여자 + status='active'), UPDATE read_at (수신자만).

### 6.3 트리거 / 함수

| 이름 | 트리거 | 동작 |
|------|--------|------|
| `set_approved_at` | profiles BEFORE UPDATE | is_approved 변경 시 approved_at 자동 |
| `guard_approval_change` | profiles BEFORE UPDATE | 본인 직접 is_approved 변경 차단 |
| `check_user_song_limit` | user_songs BEFORE INSERT | 4번째 row 차단 |
| `revoke_approval_on_match` | matches AFTER INSERT | 두 사용자 is_approved → false |
| `set_match_ended_at` | matches BEFORE UPDATE | status='ended' 시 ended_at 자동 |
| `end_match(uuid)` | RPC (SECURITY DEFINER) | 본인 참여 매칭만 종료 가능 |

### 6.4 Realtime
`supabase_realtime` publication 에 `messages` 포함 필수:
```sql
alter publication supabase_realtime add table public.messages;
```

---

## 7. 사용자 흐름 (전체)

```
[가입]
/welcome 시작하기
  → /terms (4 dots 1/4, 익명)
  → /signup (이메일/비번 → admin.createUser → session)
  → /profile/basic (4 dots 2/4)
  → /profile/school (4 dots 3/4)
  → /profile/payment (4 dots 4/4, DB upsert)
  → /waiting (is_approved=false)

[관리자] Supabase Dashboard → profiles.is_approved = true

[매칭 준비]
/waiting 새로고침
  → /genre (장르 3개)
  → /music-select (곡 3개, Melona 검색)
  → /music (사용자 곡 + 매칭 카드)

[관리자] SQL Editor → matches insert (수동)
  → 트리거가 양쪽 is_approved → false

[채팅]
/chat → 자동 /chat/$matchId 리다이렉트 (1매칭 가정)
  → Realtime 메시지
  → "채팅 끊기" → end_match RPC → /chat → 빈 상태

[재매칭]
사용자 재입금 + 관리자 재승인 (is_approved=true)
  → /genre 다시
```

---

## 8. 관리자 운영 매뉴얼

### 가입 승인
1. Supabase Dashboard → Authentication → Users 에서 이메일로 user UUID 확인
2. Table Editor → profiles → 해당 row → `is_approved` 셀 더블클릭 → true → Enter
3. 트리거가 `approved_at` 자동 채움

### 매칭 생성
SQL Editor:
```sql
insert into public.matches (user_a, user_b)
select least(a.id, b.id), greatest(a.id, b.id)
from auth.users a, auth.users b
where a.email = 'X@test.com' and b.email = 'Y@test.com';
```
→ `revoke_approval_on_match` 트리거가 양쪽 is_approved → false

### 매칭 종료 (관리자가 강제)
Table Editor → matches → row → `status` 셀 → 'ended' → Enter
(트리거가 ended_at 자동, 메시지 송신 차단됨)

### 디버그
사용자가 /explore 접속 → 5초마다 자동 새로고침으로 본인 is_approved 상태 확인.

---

## 9. 개발 컨벤션 (사용자 가이드라인)

이 프로젝트는 사용자가 명시한 워크플로우를 따름. **준수 권장**:

### 9.1 작업 순서
1. **Research**: `research.md` 같은 파일로 현황 파악
2. **Plan**: `plan_kim_MMDD_NN.md` 형식으로 계획 (예: `plan_kim_0521_06.md`)
3. **Review**: 사용자가 plan 검토·메모
4. **Implement**: 메모 반영 후 구현
5. **Refine**: 스크린샷·테스트로 보정

### 9.2 금지 사항
- 계획 없이 큰 변경 시작
- "아직 구현하지 마" 표현 무시
- CLAUDE.md 같은 단일 파일에 긴 프롬프트 작성

### 9.3 권장 패턴
- DB 쿼리는 `lib/repos/*.server.ts` 안에서만 (라우트에서 직접 supabase.from() 안 함)
- 새 DB 타입은 `lib/db-types.ts` 에 추가
- 새 라우트가 인증 필요 시 `lib/auth.server.ts` 헬퍼 사용
- 컴포넌트는 가능한 인라인 style + 토큰 (`COLORS`, `TYPOGRAPHY`) 참조

### 9.4 디자인 규칙
- **모든 `border` 속성 = `none`** (사용자 요청, 시각 구분은 background로)
- borderRadius 는 유지 (라운드 코너용, 테두리 아님)
- 9:41 상태바 제거됨 (StatusBar 컴포넌트가 null 반환)
- 색상은 `COLORS.accent` (#ff625d) 기준 — research.md §1.0 디자인 시스템 불일치 참고

---

## 10. 알려진 이슈 / 함정

| 증상 | 원인 | 해결 |
|------|------|------|
| 가입 시 "Invalid API key" | service_role 키 오타 또는 키 reset | `.env` 확인, Supabase Dashboard → Settings → API |
| 가입 시 "email rate limit exceeded" | Supabase Email Confirm ON | Auth → Providers → Email → Confirm email OFF |
| 채팅 메시지가 새로고침 후에야 보임 | Realtime publication 누락 또는 채널 auth 실패 | publication 확인 + 콘솔에서 `[chat realtime] status:` 확인 |
| 채팅 상대 이름이 "이름 없음" | profiles RLS 가 partner 못 읽음 | "Users read own or matched profile" 정책 적용 확인 |
| /profile/payment 후 DB 저장 실패 | 새 탭에서 진입 시 sessionStorage 없음 | 가입 흐름은 단일 탭에서만 |
| 4번째 곡 INSERT 에러 | user_songs 트리거 (의도된 차단) | 정상 동작 |
| matches insert 시 CHECK 위반 | user_a >= user_b | `least()/greatest()` 로 ordering 강제 |

---

## 11. 다음 작업 제안 (우선순위)

### 즉시 (~30분)
- [ ] `README.md` 갱신 (현재는 React Router 기본 템플릿 README) — repo 진입자용 소개·배포·실행 문서
- [ ] `ProfileStepLayout.tsx` 삭제 (basic/school 통합으로 미사용)
- [ ] `src/lib/types.ts` 검토 (db-types 와 중복 가능성)

### 단기 — `plan_kim_0521_06.md`
- [ ] **매칭 알고리즘** 자동화
  - 후보: 장르 교집합 + 곡 유사도 (장르당 가중치)
  - 구현 방식: Postgres SQL 함수 vs Remix 서버 코드
  - 트리거: cron (5분마다 스캔) vs 즉시 (사용자 곡 저장 직후)
  - 결과: matches row 자동 생성 → 기존 트리거가 강등 + 알림

### 중기
- [ ] 배포 — Vercel 추천 (Remix 공식 지원, Supabase 친화)
- [ ] 메시지 페이지네이션 (무한 스크롤)
- [ ] 읽음 표시 UI (`read_at` 표시)
- [ ] 카카오 OAuth (가입 진입 부담 감소)

### 장기
- [ ] 결제 자동화 (토스/카카오페이)
- [ ] 푸시 알림 (PWA + Web Push)
- [ ] 신고·차단 시스템
- [ ] 관리자 페이지 (Supabase Dashboard 대체)

---

## 12. 참고 문서 (프로젝트 루트)

| 파일 | 내용 |
|------|------|
| [research.md](research.md) | Figma 시안 분석 + 디자인 토큰 + 백엔드 아키텍처 (8개 섹션) |
| [plan.md](plan.md) | 초기 전체 계획 |
| [plan_kim_0521_01.md](plan_kim_0521_01.md) | 빌드 환경 정리 (Remix 마이그레이션) |
| [plan_kim_0521_02.md](plan_kim_0521_02.md) | UI 전면 재작성 |
| [plan_kim_0521_03.md](plan_kim_0521_03.md) | Supabase 인증 + 프로필 영속화 |
| [plan_kim_0521_04.md](plan_kim_0521_04.md) | 음악 선택 + Melona |
| [plan_kim_0521_05.md](plan_kim_0521_05.md) | 채팅 (매칭 알고리즘 없이) |

이 plan 들이 의사결정 컨텍스트를 담음. 새 plan 추가 시 같은 형식 (`plan_kim_MMDD_NN.md`) 사용.

---

## 13. 빠른 체크리스트 (다음 AI 에이전트용)

작업 시작 전:
- [ ] `npm install`
- [ ] `.env` 채우기 (.env.example 참고)
- [ ] Supabase 프로젝트 접근권 확인
- [ ] `npm run type-check` 통과 확인
- [ ] `npm run dev` 부팅 확인
- [ ] HANDOVER.md (이 문서) 끝까지 정독
- [ ] research.md §8 (백엔드 아키텍처) 정독
- [ ] 사용자의 최근 plan_kim_*.md 검토

코드 수정 전:
- [ ] 변경 범위가 클 경우 plan_kim_MMDD_NN.md 먼저 작성
- [ ] 사용자에게 plan 확인 후 진행
- [ ] DB 변경은 사용자가 직접 Supabase Dashboard / SQL Editor 에서 실행
- [ ] 새 컬럼·테이블 → db-types.ts + 해당 repo 갱신

---

## 14. 연락처 / Repo

- GitHub: https://github.com/keonU206/music-dating-app
- 작성자: keonU206 (ty9803@naver.com)
- 디자인: 멋사 1조 (Figma 707rxeVk0SGe1nZB4BE0LR)

문의 사항·이슈는 GitHub Issues 또는 사용자에게 직접.
