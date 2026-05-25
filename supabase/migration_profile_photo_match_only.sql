-- 프로필 사진 공개 정책을 "매칭 후 공개"로 통일.
--
-- 배경: 사진 업로드(#62)는 'authenticated_read'로 모든 승인회원이 탐색/멤버상세에서
-- 서로의 사진을 볼 수 있게 배포됐다. 제품 방향은 "음악 취향으로 매칭 → 매칭된 상대에게만
-- 사진 공개"이므로, 스토리지 읽기를 본인 전용으로 좁히고 상대 열람은 서버(service_role)가
-- 활성 매칭을 확인한 뒤 서명 URL로만 발급한다(app: /api/member-photo).
--
-- 적용: Supabase SQL Editor 에 붙여넣고 Run. idempotent.

-- 1) 광범위 읽기 정책 제거 — 본인 폴더 전용(profile_photos_owner_select)만 남긴다.
drop policy if exists "profile_photos_authenticated_read" on storage.objects;

-- 2) 본인 전용 읽기 정책 보장(없으면 생성).
drop policy if exists "profile_photos_owner_select" on storage.objects;
create policy "profile_photos_owner_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 3) 중복 컬럼 정리 — photo_path(#62) 로 단일화. photo_url 은 폐기.
alter table public.profiles
  drop column if exists photo_url;
