# Plan — 음악 선택 페이지 + Melona API 통합

> 작성일: 2026-05-21
> 범위: **장르 선택 후 곡을 직접 고르는 신규 페이지 + Melona(비공식 멜론) 검색 API 연동**
> 시리즈 갱신: plan_03 (Supabase+인증+프로필) → **plan_04 (이번, 음악 선택)** → plan_05 (매칭+채팅) → plan_06 (결제+배포)
> 워크플로우 단계: Step 2 (Plan). **확정 전까지 구현 금지**.
> 참고: [research.md](research.md) §8

---

## 🎯 목표

스크린샷 3장 기반으로 **곡 선택 페이지**를 추가하고, 검색·추천 데이터를 Melona 라이브러리로 가져온다.

**성공 기준**:
- `/genre` 선택 완료 → `/music-select` 진입
- 검색창에 "초록을" 입력 → 멜론 검색 결과 자동완성으로 노출
- 검색 결과 클릭 → 선택된 곡 카드로 변환 (빨강 테두리)
- 최대 **3개**까지 선택 가능 (4번째 시 안내 또는 비활성)
- 각 카드 X 버튼 → 선택 해제
- 추천 리스트는 멜론 차트 상위 곡으로 표시
- 1곡 이상 선택 시 "매칭하러 가기" 활성 → `/music` (매칭 결과) 이동

---

## 🔀 사용자 흐름 변경

**기존**: `/genre` → `/music` (매칭)
**변경 후**: `/genre` → `/music-select` (NEW) → `/music` (매칭)

| 라우트 | 역할 | 상태 |
|--------|------|------|
| `/genre` | 장르 다중 선택 | 기존 유지, "지금하기" → `/music-select` 로 변경 |
| `/music-select` | **음악 검색·선택 (최대 3개)** | **신규** |
| `/music` | 매칭 결과 | 기존 유지 |

---

## 📦 Phase A: Melona 패키지 도입

### A.1 설치
```bash
npm install melona
```

### A.2 동작 환경 검증 사항
- Node 18+ 필요 (확인됨, package.json engines)
- 서버 전용. 브라우저 import 금지 → CORS·번들 크기 문제
- 서버 환경 변수 추가 불필요 (인증 X)

### A.3 안정성 / 백업 전략
- Melona는 비공식 스크래핑 라이브러리 → 멜론 사이트 구조 변경 시 깨질 위험
- 모든 호출에 try/catch + fallback (정적 추천 리스트) 마련
- 차트 결과 서버 메모리 5분 캐시 (멜론 부하 줄이고 자체 응답 빠르게)
- 검색은 캐시 X (사용자 입력별로 다름)

---

## 🛠️ Phase B: Remix Resource Routes (서버 API)

Remix Resource Route 패턴 — 컴포넌트 export 없이 loader 만 두면 JSON API로 작동.

### B.1 `routes/api.melon.search.tsx`
- GET `?q=초록을`
- loader 에서 `melonSearch.searchSong({ query, section: SONG })`
- 응답: `{ items: [{ songNo, title, artist, album }, ...] }` (상위 10개)
- 빈 query 또는 2자 미만이면 빈 배열
- 에러 시 500 + `{ error }`

### B.2 `routes/api.melon.chart.tsx`
- GET (파라미터 없음)
- loader 에서 `melonChart.getChart()` 호출 (캐시 우선)
- 응답: `{ items: [{ rank, songNo, title, artist, album, albumImg }, ...] }` 상위 30개
- 서버 메모리 LRU 또는 `Map<string, { data, expiresAt }>` 5분 캐시

### B.3 (선택) `routes/api.melon.new.tsx`
- GET — `melonNewMusic.getTable()` 최신 50곡
- 추천 fallback 또는 보조 노출
- **MVP에서는 차트만 사용하고 신규음악은 추후 plan으로**

### B.4 캐시 모듈 `lib/melona-cache.server.ts`
- 간단한 메모리 캐시 (Map)
- key: "chart" → value: { data, expiresAt }
- expiresAt 지나면 다시 페치
- 서버 인스턴스 재시작 시 자연 만료

---

## 🎨 Phase C: `/music-select` 페이지

### C.1 라우트 파일 `routes/music-select.tsx`

**구조** (스크린샷 3장 기반):

```
StatusBar
PhoneFrame
├ 헤더 (right X 닫기 버튼)
├ "OO님의 음악을 선택해주세요!" (Bold 28px, "음악" 부분 #ff625d)
├ 서브: "회원님을 소개할 수 있는 음악을 선택해주세요." (Body 16 helper)
│
├ [Mode A] 선택된 곡 0개:
│   ├ 검색 input (음표 아이콘 + "노래를 선택해주세요." placeholder)
│   ├ "노래 선택이 어려우시다면?" 작은 링크 (우측 정렬)
│   ├ "추천 리스트" 헤드 (Bold 16)
│   └ 추천 카드 N개 (앨범 이미지 + 제목 + 아티스트)
│
├ [Mode B] 검색어 입력 중:
│   ├ 검색 input (값 보존)
│   ├ 자동완성 dropdown 박스 (라운드, 결과 리스트)
│   │  └ 각 row: 제목 / 아티스트 (구분선)
│   └ 추천 리스트 숨김
│
├ [Mode C] 곡 선택됨 (1~3개):
│   ├ 선택된 곡 카드 (빨강 테두리, 음표 아이콘 + 제목 - 아티스트, X 버튼)
│   ├ 카드 아래 다시 검색 input (3개 미만일 때만)
│   └ 추천 리스트 표시 (필요 시)
│
└ CTA "매칭하러 가기" (1개 이상 선택 시 활성)
```

