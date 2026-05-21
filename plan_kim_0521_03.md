# Plan — 백엔드 1단계: Supabase 셋업 + 인증 + 프로필 저장

> 작성일: 2026-05-21
> 범위: **Supabase 프로젝트 생성, DB 스키마, 이메일+비밀번호 인증, 학교 도메인 검증, 프로필 영속화**
> 시리즈: plan_03 (이번) → plan_04 (매칭+채팅) → plan_05 (결제+배포)
> 워크플로우 단계: Step 2 (Plan). **확정 전까지 구현 금지**.
> 참고: [research.md](research.md) Section 8

---

## 🎯 목표

축제 운영에 필요한 백엔드의 토대를 만든다:
1. **(선행) 프론트 신규 화면**: 회원가입 / 로그인 / 로그아웃 버튼 UI 추가
2. Supabase 프로젝트와 DB 스키마 준비
3. 이메일+비밀번호 회원가입·로그인 (**이메일 인증 없이 즉시 로그인, 도메인 제약 없음**)
4. 현재 sessionStorage 에 저장되는 프로필을 **Supabase DB** 에 영속화
5. 로그인 후 마이페이지에 본인 데이터 표시

**성공 기준**:
- `npm run dev` 후 신규 회원가입 → 즉시 로그인 → 약관 → 프로필 입력 → DB 저장 확인
- 새 탭에서 같은 계정 로그인 시 마이페이지에 입력값 그대로 노출
- 로그아웃 후 보호 라우트(`/mypage` 등) 접근 시 `/login` 으로 리다이렉트

## 🔀 결정 변경 (2026-05-21 추가)

- **이메일 인증 제거**: 축제 마감 압박 우선. 회원가입 즉시 세션 발급.
  - Supabase Dashboard → Authentication → Providers → Email → "Confirm email" 토글 OFF
  - `auth.callback.tsx` 라우트 불필요 → Phase D.2 삭제
- **프론트 추가 화면을 먼저 구현 후 백엔드 연동** 순서로 변경.
- **학교 도메인 제약 제거**: 누구나 이메일로 가입 가능.
  - `allowed_school_domains` 테이블 / `validate_email_domain` 트리거 / `school` 컬럼의 도메인 검증 모두 **삭제**
  - Phase B.2, B.4 폐기 (아래 본문 갱신됨)

---

## 🧱 Phase A: Supabase 프로젝트 생성 (사용자 수동 작업)

**사용자 작업 필요** — 클라이언트 코드만으로 자동화 불가:

1. https://supabase.com 가입 (GitHub 연동 권장)
2. 새 프로젝트 생성
   - 이름: `music-dating-app`
   - 리전: Northeast Asia (Seoul) `ap-northeast-2`
   - DB password 안전한 곳에 저장
