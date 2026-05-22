# 트래킹 구현 가이드 — PostHog (posthog-js) on Remix

대상 SDK: `posthog-js` (이미 설치·스캐폴딩됨). 래퍼: `src/lib/analytics.client.ts` (`capture`, `identify`, `initAnalytics`).
키 미설정 시 전부 no-op이라 안전. 모든 이벤트는 **클라이언트**에서 발생(Remix loader/action은 서버라 직접 capture 불가 — 클라 컴포넌트에서 호출).

## 0. 사전 — 래퍼에 length_bucket 헬퍼 (선택)
`message.sent`의 `length_bucket` 등 파생값은 호출부에서 계산:
```ts
const bucket = (n: number) => (n < 20 ? "short" : n < 100 ? "medium" : "long");
```

## 1. Identity (최우선 — 현재 전무)
가입/로그인 후 사용자를 식별해야 퍼널·리텐션 분석이 됨. PII 정책 `traits_only`라 name만 트레잇, 이벤트엔 금지.

**위치**: `/music` 같은 인증된 첫 화면 컴포넌트(또는 root에서 user 주입). loader가 user 정보를 내려주고 클라에서 identify.

```tsx
// 예: music.tsx loader가 user 일부를 반환하도록 추가 후
useEffect(() => {
  if (user) {
    identify(user.id, {
      name: user.name,            // pii
      gender: user.gender,
      birth_year: user.birth_year,
      school: user.school,
      is_approved: user.is_approved,
    });
  }
}, [user]);
```
> 주의: loader에서 name/gender 등을 클라로 내려보내면 window 데이터에 PII가 실림. HTTPS이고 본인 데이터라 허용 범위지만, 최소 필드만.

## 2. Lifecycle 이벤트

### user.signed_up / user.logged_in — `auth.callback.tsx`
콜백은 서버 로더라 직접 capture 불가. 패턴: 콜백이 목적지로 redirect할 때 쿼리(`?new=1`)를 붙이고, 도착 페이지 클라에서 capture. 또는 간단히 신규 가입 여부를 profiles 존재로 판정해 `profile.basic` 최초 진입 시 `user.signed_up` capture.
```tsx
// profile.basic.tsx (신규) 또는 도착 페이지
useEffect(() => { capture("user.signed_up", { method }); }, []);
```
`method`는 OAuth provider — Supabase `user.app_metadata.provider`에서 loader가 전달.

### profile.step_completed — `profile.basic|school|payment.tsx`
각 단계 폼 제출 핸들러(또는 action 성공 후 도착)에서:
```tsx
capture("profile.step_completed", { step: "basic" });   // school / payment
```

### profile.completed — `profile.payment.tsx`
입금자명 제출 성공(→ /waiting redirect) 시점. action이 redirect라 도착한 `waiting.tsx`에서:
```tsx
useEffect(() => { capture("profile.completed", { has_school: true }); }, []);
```

## 3. Core Value 이벤트

### genre.selected — `genre.tsx`
장르 선택(또는 "다음") 시:
```tsx
capture("genre.selected", { genre });
```

### song.added / song.removed — `music-select.tsx`
곡 선택/해제 토글 핸들러:
```tsx
capture("song.added", { song_no: song.songNo, source: isFromChart ? "chart" : "search" });
capture("song.removed", { song_no: song.songNo });
```

### match.search_started — `music.tsx` (현 match_search_clicked 대체)
이미 있는 호출의 **이름만 변경**:
```tsx
// 기존: capture("match_search_clicked", { song_count: songs.length })
capture("match.search_started", { song_count: songs.length });
```

### match.created / match.search_no_result — `music.tsx`
action이 redirect(성공) 또는 `{error:null}`(후보 없음)을 반환. 성공은 redirect라 클라에 actionData가 안 남음 → 도착한 `chat.$matchId.tsx`에서 신규 매칭 여부로 capture하거나, action 대신 fetcher로 처리해 응답을 클라에서 받기.
- 후보 없음: `music.tsx`에서 `noCandidate` true 될 때 `capture("match.search_no_result")`.
- 성공: 가장 단순하게는 `chat.$matchId.tsx` 진입 시 `?from=match`면 `capture("match.created", { song_count })`.

### message.sent — `chat.$matchId.tsx` (현 message_sent 대체)
이미 있는 호출 이름 변경 + length_bucket:
```tsx
capture("message.sent", { match_id: matchId, length_bucket: bucket(trimmed.length) });
```

### match.ended — `chat.$matchId.tsx`
`confirmEnd()`에서 submit 직후:
```tsx
capture("match.ended", { match_id: matchId });
```

## 4. Engagement 이벤트

### notification.opened — `notifications.tsx`
알림 `<Link>` onClick:
```tsx
capture("notification.opened", { type: n.type });
```

### discover.viewed — `explore.tsx`
진입 시:
```tsx
useEffect(() => { capture("discover.viewed"); }, []);
```

## 5. 스냅샷 트레잇 동기화 (daily)
`songs_selected_count`, `matches_count`, `has_active_match`는 사용자 행동 없이도 변함 → 정기 동기화 필요.
B2C라 group 대신 user trait. 옵션:
- Supabase scheduled function(pg_cron) + PostHog capture API로 `$set` 호출, 또는
- 사용자가 /music 진입할 때 loader가 count를 계산해 클라 identify의 `$set`으로 갱신(근사). MVP는 후자로 충분.
```tsx
identify(user.id, { songs_selected_count: songs.length, has_active_match: !!match });
```

## 우선순위 (구현 순서)
1. **identify + user.signed_up/logged_in** — 식별 없으면 나머지 이벤트도 익명이라 가치↓
2. **match.created / match.search_no_result** — PRIMARY VALUE + 매칭풀 진단
3. rename 2개 (match.search_started, message.sent) — 즉시, 저비용
4. profile.step_completed / completed — 퍼널 이탈
5. song.added, genre.selected, match.ended, notification.opened, discover.viewed

## 다음 단계
`product-tracking-implement-tracking` 스킬로 실제 코드 생성. 검증은 `product-tracking-audit-current-tracking`.
</content>