### C.2 컴포넌트 분리

신규 컴포넌트:
- `components/SongSearchInput.tsx`
  - 검색 input (회색 라운드 + 음표 아이콘)
  - 디바운스 300ms
  - props: `value, onChange, onSelect(song)`
- `components/SongDropdown.tsx`
  - 검색 결과 리스트 (라운드 박스, 행 + 구분선)
  - 빈 결과/로딩 상태
- `components/SelectedSongCard.tsx`
  - 빨강 테두리 카드 (음표 + 제목/아티스트 + X)
- `components/RecommendedSongCard.tsx`
  - 추천 리스트 카드 (앨범 이미지 + 제목 + 아티스트)

### C.3 클라이언트 데이터 호출

```typescript
// useFetcher 또는 fetch 직접
const res = await fetch(`/api/melon/search?q=${encodeURIComponent(query)}`);
const { items } = await res.json();
```

- 디바운스: lodash 의존성 추가하지 않고 자체 `useDebouncedValue` 훅 작성
- 추천 리스트: 페이지 마운트 시 `/api/melon/chart` 한 번 호출 (loader 에서 처리 가능)

### C.4 loader 활용 (SSR)

- `routes/music-select.tsx` loader 에서 차트 추천 데이터 prefetch
- 첫 진입 시 즉시 추천 리스트 노출 (FCP 빠름)
- 검색은 클라이언트 fetcher 패턴

### C.5 선택 상태 관리

- 로컬 state: `selectedSongs: Song[]` (최대 3개)
- sessionStorage 에 임시 저장 (`song-draft`) — 페이지 새로고침 대응
- "매칭하러 가기" 클릭 시 sessionStorage 유지 (다음 plan DB 저장 단계에서 commit)

### C.6 엣지 케이스 처리

| 케이스 | 동작 |
|--------|------|
| 검색 결과 0개 | "검색 결과가 없습니다" 안내 |
| 같은 곡 중복 선택 시도 | 알림 또는 무시 |
| 4번째 선택 시도 | "최대 3곡까지 선택할 수 있어요" 토스트 |
| API 호출 실패 | "잠시 후 다시 시도해주세요" + 추천 리스트는 정적 fallback |
| 네트워크 느림 | 로딩 인디케이터 (검색 input 우측 스피너) |

---

## 🔗 Phase D: 라우팅 연결

### D.1 `routes/genre.tsx` 수정
- "지금하기" 버튼 → `navigate("/music-select")` 로 변경 (현재 `/music`)
- 선택된 장르를 다음 페이지로 전달:
  - sessionStorage `genre-draft` 키
  - 또는 URL search param (`?g=indie,kpop`)

### D.2 `routes/music-select.tsx` → `/music` 이동
- "매칭하러 가기" 클릭 시 선택된 곡을 sessionStorage 에 commit
- `navigate("/music")` (매칭 결과 페이지)

### D.3 `routes/music.tsx` 데이터 표시 (선택)
- 선택된 곡 데이터 활용해 매칭 카드 내용 동적 갱신
- 또는 기존 mock 유지 — 추후 plan_05 매칭에서 다룸

---

## 💾 Phase E: DB 영속화 (plan_03 의존)

> ⚠️ Supabase 통합은 plan_03 완료 후 적용. 이번 plan_04 에서는 sessionStorage 까지만.

### E.1 새 테이블 `user_songs` (plan_05 또는 plan_03 보강에서 추가)
```sql
create table public.user_songs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  song_no int not null,        -- melon song id
  title text not null,
  artist text not null,
  album text,
  album_img text,
  selected_at timestamptz default now()
);

-- 최대 3개 제약
create or replace function check_user_song_limit()
returns trigger as $$
begin
  if (select count(*) from public.user_songs where user_id = new.user_id) >= 3 then
    raise exception '최대 3곡까지만 선택할 수 있습니다.';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger user_song_insert_limit
  before insert on public.user_songs
  for each row execute function check_user_song_limit();
```

### E.2 RLS
- 본인 곡만 read/insert/delete

### E.3 이번 plan_04 에서 안 할 것
- DB 저장 (plan_03 인증 완료 후 다음 plan 에서)
- 멜론 매칭 알고리즘 (plan_05)
- 음악 미리듣기 (멜론은 라이선스 이슈로 음원 직접 제공 X. 추후 YouTube/Spotify 검색 링크 등 고려)

---

## 🧪 Phase F: 검증

### F.1 자동
- [ ] `npm run type-check` 0 에러
- [ ] `npm run dev` 부팅
- [ ] `/music-select` 200 응답

