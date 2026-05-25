-- ============================================================
-- 프로필 사진 (추가 전용)
-- Supabase Dashboard → SQL Editor 에서 실행. idempotent.
--
-- 구성: 1) profiles.photo_path 컬럼  2) profile-photos 스토리지 버킷
--       3) 스토리지 RLS 정책(읽기 인증, 쓰기 본인 폴더만)
--       4) get_member_detail / list_discover_members 에 photo_path 추가
-- ============================================================

-- 1) 프로필 사진 경로 컬럼 -------------------------------------
-- 비공개 버킷의 "경로"만 저장 (public URL 없음). 렌더 시 서명 URL 생성.
alter table public.profiles
  add column if not exists photo_path text;

-- 2) 스토리지 버킷 (비공개) ------------------------------------
insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', false)
on conflict (id) do update set public = false;

-- 3) 스토리지 RLS 정책 ----------------------------------------
-- 읽기: 인증 사용자 (승인 회원이 서로의 프로필 사진을 서명 URL 로 봄).
drop policy if exists "profile_photos_authenticated_read" on storage.objects;
create policy "profile_photos_authenticated_read"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'profile-photos');

-- 쓰기/수정/삭제: 본인 폴더(`{auth.uid()}/...`) 안에서만.
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
  );

drop policy if exists "profile_photos_owner_delete" on storage.objects;
create policy "profile_photos_owner_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 4) 멤버 상세 RPC — photo_path 추가 --------------------------
create or replace function public.get_member_detail(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me_approved boolean;
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'unauthorized';
  end if;

  select is_approved into v_me_approved
  from public.profiles where user_id = auth.uid();
  if not coalesce(v_me_approved, false) then
    raise exception 'not approved';
  end if;

  select jsonb_build_object(
    'user_id', p.user_id,
    'name', p.name,
    'school', p.school,
    'gender', p.gender::text,
    'photo_path', p.photo_path,
    'songs', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'songNo', us.song_no,
          'title', us.title,
          'artist', us.artist,
          'album', us.album,
          'albumImg', us.album_img
        ) order by us.selected_at
      )
      from public.user_songs us
      where us.user_id = p.user_id
    ), '[]'::jsonb)
  ) into v_result
  from public.profiles p
  where p.user_id = p_user_id and p.is_approved;

  if v_result is null then
    raise exception 'member not found';
  end if;
  return v_result;
end;
$$;

grant execute on function public.get_member_detail(uuid) to authenticated;

-- 5) 탐색 목록 RPC — photo_path 추가 --------------------------
-- 반환 컬럼 변경이므로 drop 후 재생성 (return type 변경은 create or replace 불가).
drop function if exists public.list_discover_members(uuid);
create function public.list_discover_members(p_user_id uuid)
returns table (
  user_id    uuid,
  name       text,
  school     text,
  gender     text,
  photo_path text,
  song_count bigint
)
language sql
security definer
set search_path = public
as $$
  select p.user_id, p.name, p.school, p.gender::text, p.photo_path,
         count(us.id) as song_count
  from public.profiles p
  left join public.user_songs us on us.user_id = p.user_id
  where p.is_approved
    and p.user_id <> p_user_id
  group by p.user_id, p.name, p.school, p.gender, p.photo_path
  order by random()
  limit 20;
$$;

grant execute on function public.list_discover_members(uuid) to authenticated;
revoke execute on function public.list_discover_members(uuid) from public, anon;
