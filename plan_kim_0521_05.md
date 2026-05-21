# Plan — 채팅 기능 (매칭 알고리즘 없이)

> 작성일: 2026-05-21
> 범위: 관리자 수동 매칭 + 1:1 채팅 (Realtime)
> 워크플로우 단계: Step 2 (Plan). **확정 전까지 구현 금지**.
> 참고: [research.md](research.md) §8

---

## 🎯 목표

매칭 알고리즘이 없는 상태에서도 채팅이 동작하는 MVP. 관리자가 Supabase Dashboard 에서 두 사용자를 수동으로 페어링하면, 두 사용자는 채팅 탭에서 서로를 발견하고 대화할 수 있다.

**성공 기준**:
- 관리자가 `matches` 테이블에 row 한 줄 추가 → 두 사용자에게 동시에 채팅방 노출
- 채팅 탭 → 매칭된 상대 리스트 노출
- 채팅방 진입 → 과거 메시지 모두 표시
- 메시지 입력·전송 → DB 저장 + **상대방 화면에 실시간 도착**
- 본인 메시지 우측, 상대 메시지 좌측 (스크린샷 디자인 유지)

---

## 🟢 Phase A — SQL (사용자 수동 실행)

### A.1 `matches` 테이블

```sql
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references auth.users(id) on delete cascade,
  user_b uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  -- user_a < user_b 로 강제해서 (A,B) (B,A) 중복 방지
  constraint matches_user_order check (user_a < user_b),
  constraint matches_unique_pair unique (user_a, user_b)
);

create index matches_user_a_idx on public.matches (user_a);
create index matches_user_b_idx on public.matches (user_b);

alter table public.matches enable row level security;

-- 본인이 참여한 매칭만 조회 가능
create policy "Users read own matches" on public.matches
  for select using (auth.uid() = user_a or auth.uid() = user_b);
```

> 관리자(`service_role`)는 RLS 우회로 자유롭게 row 생성.

### A.2 `messages` 테이블

```sql
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index messages_match_created_idx on public.messages (match_id, created_at);

alter table public.messages enable row level security;

-- 본인이 참여한 매칭의 메시지만 read
create policy "Users read messages in own match" on public.messages
  for select using (
    exists (
      select 1 from public.matches m
      where m.id = messages.match_id
        and (m.user_a = auth.uid() or m.user_b = auth.uid())
    )
  );

-- 본인이 참여한 매칭에만 본인 명의로 insert
create policy "Users send messages in own match" on public.messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.matches m
      where m.id = messages.match_id
        and (m.user_a = auth.uid() or m.user_b = auth.uid())
    )
  );

-- 본인이 받은 메시지의 read_at 만 update 가능
create policy "Users update read_at on received messages" on public.messages
  for update using (
    sender_id != auth.uid()
    and exists (
      select 1 from public.matches m
      where m.id = messages.match_id
        and (m.user_a = auth.uid() or m.user_b = auth.uid())
    )
  );
```

### A.3 Realtime 활성화

Supabase Dashboard → Database → Replication → `public.messages` 테이블 토글 ON.
(없으면 클라이언트 구독이 동작 안 함)

---

## 📦 Phase B — Repo + 타입

### B.1 `db-types.ts` 확장
- `MatchRow`, `MessageRow`, `MessageInsert` 추가
- TODO 주석으로 남겨둔 자리 채우기

### B.2 `repos/matches.server.ts`
- `listUserMatches(supabase, userId)` — 본인 매칭 + 상대방 프로필 같이 join (name, school, gender 정도)
- `getMatch(supabase, matchId, userId)` — 권한 확인 + 매칭 + 상대 프로필
- `getPartnerProfile(supabase, match, currentUserId)` — 헬퍼

### B.3 `repos/messages.server.ts`
- `listMessages(supabase, matchId, limit?)` — 시간순 정렬
- `sendMessage(supabase, matchId, senderId, content)` — insert
- `markRead(supabase, matchId, currentUserId)` — 상대가 보낸 미읽음 메시지 read_at 채움

### B.4 `auth.server.ts` 보강
- `requireMatchAccess(request, matchId)` — 인증 + 승인 + 해당 매칭 참여자 확인 헬퍼

---

## 💬 Phase C — 채팅 리스트 (`/chat`)

### C.1 라우트 파일 정리
- 기존 `routes/chat.tsx` → **삭제**
- `routes/chat._index.tsx` — 채팅 리스트 (NEW)
- `routes/chat.$matchId.tsx` — 채팅방 (NEW, Phase D)

### C.2 `chat._index.tsx` 구성
- 헤더: "채팅" 중앙 정렬
- loader: `listUserMatches` 호출
- 매칭 0개 → 안내 ("아직 매칭이 성사되지 않았어요")
- 매칭 N개 → 각 row:
  - 상대 마스코트 placeholder (또는 분홍 원)
  - 상대 이름
  - 마지막 메시지 미리보기 (있으면)
  - 시간
  - 클릭 → `/chat/$matchId`
- BottomNav active: "chat"

---

## 🗨️ Phase D — 채팅방 (`/chat/$matchId`)

