# 음악 소개팅 앱 구현 계획 (Plan)

## 📋 전략 개요

Remix.js 기반으로 모바일 앱 UI를 구현합니다. 사용자 흐름을 따라 스플래시 → 웰컴 → 약관동의 → 개인정보 → 음악선택 → 마이페이지 순서로 진행합니다.

---

## 🏗️ Phase 1: Remix 프로젝트 마이그레이션

### 1.1 프로젝트 구조 설정

```
src/
├── routes/
│   ├── _index.tsx          # 스플래시 화면
│   ├── welcome.tsx         # 웰컴 화면
│   ├── terms.tsx           # 약관동의
│   ├── profile/            # 개인정보 (멀티스텝)
│   │   ├── _index.tsx
│   │   ├── step1.tsx
│   │   ├── step2.tsx
│   │   └── ...
│   ├── music.tsx           # 음악선택
│   ├── genre.tsx           # 장르선택
│   ├── chat.tsx            # 채팅
│   └── mypage.tsx          # 마이페이지
├── components/
│   ├── StatusBar.tsx       # 상단 상태바 (공용)
│   ├── HomeIndicator.tsx   # 하단 인디케이터 (공용)
│   ├── BottomNav.tsx       # 하단 네비게이션 (공용)
│   ├── MusicCard.tsx       # 음악 카드
│   └── ...
├── styles/
│   ├── globals.css         # 전역 스타일
│   └── tailwind.css        # (선택) Tailwind 설정
├── lib/
│   ├── constants.ts        # 색상, 폰트 등
│   ├── types.ts            # TypeScript 타입
│   └── utils.ts            # 유틸함수
└── root.tsx               # 레이아웃 루트
```

### 1.2 Dependencies 설치

- remix, react-router-dom 업그레이드
- (선택) CSS-in-JS 라이브러리 (styled-components, emotion 등)
- 타입 정의 업데이트

### 1.3 Root Layout 구성

- Status Bar + 페이지 콘텐츠 + Home Indicator 구조
- 글로벌 스타일 (색상, 폰트, 레이아웃)
- 하단 네비게이션 (일부 페이지에서만 표시)

---

## 🎨 Phase 2: 공용 컴포넌트 구현

### 2.1 StatusBar 컴포넌트

- 시간, 배터리, 와이파이, 신호 표시
- 높이 60px, 흰색 배경
- 이미지 자산 다운로드 & 임베드

### 2.2 HomeIndicator 컴포넌트

- iOS 하단 제스처 표시
- 높이 34px, 중앙 검은 선

### 2.3 BottomNav 컴포넌트

- 4개 탭: 홈, 탐색, 채팅, 마이
- 라우터 링크 기반 활성화
- 선택적 표시 (프로필 페이지에서는 숨김)

### 2.4 버튼 & 입력 필드 컴포넌트

- 라운드 버튼 (CTA 용)
- 텍스트 입력 필드
- 체크박스 (약관동의)
- 라디오 버튼 (성별 선택 등)

---

## 📱 Phase 3: 페이지별 구현

### 3.1 스플래시 (스플래시.tsx / routes/\_index.tsx)

**구성**:

- Status Bar + 타이틀 텍스트 + Home Indicator

**기능**:

- 3초 자동 딜레이 → 웰컴 페이지로 리다이렉트
- `useEffect + useNavigate` 사용

**스타일**:

- 배경: 흰색, 가운데 정렬
- 텍스트: Pretendard Bold 30px, 중앙 정렬

**예상 복잡도**: ⭐

---

### 3.2 웰컴스크린 (routes/welcome.tsx)

**구성**:

- 상단 장식 아이콘들 (분홍색 원형)
- 큰 제목 텍스트 (빨간색)
- 설명 텍스트
- 일러스트 (이미지 자산)
- "시작하기" CTA 버튼

**기능**:

- 버튼 클릭 → 약관동의 페이지로 이동

**스타일**:

- 배경: 흰색
- 제목: #ff625d, Pretendard Bold 30px
- 버튼: #ff625d 배경, 50px 높이, 라운드

**예상 복잡도**: ⭐⭐

---

### 3.3 약관동의 (routes/terms.tsx)

**구성**:

- 뒤로가기 버튼 + 제목
- 약관 텍스트 (스크롤 가능)
- 체크박스 (필수 동의)
- 다음 버튼

**기능**:

- 체크박스 상태 관리 (로컬 상태 또는 form data)
- 모든 항목 체크 시에만 버튼 활성화
- 다음 클릭 → 개인정보 입력 Step 1로 이동

**스타일**:

- 비슷한 레이아웃 (약간의 변형만 예상)

**예상 복잡도**: ⭐⭐

---

### 3.4 개인정보 입력 (routes/profile/\*.tsx)

**구성** (멀티스텝):

- Step 1: 이름
- Step 2: 나이, 성별
- Step 3: 학교
- Step 4: 학과
- Step 5: 입금자명

**기능**:

- 각 단계별 입력 필드
- 유효성 검사
- 진행 상태 표시 (1/5, 2/5 등)
- 뒤로가기 버튼
- 다음 버튼
- 최종 단계에서 "완료" → 음악선택으로 이동

**데이터 관리**:

- 로컬 상태 또는 서버 상태
- 세션 스토리지/로컬 스토리지 활용 (진행도 보존)

**예상 복잡도**: ⭐⭐⭐

---

### 3.5 음악선택 (routes/music.tsx)

**구성**:

