# 뮤직매치 — 프로젝트 현황 & 구현 계획

> 작성일 2026-05-22 · 음악 취향 기반 대학생 소개팅 앱 · 핸드오프용 문서

---

## 1. 한 줄 요약
같은 노래를 고른 이성과 매칭되어 실시간 채팅하는 모바일 웹 소개팅 앱. **핵심 플로우(가입→프로필→승인→곡선택→매칭→채팅→알림)는 전부 동작**하며, 현재 보안·성능·트래킹 보강 PR을 리뷰 중.

## 2. 기술 스택
| 영역 | 사용 |
|------|------|
| 프레임워크 | Remix v2 (Node, SSR) |
| DB/인증/실시간 | Supabase (Postgres + Auth + Realtime) |
| 배포 | Vercel (`music-dating-app-keonuu.vercel.app`, main 자동배포) |
| 외부 연동 | 멜론 차트/검색 (melona + cheerio 스크래핑), 카카오/구글 OAuth |
| 분석 | PostHog (스캐폴딩 완료, 키 주입 시 작동) |
| UI | 폰 프레임 모바일 웹, Pretendard 폰트 |

## 3. 데이터 모델
- **profiles** (1:1 user) — name, birth_year, gender, school, major, bank_holder, **is_approved**
- **user_songs** — 사용자가 선택한 곡 (매칭 시 곡 일치 비교)
- **matches** — 두 user, status: active|ended
- **messages** — match 내 메시지 (realtime)
- **notifications** — type: match|message|system
- 권한: 전 테이블 RLS 활성. 매칭/채팅종료/탐색/알림생성은 SECURITY DEFINER RPC·트리거로 처리.

## 4. 구현 현황 (✅ 동작 확인)
- ✅ 카카오/구글 소셜 로그인 (Supabase OAuth)
- ✅ 프로필 가입 퍼널 (basic → school → payment 입금자명)
- ✅ 승인 게이트 (관리자 수동 `is_approved`, 미승인 시 /waiting)
- ✅ 장르 선택 → 멜론 차트/검색으로 곡 선택 (앨범커버)
- ✅ **매칭** — `find_or_create_match` RPC (같은 곡·이성·승인·미매칭 조건)
- ✅ **실시간 채팅** — Supabase Realtime, 채팅 끊기(end_match)
- ✅ **알림** — 매칭 시 양쪽 알림, 종 아이콘 배지, 목록/읽음처리
- ✅ 메시지 전송(보내는 쪽) 확인됨

## 5. 진행 중 — PR #1 (리뷰 중, 미머지)
`session/security-perf-tracking-2026-05-22` → main
링크: https://github.com/iluv4/music-dating-app-keonuu/pull/1
Vercel 프리뷰 빌드 ✅ Ready

**포함 내용**
- 🔒 **보안**: explore(둘러보기) 승인 게이트 적용(미승인자 회원명단 노출 차단), 프로필 입력 길이 검증, 채팅 콘솔로그 제거(메시지 내용 노출 방지), realtime 구독 match_id 필터(타 매칭 브로드캐스트 차단)
- ⚡ **성능**: music-select 로더의 self-fetch 제거 → 차트 직접 호출로 첫 페인트 단축(렌더링 지연 1순위 해소)
- 📊 **트래킹**: PostHog 스캐폴딩 + 이벤트 2개, 메시지 알림 DB 트리거, `.telemetry/` 트래킹 플랜(14이벤트·구현가이드)
- 모두 type-check / build 통과

## 6. 남은 작업 & 구현 계획

### 🔴 머지 전/직후 (배포 블로커)
1. **RLS 정책 정밀 확인** — 5개 테이블 RLS 활성은 확인됨. messages INSERT가 (발신자=본인 + 매칭참여자 + active)를 강제하는지 정책 본문 점검 중. (`supabase/rls_audit.sql`)
2. **SQL Editor 실행 필요** (코드 머지와 별개):
   - `supabase/migration_message_notifications.sql` — 메시지 알림 트리거
   - `supabase/indexes.sql` — 누락 인덱스(messages/matches/user_songs)
3. **realtime 필터 2계정 검증** — 한쪽 전송 시 상대 실시간 수신 확인. (안 와도 새로고침 시 표시되는 안전망 있음)
4. PR #1 머지 → Vercel 배포

### 🟡 안정화 (Day 2)
- markMessagesRead를 로더에서 action으로 분리(첫 페인트 단축, 서버리스 안전)
- 폰트 비동기 로드 또는 self-host (렌더블로킹 완화)
- signup 남용 방지(rate limit / CAPTCHA — 현재 인증 없는 공개 액션에서 계정 생성)
- replaceUserSongs 트랜잭션화(delete→insert 비원자적)
- PostHog 키를 Vercel 환경변수에 추가 → 이벤트 수집 시작

### 🚫 이번 버전 스코프 아웃
- 결제 실연동(무통장입금 수동 유지), 자동승인(수동 유지)
- 디자인시스템 아이콘 SVG 컴포넌트화
- 트래킹 12개 신규 이벤트 전체 구현(가이드만 작성됨)

## 7. 알려진 리스크
| 항목 | 영향 | 상태 |
|------|------|------|
| 베이스 테이블 RLS 정책이 repo에 없음 | 보안 검증이 라이브 DB에만 의존 | 활성 확인됨, 정책 본문 점검 중 |
| realtime 필터 복원 후 실시간 수신 | 미검증 (안전망 존재) | 2계정 테스트 대기 |
| signup 공개 액션 무제한 계정 | 스팸/남용 | 미해결(Day 2) |

## 8. 참고 문서 (repo 내)
- `AUTONOMOUS-SESSION-2026-05-22.md` — 상세 작업 로그 + 이틀 완주 플랜
- `.telemetry/` — 트래킹 플랜/델타/구현가이드
- `supabase/*.sql` — 마이그레이션·RLS 감사·인덱스
- `HANDOVER.md` — 초기 인수인계
</content>
