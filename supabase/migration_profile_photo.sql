-- 프로필 사진(얼굴) — 본인 인증(입구컷) + 매칭 후 상대에게만 공개.
-- 설계: 탐색/매칭은 음악 취향으로만. 사진은 ① 운영팀 수동 검수용 ② 매칭 성사 후 공개.
-- 비공개 버킷 'profile-photos' 에 경로만 저장(profiles.photo_url). public URL 없음.
--   - 본인: 자기 폴더(user_id/...) 안에서만 업로드/조회/수정/삭제.
--   - 상대 공개: 서버(service_role)가 활성 매칭을 확인한 뒤 서명 URL 발급 → RLS 단순 유지.
--
-- 적용: Supabase SQL Editor 에 붙여넣고 Run. (또는 npm run db:apply -- supabase/migration_profile_photo.sql)

-- 1) 컬럼: 비공개 버킷 내 객체 "경로"를 저장(예: <user_id>/169..._face.webp).
alter table public.profiles
  add column if not exists photo_url text;

-- 2) 비공개 버킷 생성(이미 있으면 무시).
insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', false)
on conflict (id) do nothing;

-- 3) 스토리지 RLS — 객체 경로 첫 폴더(user_id)가 본인일 때만 허용.
--    chat-images 와 동일하게 owner 스코프. 상대 열람은 서버 서명 URL 로만.
drop policy if exists "profile_photos_owner_select" on storage.objects;
create policy "profile_photos_owner_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "profile_photos_owner_insert" on storage.objects;
create policy "profile_photos_owner_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "profile_photos_owner_update" on storage.objects;
create policy "profile_photos_owner_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "profile_photos_owner_delete" on storage.objects;
create policy "profile_photos_owner_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