- 상단: 로고 + 메뉴 아이콘
- 제목/설명
- 음악 카드:
  - 앨범 이미지 (마스크)
  - 아티스트/노래 정보
  - 시간 표시
  - 장르 태그
- 매칭 정보 카드
- 액션 버튼 (수락, 매칭 한 번 더)
- **하단 네비게이션** (활성: 홈)

**기능**:

- 음악 목록 렌더링
- 카드 스와이프 또는 버튼 클릭 (수락/거절)
- 상태 업데이트
- "수락" 클릭 → 채팅 또는 다음 단계로

**예상 복잡도**: ⭐⭐⭐⭐

---

### 3.6 장르선택 (routes/genre.tsx)

**구성**:

- 장르 목록/카드
- 다중 선택 가능
- 확인 버튼
- **하단 네비게이션** (활성: 홈)

**기능**:

- 장르 목록 렌더링
- 선택/해제 토글
- 확인 → 다음 페이지 또는 음악선택으로 이동

**예상 복잡도**: ⭐⭐

---

### 3.7 채팅창 (routes/chat.tsx)

**구성**:

- 상대방 프로필 헤더
- 메시지 리스트
- 메시지 입력 필드
- 전송 버튼
- **하단 네비게이션** (활성: 채팅)

**기능**:

- 메시지 렌더링
- 입력/전송 기능
- 스크롤 위치 유지

**예상 복잡도**: ⭐⭐⭐⭐

---

### 3.8 마이페이지 (routes/mypage.tsx)

**구성**:

- 상단: 뒤로가기 + 제목
- 사용자 이름 (28px Bold)
- 프로필 이미지 (원형)
- "내 정보 수정" 버튼
- 정보 목록 (보더 박스):
  - 이름, 나이, 성별, 학교, 학과, 입금자명
- 추천 앱 카드
- **하단 네비게이션** (활성: 마이)

**기능**:

- 사용자 정보 표시
- "내 정보 수정" 클릭 → 프로필 수정 페이지로 이동 (예상)
- 네비게이션 탭 클릭 → 해당 페이지로 이동

**예상 복잡도**: ⭐⭐⭐

---

## 🎯 Phase 4: 상태 관리 & 데이터 흐름

### 4.1 상태 관리 전략

- **로컬 상태**: 각 페이지의 폼 입력 (useState)
- **라우터 상태**: URL 기반 페이지 네비게이션
- **세션/로컬 스토리지**: 진행도 저장 (선택)
- **로더/액션** (Remix): 서버 데이터 처리 (추후)

### 4.2 데이터 구조

```typescript
// User Profile
interface User {
  name: string;
  age: number;
  gender: "male" | "female";
  school: string;
  major: string;
  bankAccountHolder: string;
}

// Music
interface Music {
  id: string;
  title: string;
  artist: string;
  genre: string;
  imageUrl: string;
  duration: string;
}

// Match
interface Match {
  id: string;
  user: User;
  commonGenre: string;
  status: "pending" | "accepted" | "rejected";
}
```

---

## 💅 Phase 5: 스타일 시스템

### 5.1 스타일 접근법

- **CSS Modules** 또는 **CSS-in-JS** (styled-components 등)
- 또는 **Tailwind CSS** (설치 후)
- **글로벌 스타일**: 폰트, 색상, 기본 요소

### 5.2 색상 토큰

```typescript
const COLORS = {
  primary: "#ff625d",
  secondary: "#ffeeed",
  background: "#ffffff",
  cardBg: "#f9f9f9",
  border: "#e2e2e2",
  textPrimary: "#000000",
  textSecondary: "#808080",
};
```

### 5.3 폰트 설정

- **Pretendard** 폰트 임베드 또는 CDN
- Bold, Semi Bold, Medium, Regular 가중치

---

## ✅ 체크리스트

### 프로젝트 초기화

- [ ] Remix 마이그레이션 완료
- [ ] 폴더 구조 생성
- [ ] 타입 정의 작성
- [ ] 글로벌 스타일 설정

### 공용 컴포넌트

- [ ] StatusBar 구현
- [ ] HomeIndicator 구현
- [ ] BottomNav 구현
- [ ] 버튼 & 입력 필드 컴포넌트 구현

### 페이지 구현

- [ ] 스플래시 (3초 딜레이 + 리다이렉트)
- [ ] 웰컴 (버튼 네비게이션)
- [ ] 약관동의 (체크박스 + 검증)
- [ ] 개인정보 입력 (멀티스텝 폼)
- [ ] 음악선택 (카드 렌더링 + 상태)
- [ ] 장르선택
- [ ] 채팅창
- [ ] 마이페이지

### 테스트 & 검증

- [ ] 모든 라우트 동작 확인
- [ ] 반응형 레이아웃 확인 (모바일 390px)
- [ ] 색상/폰트 Figma와 일치 확인
- [ ] 네비게이션 탭 활성화 상태 확인

---

## 📊 예상 일정

1. 프로젝트 마이그레이션: 30분
2. 공용 컴포넌트: 1시간
3. 개별 페이지: 2-3시간
4. 스타일 & 디버깅: 1시간

**총 예상**: 4-5시간

---

## 🚀 구현 순서

1. Remix 마이그레이션 + 기본 레이아웃
2. StatusBar & HomeIndicator 완성
3. 스플래시 → 웰컴 → 약관동의 순차 완성
4. 개인정보 멀티스텝 완성
5. 음악선택 + 하단 네비게이션
6. 마이페이지 + 나머지 페이지
7. 전체 통합 테스트