3. Project Settings → API 에서 다음 값 확보:
   - `Project URL` (https://xxx.supabase.co)
   - `anon` public key
   - `service_role` secret key (서버에서만 사용)

→ 이 3개 값을 받아서 `.env` 에 설정 (구현 단계에서 처리)

---

## 🗂️ Phase B: DB 스키마

Supabase SQL Editor 에서 실행할 SQL 작성 ([research.md](research.md) §8.3 기반):

### B.1 `profiles` 테이블

```sql
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  birth_year int not null check (birth_year between 1950 and 2010),
  gender text check (gender in ('male', 'female')),
  school text not null,
  major text not null,
  bank_holder text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;
```

### B.2 RLS 정책

```sql
-- 본인 프로필만 read/update
create policy "Users read own profile"
  on public.profiles for select
  using (auth.uid() = user_id);

create policy "Users insert own profile"
  on public.profiles for insert
  with check (auth.uid() = user_id);

create policy "Users update own profile"
  on public.profiles for update
  using (auth.uid() = user_id);
```

> 도메인 화이트리스트·이메일 도메인 검증 트리거는 **제거**됨 (모든 도메인 허용).

---

## 📦 Phase C: Remix-Supabase 연동

### C.1 패키지 설치

```bash
npm install @supabase/supabase-js @supabase/ssr
```

- `@supabase/supabase-js` — 기본 클라이언트
- `@supabase/ssr` — Remix/Next/SvelteKit 등 SSR 프레임워크용 쿠키 기반 세션 헬퍼

### C.2 환경 변수 (`.env`)

```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...  # 서버 전용
SESSION_SECRET=랜덤_32바이트_이상
```

- `.env` 는 `.gitignore` 에 이미 포함 (확인 필요)
- `.env.example` 추가하여 키 이름만 공유

### C.3 Supabase 클라이언트 헬퍼

**`src/lib/supabase.server.ts`** — 서버용 (loader/action):
```typescript
// 매 요청마다 쿠키에서 세션 읽어 client 생성
// createServerClient + Request/Response cookies 핸들링
```

**`src/lib/supabase.client.ts`** — 브라우저용 (Realtime 구독 등):
```typescript
// 단일 인스턴스 createBrowserClient
// anon key만 사용
```

**`src/lib/session.server.ts`** — Remix session helper:
```typescript
// cookie session storage with SESSION_SECRET
// getSession / commitSession / destroySession 래퍼
```

### C.4 Root 통합

- [root.tsx](src/root.tsx) loader 에서 현재 세션 읽어 사용자 정보 노출
- 글로벌 `useUser()` 훅 또는 `useLoaderData` 로 접근

---

## 🎨 Phase D-pre: 프론트 신규 화면 (백엔드 연동 전 UI 먼저)

먼저 UI 셸만 만든다. action/loader 는 stub (콘솔 로그 + 임의 리다이렉트) 으로 두고, Phase D 에서 Supabase 연결.

### D-pre.1 `routes/signup.tsx`
- 입력: 이메일, 비밀번호, 비밀번호 확인
- 검증 (클라이언트): 이메일 형식, 비번 8자 이상, 확인 일치 (도메인 제약 없음)
- 하단 "이미 계정 있어요" → `/login` 링크
- 디자인: 약관 페이지와 동일 톤 (PhoneFrame + ProgressDots는 X)

### D-pre.2 `routes/login.tsx`
- 입력: 이메일, 비밀번호
- "비밀번호를 잊으셨나요?" placeholder (MVP는 미구현)
- 하단 "회원가입" → `/signup` 링크

### D-pre.3 Welcome 수정
- "시작하기" → `/signup` 으로 변경 (현재 `/terms`)
- 하단 보조 텍스트: "이미 계정 있어요? 로그인" 추가

### D-pre.4 마이페이지 로그아웃 버튼
- "내 정보 수정" 아래에 "로그아웃" 텍스트 버튼 추가 (작게)

### D-pre.5 사용자 흐름 갱신
- 신규: `/welcome` → `/signup` → `/terms` → `/profile/step1` → ... → `/genre` → `/music`
- 재방문: `/login` → `/music`

---

## 🔐 Phase D: 인증 라우트 (Supabase 연동)

### D.1 회원가입 action `routes/signup.tsx`

- D-pre.1 의 form action 구현
- `supabase.auth.signUp({ email, password })`
- 이메일 인증 OFF 상태라 즉시 세션 발급됨
- 성공 시 → `/terms` 리다이렉트
- 실패 시 (도메인 차단 트리거 등): 친절한 에러
- 학생 인증 안내 텍스트 포함

### D.2 로그인 action `routes/login.tsx`

- D-pre.2 의 form action 구현
- `supabase.auth.signInWithPassword`
- 세션 쿠키 저장
- 프로필 존재 시 → `/music`
- 프로필 없음 시 → `/profile/step1`

### D.3 로그아웃 `routes/logout.tsx`

- action only (POST) → 세션 파기 → `/login`

### D.4 보호 라우트

- 인증 필요 페이지(`/profile/*`, `/music`, `/chat`, `/mypage`, `/genre`)에 공통 가드:
  - loader 에서 세션 없으면 `redirect("/login")`
- 헬퍼 `requireUser(request)` 작성

---

## 👤 Phase E: 프로필 영속화

### E.1 데이터 흐름 전환

**현재**: profile.step1~5 → sessionStorage
**변경 후**: 각 step "다음" 클릭 시 → action 으로 부분 upsert

### E.2 마이그레이션 전략

- `sessionStorage` 기반 [useProfile](src/lib/profile-state.ts) 를 **임시 유지** (로그인 전 익명 입력 보존용)
- step5 또는 payment 완료 시 한 번에 Supabase `profiles` 에 insert
- 또는 각 step 마다 upsert (실시간 저장) — UX 좋으나 RTT 증가

**선택 (논의 필요)**:
- 옵션 1: **최종 제출 일괄 저장** ← 권장 (RTT 적음, 미완성 데이터 안 쌓임)
- 옵션 2: 각 step 별 upsert (이탈 후 복귀 시 이어 진행 가능)

### E.3 마이페이지 데이터 소스 변경

- [mypage.tsx](src/routes/mypage.tsx) 의 `readProfile()` (sessionStorage) 호출 제거
- loader 에서 `supabase.from('profiles').select().eq('user_id', user.id).single()` 사용
- 결과로 `useLoaderData` 활용

---

## 🧪 Phase F: 검증

### F.1 자동 검증
- [ ] `npm run type-check` 0 에러
- [ ] `npm run dev` 부팅
- [ ] 모든 기존 라우트 여전히 200

### F.2 수동 검증 시나리오
- [ ] 허용 도메인 외 이메일로 signup → 거절 메시지 노출
- [ ] 허용 도메인 이메일로 signup → 인증 메일 도착
- [ ] 메일 링크 클릭 → `/profile/step1` 진입
- [ ] step1~5 + payment 입력 → 마이페이지에서 노출
- [ ] 로그아웃 → 마이페이지 접근 시 `/login` 리다이렉트
- [ ] 새 브라우저(시크릿) 로그인 → 동일 데이터 노출
- [ ] DB 직접 조회 (Supabase Table Editor) 에서 데이터 확인

---

## ⚠️ 주의 & 가정

1. **Supabase 가입 / 프로젝트 생성은 사용자가 수동**. 키 발급 후 알려주시면 `.env` 자동 세팅.
2. **이메일 발송**: Supabase 무료 티어는 일 50건 제한 (테스트는 충분). 추후 SendGrid / Resend 연동 가능.
3. **학교 도메인 리스트**: 초기 4개만 등록. 사용자 측에서 추가 학교 알려주시면 SQL update.
4. **카카오 OAuth 미포함**: plan_kim_0521_05 또는 별도 plan 으로.
5. **매칭·채팅 미포함**: 다음 plan (plan_kim_0521_04).
6. **profile sessionStorage → DB 전환 시점**: F 옵션 1 가정 (최종 제출 일괄). 변경 원하면 알려주세요.
7. **세션 저장 방식**: 쿠키 + Remix `createCookieSessionStorage`. SESSION_SECRET 환경변수 필요.
8. **CSRF**: Remix 기본 폼은 origin 검증을 자체적으로 하지 않음. 추후 필요 시 별도 토큰.

---

## ✅ 체크리스트

### 사전 준비
- [ ] 사용자가 Supabase 프로젝트 생성
- [ ] URL/anon/service_role 키 공유
- [ ] `.env` 파일 생성 (Git 추가 X)

### 코드 작업
- [ ] `@supabase/supabase-js`, `@supabase/ssr` 설치
- [ ] `src/lib/supabase.server.ts`, `supabase.client.ts`, `session.server.ts` 작성
- [ ] root.tsx 세션 로딩
- [ ] `routes/signup.tsx`, `login.tsx`, `logout.tsx`, `auth.callback.tsx`
- [ ] `requireUser` 헬퍼 + 보호 라우트 가드 적용
- [ ] profile multistep 최종 제출 시 supabase insert
- [ ] mypage loader → DB 조회

### DB
- [ ] SQL Editor 에서 schema/RLS 실행
- [ ] Table Editor 에서 profiles 확인

### 검증
- [ ] Phase F.1, F.2 항목 모두 통과

---

## 📊 예상 소요

| Phase | 소요 |
|-------|------|
| A. Supabase 프로젝트 (사용자) | 10분 |
| B. SQL 스키마 | 20분 |
| C. Remix 연동 (헬퍼·env) | 30분 |
| D. 인증 라우트 4개 | 60분 |
| E. 프로필 DB 전환 | 30분 |
| F. 검증 | 20분 |
| **총** | **약 2.5시간** |

---

## 🚀 구현 순서

1. (사용자) Supabase 프로젝트 만들고 키 공유
2. `.env` + 패키지 설치
3. Supabase 헬퍼 + 세션 모듈
4. SQL 스키마 실행 (사용자가 Supabase SQL Editor 에서)
5. signup → login → logout 순서로 라우트
6. 보호 라우트 가드 적용
7. profile 흐름을 sessionStorage → DB 로 전환
8. mypage loader 변경
9. 검증 시나리오 전부 통과

다음 plan_kim_0521_04 에서 매칭·채팅을 다룰 예정.
