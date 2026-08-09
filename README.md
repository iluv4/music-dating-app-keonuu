# 뮤직매치 — 음악 매칭 앱 (Music Dating App)

> 음악 취향 기반 1:1 매칭 + 채팅 모바일 웹앱(PWA) · 대학생 대상
> **Remix v2 · Supabase · Railway** 풀스택 · 멋쟁이사자처럼 1조 팀 프로젝트

🔗 **라이브 데모:** https://music-dating-app-keonuu.up.railway.app
📄 **포트폴리오 케이스 스터디:** [docs/PORTFOLIO.md](docs/PORTFOLIO.md) · 웹 페이지 `<도메인>/portfolio`

같은 노래를 고른 사람과 매칭되어 대화를 시작하는 소개팅 앱.
사용자가 곡·장르를 고르면 매칭되고, 매칭된 두 사람이 실시간으로 채팅한다.

## 빠른 시작

```bash
npm install
cp .env.example .env   # Supabase 키 채우기
npm run dev            # http://localhost:3000
```

## 기술 스택

- **프론트엔드**: Remix v2 + React 18 + TypeScript
- **백엔드**: Supabase (Postgres + Auth + Realtime + RLS)
- **외부 API**: Melona (비공식 멜론 검색)
- **디자인**: Figma `707rxeVk0SGe1nZB4BE0LR`

## 주요 기능

- 이메일 회원가입 + 프로필 작성 (닉네임·연도·성별·학교·학과·입금자명)
- 관리자 승인 시스템 (Supabase Dashboard 에서 토글)
- 멜론 검색 기반 곡 선택 (최대 3개)
- 장르 선택 (최대 3개)
- 1:1 채팅 + 실시간 (Supabase Realtime)
- 채팅 끊기 → 재매칭 시 재입금 필요

## 다음 작업자에게

📄 **[PORTFOLIO.md](PORTFOLIO.md)** — 프로젝트 소개·기술적 도전·아키텍처를 정리한 포트폴리오 문서.

📄 **[HANDOVER.md](HANDOVER.md)** — 프로젝트 구조·데이터베이스·관리자 매뉴얼·다음 작업 등 전체 인수인계 문서. **반드시 정독.**

📄 [research.md](research.md) — 디자인 토큰·백엔드 아키텍처

📄 plan_kim_0521_*.md — 시간순 작업 계획 (의사결정 기록)

## 라이선스

내부 프로젝트 (멋사 1조).
