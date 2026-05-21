# 음악 소개팅 앱 — Figma 시안 분석 (검증판)

> 최종 갱신: 2026-05-21
> 데이터 출처: Figma MCP `get_design_context` — 4개 핵심 화면 직접 추출
> Figma 파일: https://www.figma.com/design/707rxeVk0SGe1nZB4BE0LR/
> 검증된 노드: 857:5657(스플래시), 837:5794(웰컴), 854:5782(음악선택), 853:5779(마이페이지)

---

## 0. 프로젝트 개요

- **앱명**: 멋사 1조 음악 매칭 앱 (소개팅 기반)
- **플랫폼**: 모바일 (390px 너비 기준)
- **기술**: React + TypeScript + Remix v2 (마이그레이션 완료)
- **타겟 사용자**: 상명대 + 주변 천안권 대학생 (회의록 기준)

---

## 1. 디자인 토큰 (Figma 추출 값)

### 1.0 ⚠️ 디자인 시스템 vs 실제 화면 — 색상 불일치

스타일 가이드(`867:7038`)와 실제 화면(`837:5794` 등) 사이에 **색상 명명·hex가 다릅니다**:

| 역할 | 디자인 시스템 명명 | 시스템 hex (기본 모드) | 실제 화면 hex | 비고 |
|------|-------------------|----------------------|--------------|------|
| 브랜드 (Primary) | `color/light/primary/60` | `#0b50d0` (블루) | — 미사용 | 마스코트 톤? |
| 보조 (Secondary) | `color/light/secondary/70` | (틸/청록) | — 미사용 | |
| 강조 (Accent/Point) | `color/light/point/50` | `#d63d4a` (코랄) | `#ff625d` | **불일치** |
| 강조 surface | `color/light/point/10` 추정 | (밝은 코랄) | `#ffeeed` | 시스템 어느 step인지 미확정 |

**원인 추정**: 시안 화면이 디자인 시스템 확립 전에 만들어졌거나, 의도적으로 다른 톤 사용.
**열린 질문**: 구현 시 `#ff625d`(화면 정합)와 `#d63d4a`(시스템 정합) 중 어느 쪽 따를지 사용자 확인 필요 → Section 7 참조.

### 1.1 색상 (검증된 hex)

```typescript
// 실제 화면에서 직접 추출 — 시스템과 일부 불일치 (Section 1.0 참조)
COLORS = {
  // === 화면 정합 (현재 사용) ===
  accent: "#ff625d",        // CTA, 강조 텍스트 — 시스템상 point/50은 #d63d4a
  accentSoft: "#ffeeed",    // 보조 배경, 마이페이지 프로필 원
  bg: "#ffffff",
  cardBg: "#f9f9f9",         // 음악 카드
  cardBorder: "#e2e2e2",
  divider: "#dfdfdf",        // 마이페이지 정보 박스
  divider2: "#f3f3f3",       // 음악 화면 8px 구분선
  textPrimary: "#000000",
  textSecondary: "#808080",  // 마이페이지 정보 값
  textHelper: "#929292",     // 웰컴 서브타이틀
  textPlaceholder: "#bfbfbf",
  textMuted: "#bdbdbd",
  textVeryMuted: "#9f9f9f",  // 음악 아티스트
  textTimer: "#d6d6d6",      // 음악 카드 01:00:00
  navInactive: "#b0b8c1",    // 비활성 탭

  // === 시스템 정합 (참고용, 미사용) ===
  systemPrimaryBase: "#0b50d0",  // 블루 — 마스코트 컬러일 가능성
  systemAccentBase: "#d63d4a",   // 시스템 코랄 (현재 #ff625d로 대체됨)
}
```

### 1.2 디자인 시스템 스케일 구조 (참고)

각 색상은 **13단계 스텝** (0/5/10/20/30/40/50/60/70/80/90/95/100) × **2모드** (기본 / 선명한 화면).
시멘틱 역할 표기: `surface` (배경 stops), `base` (메인), `text` (텍스트 stops).

- **Gray**: 모드 분리 없음. 0→100 명도 변화
- **Primary (블루)**: 기본모드 surface@0~30, base@60, text@70 / 선명모드 text@5, base@50, surface@95
- **Secondary (틸)**: 기본모드 base@70, text@80
- **Accent/Point (코랄)**: 기본모드 base@50, text@60
- **Graphic**: Blue / Red 분리 (일러스트·인포그래픽용)
- **System**: Danger(빨강), Warning(노랑), Success(녹색), Information(파랑)

