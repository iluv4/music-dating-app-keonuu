# Plan — UI 전면 재작성 (Figma 시안 정합)

> 작성일: 2026-05-21
> 범위: **기존 UI 전체 갈아엎고 Figma 시안 정합 기준 재작성**
> 워크플로우 단계: Step 2 (Plan). **확정 전까지 구현 금지**.
> 참고 문서: [research.md](research.md), 빌드 환경은 [plan_kim_0521_01.md](plan_kim_0521_01.md) 완료

---

## 📌 의사결정 로그

| 일자 | 결정 | 근거 |
|------|------|------|
| 2026-05-21 | **Accent 색상 = `#ff625d` 화면 기준 유지** (시스템 `#d63d4a` 무시) | 사용자 결정 — Figma 화면 정합 우선 |
| 2026-05-21 | **Primary Blue (`#0b50d0`) 이번 plan에서 미사용** | 사용자 결정 — Accent만 사용 |
| 2026-05-21 | 시스템 폰트 `Pretendard GOV` → 일반 `Pretendard` 유지 | 글리프 차이 미미, 변경 불필요 |

---

## 🎯 목표

Figma 시안과 시각적·구조적으로 일치하는 모바일 음악 매칭 앱 UI 구현. 현재 placeholder 수준의 UI를 시안 토큰 기반으로 전면 재작성.

**성공 기준**:
1. 색상·폰트·간격이 [research.md](research.md) Section 1의 토큰과 일치
2. 마스코트 일러스트 정상 노출
3. StatusBar/HomeIndicator/BottomNav가 iOS 디자인과 동일 (이모지 제거)
4. 핵심 4개 화면(Splash·Welcome·Music·MyPage)은 픽셀 단위 정합
5. 보조 4개 화면(Terms·Profile·Genre·Chat)은 시안 보드 기준 합리적 구현
6. 모든 라우트 200 응답, type-check 통과

---

## 🧱 Phase 0: 디자인 토큰 시스템 구축

### 0.1 constants.ts 전면 개편
[src/lib/constants.ts](src/lib/constants.ts) 를 검증된 토큰 기반으로 재작성:

```typescript
export const COLORS = {
  primary: "#ff625d",
  primarySoft: "#ffeeed",
  bg: "#ffffff",
  cardBg: "#f9f9f9",
  cardBorder: "#e2e2e2",
  divider: "#dfdfdf",
  divider2: "#f3f3f3",
  text: { primary: "#000", secondary: "#808080", helper: "#929292", muted: "#bdbdbd", placeholder: "#bfbfbf", veryMuted: "#9f9f9f", timer: "#d6d6d6" },
  nav: { active: "#ff625d", inactive: "#b0b8c1" },
};

export const TYPOGRAPHY = {
  display: { fontFamily: "Pretendard", fontWeight: 700, fontSize: 30, letterSpacing: "-0.6px", lineHeight: 1.3 },
  headlineMd: { /* 28 Bold */ },
  headlineSm: { /* 26 Bold */ },
  title: { /* 20 Bold */ },
  body: { /* 16 Medium */ },
  bodyBold: { /* 16 SemiBold */ },
  label: { /* 14 Regular */ },
  caption: { /* 13 Medium */ },
  tiny: { /* 12 */ },
  nav: { /* 11 SemiBold */ },
};

export const RADIUS = { card: 15, info: 8, alert: 12, pill: 50, buttonInline: 12, buttonSm: 20 };
export const SHADOW = { bottomNav: "0 4px 10px rgba(0,0,0,0.18)", header: "0 4px 2px rgba(0,0,0,0.05)" };
```

### 0.2 globals.css 정리
- Pretendard CDN import 추가 (root.tsx 의 Links에 이미 있음 — 검증)
- `#root` 셀렉터 제거 (Remix는 `#root` 사용 안 함)
- 모바일 390px 컨테이너 룰 유지

### 0.3 폰트 추가
- SF Pro Text — StatusBar용. 라이선스 회피 위해 `-apple-system, BlinkMacSystemFont` 폴백으로 대체 (iOS/Mac에서 자동)
- Avenir Next — mehro 카드. 동일 시스템 폴백
- Pretendard CDN: 이미 root.tsx에서 로드 중 (700까지) — **900까지 확장 불필요, 현 weights 충분**

