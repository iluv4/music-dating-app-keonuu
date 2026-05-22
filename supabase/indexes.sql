-- ============================================================
-- 권장 인덱스 (추가 전용 — 안전, idempotent)
-- 코드 리뷰 결과 쿼리 필터 기준 누락 인덱스. SQL Editor 에서 실행.
-- 데이터 많을 때 운영 잠금 줄이려면 create index concurrently 고려
-- (단 concurrently 는 트랜잭션 블록 밖에서 개별 실행 필요).
-- ============================================================

-- messages: listMessages / fetchLastMessages / markMessagesRead 전부 match_id + created_at 사용
create index if not exists messages_match_created_idx
  on public.messages (match_id, created_at);

-- matches: listUserMatches 의 or(user_a.eq, user_b.eq) + eq(status)
create index if not exists matches_user_a_idx on public.matches (user_a);
create index if not exists matches_user_b_idx on public.matches (user_b);
create index if not exists matches_status_idx on public.matches (status);

-- user_songs: listUserSongs / countUserSongs / 매칭 곡 비교
create index if not exists user_songs_user_idx on public.user_songs (user_id);
create index if not exists user_songs_song_idx on public.user_songs (song_no);
</content>