### D.1 loader
- `requireMatchAccess(request, matchId)` 호출
- 상대 프로필 + 메시지 N개(50개) + env(브라우저 클라이언트용) 반환
- `markRead` 호출 (입장 시 상대 메시지 읽음 처리)

### D.2 action — 메시지 전송
- 빈 content 거절
- `sendMessage` → 성공 시 빈 응답 (refetcher 가 알아서)

### D.3 클라이언트 UI
- 헤더: 뒤로가기 + 상대 마스코트 + 상대 이름
- 메시지 리스트:
  - 본인: 우측 정렬, accentSoft 배경
  - 상대: 좌측 정렬, white + 회색 테두리
  - 시간 표시
- 입력 폼: 하단 고정, 송신 시 useFetcher.submit
- 자동 스크롤 bottom

### D.4 Realtime 구독
- root.tsx loader 에서 `env: { SUPABASE_URL, SUPABASE_ANON_KEY }` 노출
- `chat.$matchId.tsx` 클라이언트 useEffect:
  - `supabase.channel(\`messages:${matchId}\`)` 생성
  - `.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: \`match_id=eq.${matchId}\` }, payload => {...})`
  - 새 메시지 도착 → state 에 추가
- 언마운트 시 unsubscribe

---

## 🌐 Phase E — root.tsx env 노출

```typescript
// root.tsx
export async function loader() {
  return json({
    env: {
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    },
  });
}
```

→ window.ENV 로 노출하거나 Context 로 자식에게 전달. 채팅방에서 사용.

---

## 👑 Phase F — 관리자 매칭 생성 가이드

별도 페이지 X. Supabase Dashboard 에서:
1. Authentication → Users 에서 두 사용자 UUID 복사
2. Table Editor → `matches` → Insert row
3. `user_a` = 작은 UUID, `user_b` = 큰 UUID (constraint 때문)
4. Save → 두 사용자 모두 채팅 탭에 매칭 등장

또는 SQL Editor:
```sql
insert into public.matches (user_a, user_b)
select least(a.id, b.id), greatest(a.id, b.id)
from auth.users a, auth.users b
where a.email = 'hong@example.com' and b.email = 'kim@example.com';
```

---

## 🧪 Phase G — 검증

### 자동
- type-check 0 에러
- 모든 라우트 200/302

### 수동
1. 두 계정으로 회원가입·프로필 작성·승인 (관리자 토글)
2. 관리자가 두 계정 매칭 row 생성
3. 양쪽 다 `/chat` 진입 → 매칭 1개 노출 확인
4. 한쪽이 매칭 클릭 → 채팅방 진입 → 메시지 송신
5. 다른 쪽 (다른 브라우저) → 같은 채팅방 진입 → 메시지 보임
6. 새 메시지 송신 → 양쪽 실시간 도착 확인 (Realtime)
7. 한 쪽 페이지 새로고침 → 메시지 영속 확인

---

## ⚠️ 주의 & 가정

1. **매칭 알고리즘 부재**: 관리자가 수동 페어링. 향후 알고리즘 도입 시 자동화.
2. **메시지 페이지네이션**: 초기 50개만 로드. 무한 스크롤은 추후.
3. **이미지·이모지 첨부**: MVP 텍스트만.
4. **타이핑 표시·읽음 표시**: read_at 컬럼은 있으나 UI 표시 안 함 (MVP).
5. **차단·신고**: MVP 외.
6. **푸시 알림**: Realtime 으로 접속 중인 사용자만. 백그라운드 푸시는 PWA + Web Push 추후.

---

## ✅ 체크리스트

### 사용자 작업
- [ ] Phase A.1 `matches` SQL 실행
- [ ] Phase A.2 `messages` SQL 실행
- [ ] Phase A.3 Realtime 활성화 (Dashboard 에서 토글)
- [ ] 테스트용 두 계정 + 매칭 row 1개 준비

### 코드
- [ ] `db-types.ts` 확장
- [ ] `repos/matches.server.ts`
- [ ] `repos/messages.server.ts`
- [ ] `auth.server.ts` `requireMatchAccess`
- [ ] `routes/chat.tsx` 삭제
- [ ] `routes/chat._index.tsx`
- [ ] `routes/chat.$matchId.tsx`
- [ ] `root.tsx` env 노출 + window.ENV
- [ ] 클라이언트 Realtime 구독 동작

### 검증
- [ ] Phase G 수동 시나리오 7단계 통과

---

## 📊 예상 소요

| Phase | 소요 |
|-------|------|
| A. SQL (사용자) | 10분 |
| B. repos/types | 30분 |
| C. 채팅 리스트 | 30분 |
| D. 채팅방 + 폼 + Realtime | 60분 |
| E. root.tsx env | 10분 |
| G. 검증 | 20분 |
| **총** | **약 2.5시간** |

---

## 🚀 구현 순서

1. (사용자) SQL 3개 실행 + Realtime 활성화
2. db-types + repos 확장
3. requireMatchAccess 헬퍼
4. root.tsx env 노출
5. /chat 리스트
6. /chat/$matchId 기본 동작 (loader/action + UI)
7. Realtime 구독 추가
8. 양쪽 브라우저로 수동 검증