### 1.3 타이포그래피

- **시스템 지정 폰트**: `Pretendard GOV` (정부 무료 폰트 변형) — 디자인 시스템 명시
- **실제 화면 사용**: `Pretendard` (일반 버전) — Google Fonts CDN
  - → 차이 거의 없음 (GOV는 일부 글리프 조정 버전). 일단 일반 Pretendard 유지
- **시스템 폰트**: `SF Pro Text Semibold` (Status Bar 9:41 표시용)

| 토큰 | 크기 | 가중치 | letter-spacing | 사용처 |
|------|------|--------|----------------|--------|
| `display` | 30px | Bold | -0.6px | 스플래시·웰컴 제목 |
| `headlineMd` | 28px | Bold | -0.56px | 마이페이지 이름 "김민수" |
| `headlineSm` | 26px | Bold | -0.52px | 입금완료 헤드 |
| `title` | 20px | Bold | 0 | CTA 버튼 텍스트 |
| `body` | 16px | Medium | -0.32px | 본문 |
| `bodyBold` | 16px | SemiBold | -0.32px | 카드 헤더·CTA 보조 |
| `label` | 14px | Regular | -0.28px | 음악 설명 |
| `caption` | 13px | Medium | -0.26px | 채팅 말풍선 |
| `tiny` | 12px | Regular/Bold | -0.24px | 아티스트·타이머 |
| `nav` | 11px | SemiBold | -0.22px | 하단 네비 라벨 |
| `statusBar` | 17px | SF Pro Semibold | -0.408px | 9:41 시간 |

### 1.3 간격·라운드

- **컨테이너 패딩**: 좌우 20px (기본), 25px (보더 박스 외부)
- **CTA 버튼**: 350×62px, radius 50px (가득 폭 버튼)
- **인라인 버튼**: 251×45px, radius 12px (수락/매칭한번더)
- **소형 버튼**: 126×40px, radius 20px (내 정보 수정)
- **카드**: radius 15px (음악), 8px (정보 박스), 12px (알림창)

---

## 2. 공용 컴포넌트 (Figma 정밀 사양)

### 2.1 StatusBar `721:163`
- **크기**: 390×60px
- **시간 텍스트**: SF Pro Text Semibold 17px, 좌측 27px+27px 영역에 중앙 정렬, top:20px
- **우측 아이콘 묶음** (top:23~24px):
  - 신호 (Mobile Signal): 18×12px — `/icons/status-signal.png`
  - WiFi: 17×11.834px — `/icons/status-wifi.png`
  - 배터리: 27.401×13px (outline + fill + cap) — `/icons/status-battery-*.png`
- **배경**: 투명 (페이지 배경 위에 얹힘)

### 2.2 HomeIndicator `721:226`
- **크기**: 390×34px, 흰색 배경
- **인디케이터 라인**: 138.789×4.604px, 검정, radius 100px, bottom:8.57px, 가로 중앙

### 2.3 BottomNav `854:5826`
- **크기**: 390×107px (음악 화면 기준), top 라인 그림자 `0 4px 10px rgba(0,0,0,0.18)`
- **탭**: 4개, 각 75px 너비, left 22.5 / 112.5 / 202.5 / 292.5
- **탭 구조** (per tab):
  - 아이콘 36×36px (top:16px, 탭 안 left:19.5px)
  - 라벨: Pretendard SemiBold 11px (top:53.57px)