---

## 🧩 Phase 1: 공용 컴포넌트 재작성

### 1.1 StatusBar
**현재 문제**: 이모지(📡📶🔋)로 표시, 시안과 다름.
**개편**:
- 흰색 배경 60px height
- 좌측: 9:41 텍스트 (left:27px 시작, top:20px, system-ui Semibold 17px, letter-spacing -0.408px)
- 우측: 3개 PNG 아이콘 (`/icons/status-signal.png`, `/icons/status-wifi.png`, `/icons/status-battery-*`)
- 배터리는 outline + fill + cap 3-레이어 (정밀 위치 [research.md](research.md) §2.1)
- 컴포넌트 prop: `transparent?: boolean` (배경 투명 옵션)

### 1.2 HomeIndicator
- 34px height, white bg
- 138.789×4.604px 검정 바, radius 100px, 가로 중앙, bottom:8.57px
- 현재 구현과 거의 일치 — 위치 미세 조정만

### 1.3 BottomNav
**현재 문제**: 이모지 아이콘 + 색상 #b0b8c1 만 사용, 활성/비활성 아이콘 분리 안 됨.
**개편**:
- 390×107px, white, top shadow `0 4px 10px rgba(0,0,0,0.18)`
- 4개 탭 (75px 각, left 22.5/112.5/202.5/292.5)
- 활성 탭: 빨간 아이콘 + #ff625d 라벨
- 비활성: 그레이 아이콘 + #b0b8c1 라벨
- 아이콘 36×36px PNG (top:16px), 라벨 11px SemiBold (top:53.57px)
- prop으로 활성 탭 받기 (`active: "home" | "explore" | "chat" | "my"`)

> ⚠️ 활성/비활성 아이콘 자산을 모두 받지는 못했음 (홈/마이는 활성만). 비활성 홈/마이는 그레이톤 PNG 추가 필요 또는 CSS filter로 회색화 처리.

### 1.4 신규 공용 컴포넌트
- **`PhoneFrame`**: 모든 페이지 wrapper. 390px width, 100vh, flex column.
- **`PrimaryButton`**: 350×62 pill (CTA 표준). disabled state 포함.
- **`InlineButton`**: 251×45 12px-radius (수락/매칭한번더 패턴). variant: solid|soft.
- **`SmallButton`**: 126×40 20px-radius (내 정보 수정).
- **`TextInput`**: 하단 borderBottom 1px #e2e2e2 (profile 입력 필드)
- **`ProgressDots`**: 5개 dot (terms/profile 진행 표시)

---

## 📱 Phase 2: 페이지 재작성

### 2.1 스플래시 `routes/_index.tsx`
**거의 그대로 유지** — 시안과 일치.
- 텍스트 top:214px 위치, letter-spacing -0.6px 추가
- 3초 타이머 유지

### 2.2 웰컴 `routes/welcome.tsx`
**전면 재작성**:
- 장식 도트 (좌우 6개) — 현재 없음 → 추가
- 일러스트: 회색 placeholder 원 → `/images/welcome-mascot.png` 교체 (344×314)
- "노래"·"인연" Bold 부분 텍스트 inline span 처리
- CTA 위치 정확화 (top:748px)

### 2.3 약관동의 `routes/terms.tsx`
**구조 재작성** (시안 보드 추정):
- 상단 진행 dot 5개 (1단계 활성)
- "약관을 확인해주세요!" 28px Bold 헤드
- 서브타이틀 16px Medium 헬퍼 텍스트
- 체크박스 항목 6개 (시안에서 텍스트 미확인 → research.md 미확인 영역 참조)
  - 임시 텍스트: "[필수] 서비스 이용약관", "[필수] 개인정보 수집/이용", "[필수] 만 14세 이상", "[필수] 위치 정보 수집", "[선택] 마케팅 정보 수신", "[필수] 본인인증 동의"
- 전체 동의 토글
- 하단 "다음으로" CTA (모든 필수 체크 시 활성)

