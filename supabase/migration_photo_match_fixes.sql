-- ============================================================
-- 사진 메시지 + 매칭 전공 제외 수정 (Supabase 에 이미 적용됨)
-- ============================================================

-- 1) 사진 전용 메시지 허용
-- 기존 messages_content_check 가 content 길이>=1 을 강제해 사진(빈 content) 메시지가
-- 400 으로 거부됐음 → 이미지가 있으면 content 비어도 허용.
alter table public.messages drop constraint if exists messages_content_check;
alter table public.messages add constraint messages_content_check
  check (
    char_length(content) <= 2000
    and (char_length(content) >= 1 or image_url is not null)
  );

-- 2) 매칭에서 같은 전공 제외 (find_or_create_match 후보 조건에 추가)
--    후보 WHERE 절에 다음 조건 추가됨:
--    and (v_me.major is null or p.major is null
--         or lower(btrim(p.major)) <> lower(btrim(v_me.major)))
--    (전체 함수 정의는 match_exclude_same_major 마이그레이션 참조)
--    동아리 제외는 profiles 에 동아리(club) 컬럼 추가 후 동일 패턴으로 가능.
</content>