- **아이콘 자산**:
  - 홈 활성: `/icons/nav-home-active.png` (#ff625d)
  - 탐색: `/icons/nav-explore.png` (그레이 #b0b8c1)
  - 채팅: `/icons/nav-chat.png` (그레이)
  - 마이 활성: `/icons/nav-my-active.png`
- **활성 색**: `#ff625d`, 비활성: `#b0b8c1`

---

## 3. 페이지별 정밀 사양

### 3.1 스플래시 `857:5657`

```
배경: white
콘텐츠 (top:214px 중앙):
  Pretendard Bold 30px / line-height 1.3 / letter-spacing -0.6px / 검정
  "음악 취향이 같으면"
  "대화도 잘 통하니까"
하단: HomeIndicator
타이머: 3초 후 /welcome 이동
```

### 3.2 웰컴 `837:5794`

```
배경: white

장식 도트 (제목 좌우):
  좌측: 16px+9px+9px 핑크 원형 도트 (left:91~131px, top:158~196px)
  우측: 16px+9px+9px 도트 (left:252~286px, 90도 회전)

제목 (top:179px, 중앙):
  Pretendard Bold 30px / #ff625d / "환영합니다!"

서브타이틀 (top:243px, 중앙, -0.32px):
  Pretendard Medium 16px / #929292
  "노래로 이어지는 인연"
  "지금 만나러 가볼까요?"
  ("노래"/"인연"은 Bold)

일러스트 (top:321px, left:23px):
  344×314px, /images/welcome-mascot.png (블루/핑크 마스코트 페어)

CTA (top:748px, 중앙):
  350×62px, bg #ff625d, radius 50px
  white text, Pretendard Bold 20px, "시작하기"
  → 클릭 시 /terms
```

### 3.3 음악선택 `854:5782`

```
상단 헤더 (top:0~132px, 흰색 + 작은 그림자):
  StatusBar (60px)
  로고 (top:70px, left:20px): 104×40px, bg #eee (placeholder)
  우측 아이콘 (top:76px, left:343px): 24.846×28.138px (메뉴/햄버거?)

문구 영역 (top:355px 부근, padding 25px):
  Pretendard Medium 16px / 검정
  "어떤 노래를 선택하실지 고민이신가요?"  (어떤 노래/고민은 Bold)
  Pretendard Regular 14px / #bfbfbf
  "취향이 같으면 대화도 쉬워져요! 노래를 둘러보세요."

음악 매칭 카드 (top:187px, 중앙):
  283×400px, bg #f9f9f9, border #e2e2e2, radius 15px
  앨범 마스크 이미지 (마스코트 일러스트)
  시간 표시 (top:375px): Pretendard Bold 12px #d6d6d6 "01:00:00"
  매칭 메시지 (top:401px, 중앙, 168px wide, 42px tall):
    Pretendard Regular 16px / line-height 1.35
    "{#ff625d Bold}인디{/}를 좋아하는 OO 님과"
    "{Bold}매칭이 성사{/}되었어요!"

수락하기 버튼 (top:469px, 중앙):
  251×45px, bg #ff625d, radius 12px
  white SemiBold 14px

매칭 한 번 더 하기 (top:522px, 중앙):
  251×45px, bg #ffeeed, radius 12px
  #ff625d SemiBold 14px

페이드 그라데이션 (top:734px, 80px tall):
  rgba(255,255,255,0.5) → white

미니플레이어 (top:764px, padding 25px):
  앨범 마스크 50×50px (image 1214)
  "HOW SWEET" Pretendard SemiBold 16px
  "NEWJEANS" Pretendard Regular 12px #9f9f9f
  더보기 화살표 우측 (top:704px, left:중앙+167)

8px 구분바 (top:632px, full-width, #f3f3f3)

BottomNav (bottom: 약 -17px 그림자, 활성: 홈)
HomeIndicator
```

### 3.4 마이페이지 `853:5779`

```
배경: white

헤더 (top:81~96px):
  뒤로가기 화살표 (top:81px, left:중앙-164.3): 7.408×14.816px
  제목 (top:중앙-334.5≈100px, 중앙): Pretendard SemiBold 16px 검정 "마이 페이지"

프로필 (top:147~290px):
  분홍 원 (top:147px, 중앙): 143×143px, bg #ffeeed, radius 58px
  마스코트 (마스크): /images/profile-mascot.png 중심 정렬
  이름 (top:324.5px, 중앙): Pretendard Bold 28px / -0.56px / "김민수"

내 정보 수정 버튼 (top:360px, 중앙):
  126×40px, bg #ff625d, radius 20px
  white SemiBold 16px

mehro 추천 카드 (top:423px, 중앙):
  340×70px, bg white, border 1.5px #dfdfdf, radius 12px
  앨범 아이콘 (left:14px, 13px in, 50×48px): /icons/mehro.png
  "chance with you" — Avenir Next Medium 16px / 검정 / line-height 28px
  "mehro" — Avenir Next Medium 13px / #949494 / center, left:94px, top:37px
  더보기 점 3개 (우측)

정보 박스 (top:554px, 중앙):
  340×225px, border 1.5px #dfdfdf, radius 8px
  6개 행, 각 행 ~37px height, 좌측 41px / 우측 349px
  좌측 라벨: Pretendard Medium 16px 검정 (이름·나이·성별·학교·학과·입금자명)
  우측 값: Pretendard Medium 16px #808080 (오른쪽 정렬)
  행간 구분선: #dfdfdf 1px

BottomNav (활성: 마이)
HomeIndicator
```

### 3.5 입금완료 `830:5487`
> 시안상 노드명은 "약관동의"지만 실제 내용은 입금완료

```
중앙 일러스트 (top:243px, 224×225px): /images/payment-complete.png
헤드 (top:462px, 중앙): Pretendard Bold 26px / -0.52px / "입금이 완료되었습니다"
서브 (top:501px, 중앙): Pretendard Medium 16px / #939393 / "취향에 맞는 사람을 찾아 드릴게요."
CTA (top:748px, 중앙): 350×62px, #ff625d, radius 50px / white Medium 20px / "시작하기"
```

---

## 4. 미확인 화면 (시안 보드에서만 확인)

다음 화면들은 MCP 호출 한도 절약을 위해 보드 오버뷰 이미지에서 추출. **구현 시 필요하면 추가 MCP 호출**.

### 4.1 약관동의 (실제)
- 진행 dot 5개 (상단)
- "약관을 확인해주세요!" 제목
- 6개 체크박스 항목
- "다음으로" CTA

### 4.2 프로필 멀티스텝 (5단계)
- Step 1: 이름 ("기본 프로필 정보를 작성해주세요!")
- Step 2: 생년 (연도 셀렉터)
- Step 3: 성별 (남/여 토글)
- Step 4: 학교 ("학교 정보를 작성해주세요!")
- Step 5: 학과 ("학과 정보를 작성해주세요!")
- 진행 dot 5개

### 4.3 입금자명 입력
- "입금자명을 작성해주세요!"
- 카카오뱅크 1234-5678-9012 안내
- 입금자명 input
- "다음으로" CTA

### 4.4 장르선택
- "어떤 장르를 좋아하세요?" + X 닫기
- 6개 장르 원형 그리드 (BALLAD, ROCK, 외 4개) — 흑백 디스크 + 라벨
- 다중 선택, "지금하기" CTA
- 이탈 방지 모달 (블루 마스코트 슬픈 표정)

### 4.5 채팅
- 채팅 리스트: 프로필 + 이름 + 마지막 메시지
- 채팅창: 상대방 헤더, 말풍선 좌우 (#ffeeed 본인 / 흰색 상대), 시간·읽음, 입력 필드 + 전송

---

## 5. 자산 (다운로드 완료, /public/)

### `/public/images/`
- `welcome-mascot.png` — 웰컴 메인 일러스트 (블루/핑크 페어, ~896KB)
- `profile-mascot.png` — 마이페이지 프로필 (블루 단독, ~468KB)
- `profile-mascot-mask.png` — 위 캐릭터의 마스크 (260B)
- `payment-complete.png` — 입금완료 일러스트 (~1MB)
- `logo.png` — 음악선택 헤더 로고 (~598KB)

### `/public/icons/`
- StatusBar: `status-battery-outline.png`, `status-battery-end.png`, `status-battery-fill.png`, `status-wifi.png`, `status-signal.png`
- BottomNav: `nav-home-active.png`, `nav-explore.png`, `nav-chat.png`, `nav-my-active.png`

> ⚠️ Figma CDN 자산은 7일 만료. 위 파일들은 로컬 다운로드 완료 — 만료 무관.

---

## 6. 알려진 시안 이슈

1. **노드명/콘텐츠 불일치**: 830:5487 노드 이름은 "약관동의"인데 콘텐츠는 입금완료. 시안 작성 중 재사용된 듯.
2. **버튼 텍스트 가중치 불일치**: 웰컴은 "시작하기"가 Bold, 입금완료는 Medium — 시안 내부 불일치
3. **하단바 컴포넌트 이름 "(수정 필요) 하단바"** — 디자이너가 미완성 표시. 변형 가능성 있음.
4. **외부 결제 화면**: 보드에 카카오뱅크/페이 캡처 있음 — 우리 앱 아닌 외부 진입 안내 화면일 가능성
5. **색상 시스템 불일치**: 화면이 `#ff625d` (밝은 코랄)을 쓰는데 디자인 시스템 Accent base는 `#d63d4a`. Section 1.0 참조.
6. **Primary Blue 미사용**: 시스템상 Primary는 블루(#0b50d0)인데 어느 화면에도 안 보임. 마스코트 색감과 일치 — 브랜드 컬러일 가능성.

---

## 7. 의사결정 필요 — 색상 정합 전략

**질문**: UI 구현 시 어느 쪽 색상 따를지?

### 옵션 A — 화면 정합 (#ff625d 유지)
- 장점: Figma 화면 그대로, 시안 작가 의도 보존
- 단점: 디자인 시스템과 불일치, 향후 시스템 변경 시 동기화 필요

### 옵션 B — 시스템 정합 (#d63d4a 채택)
- 장점: 토큰 시스템 일관성, CSS 변수 패턴 확립 가능
- 단점: 실제 시안과 시각적 차이, 디자이너 의도와 어긋날 위험

### 옵션 C — 하이브리드 (CSS 변수 + 화면값)
- CSS 변수로 토큰 정의 (`--accent-base`) 하되 값은 화면 기준 `#ff625d`
- 향후 디자이너 결정에 따라 한 줄만 변경하여 동기화
- 장점: 유연성, 토큰 패턴 + 화면 정합 모두 확보
- **권장안**

---

## 8. 백엔드 스택 (2026-05-21 확정)

### 8.1 결정

- **BaaS**: **Supabase** (Postgres 기반)
- **인증**: 이메일 + 비밀번호 (이메일 인증 OFF, 도메인 제약 없음)
- **실시간**: Supabase Realtime (Postgres LISTEN/NOTIFY)
- **호스팅**: 추후 결정 (Vercel / Fly.io 후보)

### 8.2 Supabase로 결정한 근거

| 영역 | Supabase 장점 |
|------|--------------|
| 매칭 알고리즘 | Postgres SQL로 장르 교집합·취향 유사도·필터링 자연스럽게 작성 |
| 채팅 | Realtime channel + RLS (Row Level Security) 로 직접 채팅 권한 관리 |
| 인증 | 이메일+비밀번호 한 줄 API. 검증 메일 자동 발송. 학교 도메인 화이트리스트 가능 |
| 결제 트랜잭션 | 관계형 DB라 입금 기록·환불·매칭 한 트랜잭션으로 묶기 쉬움 |
| 무료 티어 | 500MB DB, 50K MAU, 무제한 API 호출 — 축제 + 초기 운영 충분 |
| Remix 친화도 | Server-side Supabase client (loader/action에서 직접 사용) + Browser client (Realtime 구독) 분리 패턴 잘 정립 |

### 8.3 데이터 모델 초안

```
users (auth.users 기본)
└─ profiles
    - user_id (FK auth.users)
    - name
    - birth_year
    - gender
    - school
    - major
    - bank_holder
    - created_at

user_genres
    - user_id (FK)
    - genre (text) — ballad / rock / kpop / indie / pop / rnb

matches
    - id
    - user_a_id, user_b_id (FK)
    - status: pending | accepted | rejected | expired
    - matched_at
    - common_genres (text[])

messages
    - id
    - match_id (FK)
    - sender_id (FK)
    - content
    - read_at
    - created_at

payments
    - id
    - user_id (FK)
    - amount
    - bank_holder (입금자명)
    - confirmed_at (관리자 수동 승인)
```

### 8.4 인증 플로우

1. 회원가입: 이메일 + 비밀번호 (이메일 형식만 검증, 도메인 제약 없음)
2. 가입 즉시 세션 발급 (Supabase email confirm OFF)
3. 약관 → 프로필 입력 → DB 저장
4. 로그인: 세션 토큰 → 쿠키 저장 (Remix server session)

### 8.5 보안 고려

- **RLS (Row Level Security)** 모든 테이블에 적용
- profile은 본인만 update / 매칭된 상대만 read
- messages는 해당 match 참여자만 read/insert
- payments는 본인만 read, admin만 update

### 8.6 미결 / 추후

- 카카오 OAuth 추가 (출시 후)
- 위치 기반 매칭 (지리적 거리)
- 결제 자동화 (수동 → 토스/카카오페이 API)
- 푸시 알림 (매칭/메시지 도착)
