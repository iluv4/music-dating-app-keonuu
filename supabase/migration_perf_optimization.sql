-- ============================================================
-- 성능 최적화 (Supabase performance advisor 대응) — DB 에 이미 적용됨
-- 1) FK 커버링 인덱스
-- 2) RLS initplan: auth.uid() → (select auth.uid()) (행당 재평가 방지, 로직 동일)
-- ============================================================

-- 1) FK 커버링 인덱스
create index if not exists matches_ended_by_idx     on public.matches  (ended_by);
create index if not exists messages_sender_idx      on public.messages (sender_id);
create index if not exists profiles_approved_by_idx on public.profiles (approved_by);

-- 2) RLS initplan 최적화 (auth.uid() 를 서브쿼리로 감싸 1회 평가)
alter policy "Users read own matches" on public.matches
  using (((select auth.uid()) = user_a) or ((select auth.uid()) = user_b));

alter policy "Users send messages in own active match" on public.messages
  with check (
    (sender_id = (select auth.uid()))
    and exists (select 1 from matches m
      where m.id = messages.match_id
        and ((m.user_a = (select auth.uid())) or (m.user_b = (select auth.uid())))
        and m.status = 'active'));

alter policy "Users read messages in own match" on public.messages
  using (exists (select 1 from matches m
    where m.id = messages.match_id
      and ((m.user_a = (select auth.uid())) or (m.user_b = (select auth.uid())))));

alter policy "Users update read_at on received messages" on public.messages
  using ((sender_id <> (select auth.uid()))
    and exists (select 1 from matches m
      where m.id = messages.match_id
        and ((m.user_a = (select auth.uid())) or (m.user_b = (select auth.uid())))));

alter policy "notifications_select_own" on public.notifications
  using ((select auth.uid()) = user_id);
alter policy "notifications_update_own" on public.notifications
  using ((select auth.uid()) = user_id);

alter policy "Users insert own profile" on public.profiles
  with check ((select auth.uid()) = user_id);
alter policy "Users read own or matched profile" on public.profiles
  using (((select auth.uid()) = user_id)
    or exists (select 1 from matches m
      where ((m.user_a = (select auth.uid())) and (m.user_b = profiles.user_id))
         or ((m.user_b = (select auth.uid())) and (m.user_a = profiles.user_id))));
alter policy "Users update own profile (non-approval fields)" on public.profiles
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

alter policy "Users delete own songs" on public.user_songs
  using ((select auth.uid()) = user_id);
alter policy "Users insert own songs" on public.user_songs
  with check ((select auth.uid()) = user_id);
alter policy "Users read own songs" on public.user_songs
  using ((select auth.uid()) = user_id);
</content>
