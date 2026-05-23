-- ============================================================
-- 멤버 상세 (탐색 → 프로필 클릭 시 그 사람 프로필 + 선택 곡)
-- profiles/user_songs RLS 는 본인/매칭상대만 → SECURITY DEFINER 로 우회.
-- 요청자·대상 모두 승인 회원일 때만 반환. (Supabase 에 이미 적용됨)
-- ============================================================
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