### 2.4 프로필 멀티스텝 `routes/profile/`
**단일 파일 → 멀티스텝으로 분리**:
- `routes/profile._index.tsx` → step1로 redirect (또는 Step 1 직접)
- `routes/profile.step1.tsx` — 이름
- `routes/profile.step2.tsx` — 생년
- `routes/profile.step3.tsx` — 성별
- `routes/profile.step4.tsx` — 학교
- `routes/profile.step5.tsx` — 학과
- `routes/profile.payment.tsx` — 입금자명 (별도 단계로 분리)
- `routes/profile.complete.tsx` — 입금 완료 (`830:5487`)

**상태 관리**: sessionStorage (페이지 새로고침 시에도 데이터 유지)

**공통 레이아웃**:
- 진행 dot 5~6개 (현재 step 강조)
- "기본 프로필 정보를 작성해주세요!" 헤드 (Step별 변경)
- 입력 필드 (`TextInput`)
- 하단 "다음으로" CTA

### 2.5 음악선택 `routes/music.tsx`
**전면 재작성**:
- 상단 헤더 132px (white + 그림자)
- 로고 + 메뉴 아이콘 (현재 placeholder, 추후 디자인 자산 받으면 교체)
- 매칭 카드 (283×400, 마스코트 이미지 마스킹)
- 시간 표시 "01:00:00"
- 매칭 메시지 ("인디"·"매칭이 성사" 강조)
- 수락하기 / 매칭 한 번 더 하기 버튼
- 페이드 그라데이션
- 미니플레이어 (앨범 마스크 + 곡명/아티스트)
- BottomNav (활성: 홈)

### 2.6 장르선택 `routes/genre.tsx` (신규)
- "어떤 장르를 좋아하세요?" + X 닫기
- 6개 장르 원형 그리드 (BALLAD, ROCK, K-POP, 인디, 팝, R&B — 시안 6개 추측)
- 흑백 디스크 placeholder
- 다중 선택 (선택 시 빨간 테두리)
- 하단 "지금하기" CTA
- 모달: "중간에 나가면 매칭 어려워요" (이탈 방지)

### 2.7 채팅 `routes/chat.tsx` (신규)
- 헤더: 뒤로가기 + 상대방 이름
- 메시지 리스트:
  - 본인 말풍선: #ffeeed bg, 우측 정렬
  - 상대 말풍선: white border, 좌측 정렬
  - 시간·읽음 표시
- 입력 필드 + 전송 버튼 (하단 고정)
- BottomNav (활성: 채팅)

