# Plan — 빌드 환경 정리 (Remix 단일화)

> 작성일: 2026-05-21
> 범위: **빌드 환경 정리만**. 미구현 페이지·디자인 자산·UI 보강은 다음 plan에서 처리.
> 워크플로우 단계: Step 2 (Plan). **확정 전까지 구현 금지**.

---

## 🎯 목표

`npm install && npm run dev` 한 번에 Remix 개발 서버가 뜨고, `npm run type-check`가 무사히 통과하는 상태로 정상화한다.

---

## 🔍 현재 상태 진단

### 이중 시스템 충돌
- [package.json](package.json) 은 Remix 선언 (`remix build`, `remix-serve`)
- 그러나 실제 `node_modules/@remix-run/`에 **`dev`도 `serve`도 미설치** (확인됨)
- 동시에 [src/App.tsx](src/App.tsx), [src/main.tsx](src/main.tsx), [index.html](index.html), [vite.config.ts](vite.config.ts) — Vite + react-router-dom 레거시 템플릿 잔재
- `@rollup/plugin-replace`, `@vitejs/plugin-react`, `vite` 가 devDep에 남아있음

### 설정 파일 오작동
- [remix.config.js](remix.config.js) 의 `appDirectory: "src"` **주석 처리됨** → Remix가 기본값 `app/`을 찾는데 코드는 `src/`에 있음
- [tsconfig.json](tsconfig.json) 의 `typescript: "^6.0.3"` — 존재하지 않는 버전 (실제 최신 5.x)
- `importsNotUsedAsValues: "error"` — TS 5.x 에서 deprecated, `verbatimModuleSyntax: true`와 충돌

### 엔트리 파일 결함
- [src/entry.server.tsx](src/entry.server.tsx) — `renderToPipeableStream` import 누락 + `handleRequest`는 `@remix-run/node` 에 없는 export. 표준 Remix 템플릿 기준으로 재작성 필요

---

## 📋 작업 항목

### 1. 레거시 파일 제거
다음 4개 파일은 React Router 예제 잔재이며 Remix와 무관 → **삭제**:
- [src/App.tsx](src/App.tsx)
- [src/main.tsx](src/main.tsx)
- [index.html](index.html)
- [vite.config.ts](vite.config.ts)
- [src/index.css](src/index.css) — `main.tsx`에서만 import. 내용 확인 후 [src/styles/globals.css](src/styles/globals.css) 에 병합하거나 삭제

### 2. package.json 정리

**제거**:
- `react-router-dom` (Remix가 자체 라우터 사용)
- `vite`, `@vitejs/plugin-react`, `@rollup/plugin-replace` (devDep)
- `remix` 패키지 (구버전 메타패키지, `@remix-run/*` 만 사용)

**추가**:
- `@remix-run/dev` (^2.17.4) — devDep
- `@remix-run/serve` (^2.17.4) — start 스크립트용

**수정**:
- `typescript`: `^6.0.3` → `^5.4.0` (존재하는 안정 버전)

**스크립트**:
- `"start": "remix-serve build/index.js"` 유지
- `"build": "remix build"` 유지
- `"dev": "remix dev"` 유지

### 3. remix.config.js 활성화
```js
export default {
  appDirectory: "src",
  ignoredRouteFiles: ["**/*.css"],
};
```
`src/`를 Remix appDirectory로 명시. (대안: `src/`를 `app/`으로 이름 바꾸기 — 더 표준이지만 import 경로 영향 큼. 일단 appDirectory 옵션 사용 선호.)

### 4. tsconfig.json 정리
- `importsNotUsedAsValues` 제거 (deprecated)
- `verbatimModuleSyntax: true` 유지 — 이 옵션이 type-only import 강제
- `paths` 추가 — `~/*` alias가 routes 코드에서 사용 중인데 tsconfig에 미정의:
  ```json
  "paths": { "~/*": ["./src/*"] }
  ```
- `include` 에 `remix.env.d.ts` 추가 (Remix 타입 정의)