### F.2 수동 시나리오
- [ ] `/genre` 에서 장르 선택 → "지금하기" → `/music-select` 진입
- [ ] 페이지 첫 진입 시 추천 리스트 노출 (멜론 차트 N개)
- [ ] 검색창에 "초록을" 입력 → 300ms 후 자동완성 dropdown 노출
- [ ] dropdown 항목 클릭 → 선택된 곡 카드 (빨강 테두리) + 검색창 비움
- [ ] 동일 곡 재선택 시 차단
- [ ] 카드 X 버튼 → 선택 해제
- [ ] 3곡 선택 후 4번째 시도 → 안내
- [ ] "매칭하러 가기" 활성 → `/music` 이동
- [ ] 새로고침 후 선택 상태 유지 (sessionStorage)
- [ ] 네트워크 끊고 검색 → 에러 메시지

### F.3 회귀
- [ ] 기존 페이지들 (welcome/signup/login/terms/profile/genre/music/chat/mypage) 정상 동작
- [ ] BottomNav 모든 탭 정상

---

## ⚠️ 주의 & 가정

1. **Melona 안정성**: 비공식 라이브러리 → 멜론 사이트 개편 시 깨질 위험. 깨질 경우 fallback (정적 추천 30곡 JSON) 준비.
2. **앨범 이미지**: 검색 결과에는 없음 → 음표 아이콘으로 대체. 추천 리스트는 차트 응답의 `albumImg` 사용.
3. **장르 필터링**: Melona 에 장르 필터 API 없음. 추천은 차트 무차별. 추후 장르명을 검색 키워드로 추가하는 방식 검토.
4. **음악 미리듣기 / 30초 샘플**: 멜론 직접 제공 X. MVP 범위 외.
5. **저작권**: 곡 메타데이터 표시만 (제목·아티스트). 음원 재생 없음 → 저작권 안전.
6. **rate limit**: 멜론 측 정책 미공개 → 캐싱 + 서버 디바운스로 보수적 호출.
7. **CORS**: 브라우저 직접 호출 불가 → 모든 요청 우리 서버 거침 (장점: 멜론 키 노출 0, 단점: 우리 서버 부하).
8. **테스트 환경**: Melona 호출이 외부 의존성이라 dev 머신 인터넷 필요.

---

## ✅ 체크리스트

### 패키지·설정
- [ ] `npm install melona`
- [ ] Node 18+ 확인 (이미 OK)

### Resource Routes
- [ ] `routes/api.melon.search.tsx`
- [ ] `routes/api.melon.chart.tsx`
- [ ] `lib/melona-cache.server.ts`

### UI
- [ ] `components/SongSearchInput.tsx`
- [ ] `components/SongDropdown.tsx`
- [ ] `components/SelectedSongCard.tsx`
- [ ] `components/RecommendedSongCard.tsx`
- [ ] `routes/music-select.tsx`
- [ ] `lib/useDebouncedValue.ts`
- [ ] `lib/song-selection.ts` (sessionStorage 헬퍼)

### 라우팅
- [ ] `routes/genre.tsx` "지금하기" 대상 변경
- [ ] `routes/music.tsx` (선택) 선택된 곡 표시

### 검증
- [ ] F.1, F.2, F.3 모두 통과

---

## 📊 예상 소요

| Phase | 소요 |
|-------|------|
| A. melona 설치·설정 | 10분 |
| B. Resource Routes 2개 + 캐시 | 30분 |
| C. /music-select UI + 컴포넌트 4종 | 1.5시간 |
| D. 라우팅 연결 | 15분 |
| F. 검증 | 20분 |
| **총** | **약 2.5시간** |

---

## 🚀 구현 순서

1. `npm install melona`
2. Resource Route + 캐시 모듈 (서버 측 동작 확인 — `curl /api/melon/search?q=윤하`)
3. UI 컴포넌트 4종
4. `/music-select` 페이지 조합
5. 라우팅 연결
6. F.2 시나리오 수동 검증
7. type-check / dev 부팅 / 회귀 확인

---

## 📌 의사결정 로그 (2026-05-21 확정)

| 항목 | 결정 |
|------|------|
| 추천 리스트 데이터·개수 | **차트 상위 5개 고정** (스크린샷 일치) |
| 추천 카드 클릭 시 동작 | **즉시 선택** (탭 한 번으로 선택 카드 변환) |
| 음표 아이콘 | **SVG inline** (컴포넌트 안에 직접 렌더) |
| Melona 실패 시 fallback | **정적 추천 30곡 JSON** (`lib/song-fallback.json` 준비) |

### Fallback JSON 작성 기준
- 30곡 모두 한국 인기곡 (장르 분산: 발라드/락/K-POP/인디/팝/R&B 각 5곡)
- 멜론 차트 자주 등장하는 곡 위주 (저작권 메타데이터만, 음원 X)
- 차트 호출 실패 시 정적 JSON 사용 + 로깅
- 정적 JSON 도 `albumImg` 필드는 외부 URL 대신 우리가 가진 음표 SVG placeholder 로 통일
