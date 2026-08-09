# 뮤직매치 (Music Dating App) — 포트폴리오 케이스 스터디

> 음악 취향 기반 1:1 매칭 + 채팅 모바일 웹앱(PWA).
> **라이브 데모:** https://music-dating-app-keonuu.up.railway.app
> **저장소:** https://github.com/iluv4/music-dating-app-keonuu
> **웹 케이스 스터디 페이지:** `/portfolio` (배포 후 `<도메인>/portfolio`)

- **이름:** 한현민
- **역할:** Frontend · Full-stack Developer
- **기간:** 2026.04 — 2026.06
- **팀:** 멋쟁이사자처럼 1조 (기획·디자인·개발 협업)
- **연락처:** 4mins12@gmail.com

---

## 한 줄 요약
같은 노래를 고른 사람과 매칭되어 대화를 시작하는, 대학생 대상 음악 취향 기반 소개팅 웹앱.
**Remix v2 + Supabase + Railway** 풀스택으로 구현했고, **모바일 PWA + Web Push**로 앱처럼 동작한다.

## 문제 → 해법
- **문제:** 소개팅 앱은 많지만 "무엇을 좋아하는가"로 시작하는 대화는 드물다. 대학생이 부담 없이, 공통의 음악 취향을 매개로 연결될 방법이 필요했다.
- **해법:** 곡 3개·장르 3개를 고르는 가벼운 온보딩 → 취향 기반 1:1 매칭 → 실시간 채팅. 설치 없이 PWA로 시작하고 푸시로 재방문을 유도.

## 기술 스택
| 영역 | 사용 기술 |
|------|-----------|
| Frontend | Remix v2, React 18, TypeScript, PWA / Service Worker |
| Backend | Supabase (Postgres, Auth, Realtime, Row Level Security) |
| Infra | Railway(main 푸시 자동 배포), Web Push(VAPID), husky 색상 CI 가드 |
| Data / 외부 | Melona(멜론 검색), PostHog, Amplitude, GA4 |

## 주요 기능
- **취향 온보딩** — 멜론 검색으로 곡 3개·장르 3개 선택, 학교/학과/동아리 프로필.
- **1:1 매칭** — 취향이 맞는 상대와 연결. 재매칭 시 재참여 필요한 운영 모델.
- **실시간 채팅** — Supabase Realtime. 메시지 수정/삭제, 읽으면 사라지는 '펑', 1회만 보는 사진.
- **프라이버시 보호** — 캡처 억제(워터마크·우클릭/드래그 차단·탭 이탈 가림).
- **비로그인 둘러보기** — 가입 전 방문자도 샘플 데이터로 미리 체험 → 전환 유도.
- **PWA 푸시** — Web Push로 비접속 시에도 알림, 홈 화면 설치.

## 엔지니어링 하이라이트 (기술적 의사결정)

### 1. 동시성 안전 매칭
- **문제:** 두 요청이 동시에 같은 사용자를 매칭하면 중복 active 쌍이 생길 수 있다.
- **해결:** Postgres **advisory lock**으로 매칭 생성을 직렬화하고, active 쌍에 **부분 유니크 인덱스**를 걸어 DB 레벨에서 중복을 원천 차단.

### 2. 외부 API 장애 격리
- **문제:** 비공식 멜론 검색(Melona)은 느리거나 간헐적으로 실패한다.
- **해결:** 서버 인메모리 캐시(검색 10분·차트 5분)로 재호출을 줄이고, 장애 시 폴백 곡 목록을 필터링해 반환. **실패 응답은 30초만** 짧게 캐시해 복구를 빠르게.

### 3. 서버/클라이언트 경계 분리
- **문제:** `service_role` 키·DB 접근이 클라이언트로 새면 치명적.
- **해결:** DB 쿼리는 `lib/repos/*.server.ts`에만 두고, 서버 전용 모듈은 `.server.ts` 네이밍으로 번들에서 분리. **RLS**로 행 단위 권한을 이중 방어.

### 4. 디자인 시스템 + CI 가드
- **문제:** 브랜드색이 시안과 어긋나 여러 색(마젠타 vs 코랄)이 혼재.
- **해결:** 토큰을 `constants.ts` 한 곳으로 일원화하고, 폐기색이 커밋되면 **pre-commit(husky)**에서 `lint:colors`가 자동 차단 — 색 충돌 재발을 구조적으로 방지.

## 아키텍처
```
Client (PWA)            Remix Server                 Supabase
─────────────           ─────────────                ─────────
Remix Routes     →      loaders/actions       →      Postgres + RLS
Service Worker          repos/*.server.ts            Auth
Realtime 구독           Web Push                     Realtime

외부: Melona(멜론 검색) · 분석(PostHog/Amplitude/GA4) · 배포 Railway(자동)
```

## 팀 & 내 기여 (정직한 분담)
**내가 담당한 부분**
- 매칭 동시성 버그 수정 (advisory lock + 부분 유니크 인덱스)
- 실시간 채팅 고급 기능 (수정/삭제 · '펑' · 1회보기 사진 · 캡처 억제)
- 멜론 검색 캐싱 + 장애 폴백 설계
- 비로그인 둘러보기(샘플 데이터 미리보기) 플로우
- PWA Web Push 연동 · 분석 파이프라인(PostHog/Amplitude/GA4) 통합
- 디자인 토큰 일원화 + 색상 CI 가드 구축

**함께한 동료**
- **디자이너** — 전체 UI/UX 디자인 (Figma 디자인 시스템)
- **다른 백엔드 개발자** — 초기 회원가입 플로우 · 데이터베이스 기초 설계

> 협업 프로젝트로, 위 분담은 과장 없이 구분해 표기했다.