### 5. entry.server.tsx 재작성
표준 Remix v2 템플릿으로 교체. 주요 변경:
- `renderToPipeableStream` 을 `react-dom/server` 에서 import
- `handleRequest` 의존 제거 (직접 `Response` 반환)
- `isbot` 으로 봇/브라우저 분기 (이미 dep에 있음)

### 6. 추가 산출물
- `remix.env.d.ts` — Remix 타입 참조 (`/// <reference types="@remix-run/dev" />` 등)
- `.gitignore` — `build/`, `public/build/`, `.cache/` (현재 파일 존재 여부 확인 후)

### 7. 검증
1. `rm -rf node_modules package-lock.json` (사용자 확인 후)
2. `npm install`
3. `npm run type-check` — 0 에러 확인
4. `npm run dev` — `http://localhost:3000` 에 스플래시 화면 뜨는지 확인
5. 스플래시 → 웰컴 자동 전환 확인
6. `/terms`, `/profile`, `/music`, `/mypage` 직접 접근 확인

---

## ⚠️ 주의 사항 & 미해결 질문

1. **node_modules 재설치 vs 증분 설치**: 현재 lock 파일이 vite 기준이므로 lock 삭제 후 재설치 권장. 시간이 더 걸리지만 안정적.
2. **`appDirectory: "src"` vs `src/ → app/ 이름 변경`**: 표준은 후자. 다만 사용자 즐겨찾기·외부 참조 영향 최소화 위해 옵션 방식 채택. 추후 표준화하려면 별도 plan.
3. **react-router-dom 제거 시 영향**: `routes/` 코드는 `@remix-run/react` 의 `Link`, `useNavigate` 사용 중 → **영향 없음** (확인 완료).
4. **index.css 내용**: 아직 확인 안 함. 삭제 전 globals.css 와 비교 필요.
5. **이 plan은 UI/기능을 건드리지 않는다**. mypage 보더 버그, music 카드 누락, StatusBar 이모지 등은 모두 **다음 plan에서**.

---

## ✅ 체크리스트

### 사전 확인
- [x] [src/index.css](src/index.css) 내용 확인 → globals.css와 중복, 안전 삭제
- [x] `.gitignore` 존재 여부 확인 → 존재, Remix 항목 추가
- [x] 사용자가 `node_modules` 삭제 동의

### 파일 변경
- [x] [src/App.tsx](src/App.tsx) 삭제
- [x] [src/main.tsx](src/main.tsx) 삭제
- [x] [index.html](index.html) 삭제
- [x] [vite.config.ts](vite.config.ts) 삭제
- [x] [src/index.css](src/index.css) 삭제 (globals.css 와 중복)
- [x] [src/vite-env.d.ts](src/vite-env.d.ts) 삭제 (추가 감지된 잔재)
- [x] [package.json](package.json) 의존성·typescript 버전 정리
- [x] [remix.config.js](remix.config.js) appDirectory 활성화
- [x] [tsconfig.json](tsconfig.json) paths/option 정리
- [x] [src/entry.server.tsx](src/entry.server.tsx) 재작성
- [x] [remix.env.d.ts](remix.env.d.ts) 추가

### 검증
- [x] `npm install` 성공 (586 packages)
- [x] `npm run type-check` 0 에러
- [x] `npm run dev` 부팅 성공 (build 11.8s)
- [x] 스플래시(/) → 200, 웰컴(/welcome) → 200 + 한글 콘텐츠 확인
- [x] /terms, /profile, /music, /mypage 모두 200 응답

---

## 📊 예상 소요

- 파일 변경: 15분
- npm install: 3-5분
- type-check + 동작 확인: 10분
- **총**: 약 30분

---

## 🚀 구현 순서

1. 사전 확인 (index.css, .gitignore)
2. 설정 파일 3종 수정 (package.json, remix.config.js, tsconfig.json)
3. entry.server.tsx 재작성 + remix.env.d.ts 추가
4. 레거시 파일 5종 삭제
5. node_modules·lock 재설치
6. type-check
7. dev 서버 부팅 + 라우트 확인