### 2.8 마이페이지 `routes/mypage.tsx`
**전면 재작성**:
- 뒤로가기 + "마이 페이지" 헤더
- 프로필 (143×143 #ffeeed 원 + 마스코트 이미지)
- 이름 "김민수" (Bold 28px)
- "내 정보 수정" 버튼 (126×40)
- mehro 추천 카드 (340×70)
- 정보 박스 (340×225, 6 rows)
- BottomNav (활성: 마이)

---

## 🔄 Phase 3: 라우팅 연결

- `/` → 3초 → `/welcome`
- `/welcome` → `/terms`
- `/terms` → `/profile/step1`
- `/profile/step1~5` → 다음 단계
- `/profile/step5` → `/profile/payment`
- `/profile/payment` → `/profile/complete`
- `/profile/complete` → `/genre`
- `/genre` → `/music`
- `/music` 매칭 수락 → `/chat`
- BottomNav: `/music` (홈) / `/explore` (미구현 placeholder) / `/chat` / `/mypage`

---

## ⚠️ 주의 사항 & 가정

1. **미확인 화면의 텍스트는 합리적 추정값**. 시안에 정확한 카피가 있으면 후속 교체.
2. **아이콘 자산 부족**: BottomNav 비활성 홈/마이, 음악 헤더 메뉴 아이콘 등은 시안 직접 추출 안 함. CSS filter로 회색화 또는 후속 다운로드.
3. **외부 결제 화면 (카카오뱅크)**: 우리 앱 범위 밖. 입금자명 입력 후 "카카오뱅크로 이동" 안내 화면 정도만 구현.
4. **react-router-dom 잔재 검토**: profile.tsx 등 기존 라우트 안에 잘못된 import 없는지 재확인.
5. **이번 plan은 인터랙션·상태 관리를 깊게 다루지 않음**. 매칭 알고리즘·실제 결제·소켓 채팅은 다음 plan.
6. **반응형**: 시안은 390px 고정. 데스크탑에서는 중앙 정렬된 390px 컨테이너로 표시 (globals.css에 이미 구성됨).

---

## ✅ 체크리스트

### Phase 0: 디자인 토큰
- [ ] [constants.ts](src/lib/constants.ts) COLORS·TYPOGRAPHY·RADIUS·SHADOW 재정의
- [ ] [globals.css](src/styles/globals.css) `#root` 제거, Remix 친화 정리
- [ ] root.tsx Pretendard 가중치 확인 (400/500/600/700 모두)

### Phase 1: 공용 컴포넌트
- [ ] StatusBar 재작성 (PNG 아이콘 사용)
- [ ] HomeIndicator 미세 조정
- [ ] BottomNav 재작성 (활성/비활성 아이콘 분리, 75px×4 레이아웃)
- [ ] PhoneFrame wrapper 신규
- [ ] PrimaryButton / InlineButton / SmallButton 신규
- [ ] TextInput / ProgressDots 신규

### Phase 2: 페이지
- [ ] 스플래시 정밀 위치 조정
- [ ] 웰컴 — 도트 장식 + 마스코트 이미지 + Bold 부분 텍스트
- [ ] 약관 — 진행 dot + 체크박스 6개 + 전체 동의
- [ ] 프로필 멀티스텝 (step1~5 + payment + complete)
- [ ] 음악선택 — 매칭 카드 + 미니플레이어 + 그라데이션
- [ ] 장르선택 — 6 그리드 + 이탈 모달
- [ ] 채팅 — 헤더 + 말풍선 + 입력
- [ ] 마이페이지 — 프로필 + mehro 카드 + 정보 박스

### Phase 3: 라우팅
- [ ] 모든 페이지 간 네비게이션 작동 확인
- [ ] BottomNav 활성 상태 정확

### 검증
- [ ] `npm run type-check` 0 에러
- [ ] `npm run dev` 정상 부팅
- [ ] 모든 라우트 200 응답
- [ ] preview_screenshot 으로 핵심 4개 화면 시안과 시각 비교
- [ ] 콘솔 에러 0 (마스코트 이미지 로드 확인)

---

## 📊 예상 소요

| Phase | 소요 |
|-------|------|
| 0. 토큰 시스템 | 20분 |
| 1. 공용 컴포넌트 | 1시간 |
| 2. 페이지 (8개) | 2.5시간 |
| 3. 라우팅 + 검증 | 30분 |
| **총** | **약 4시간** |

---

## 🚀 구현 순서

1. **Phase 0** — 디자인 토큰 시스템 정리 (다른 작업의 기반)
2. **Phase 1** — 공용 컴포넌트 (페이지 작업 전에 완성)
3. **Phase 2** — 페이지 순서:
   1. 스플래시 (가장 단순, 시안 일치 확인)
   2. 웰컴 (마스코트 적용 첫 사례)
   3. 마이페이지 (가장 정밀 사양 있음)
   4. 음악선택 (가장 복잡)
   5. 약관 (구조 단순)
   6. 프로필 멀티스텝 (라우팅 분리)
   7. 장르선택
   8. 채팅
4. **Phase 3** — 라우팅 연결 검증
5. **검증** — preview screenshot으로 시각 비교

각 페이지 완료마다 dev 서버에서 확인. 시안과 큰 편차 발생 시 즉시 보고.

---

## 🗑️ 폐기 / 교체 대상 코드

- [src/routes/profile.tsx](src/routes/profile.tsx) — 단일 페이지에서 멀티스텝으로 분할
- [src/components/StatusBar.tsx](src/components/StatusBar.tsx) — 이모지 → PNG
- [src/components/BottomNav.tsx](src/components/BottomNav.tsx) — 이모지 → PNG, 활성/비활성 분리
- 각 page의 inline-style 하드코딩 → constants.ts 토큰 참조
