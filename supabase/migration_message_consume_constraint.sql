-- ============================================================
-- 메시지 소비(삭제/펑 소멸/한 번만 보기 열람) 시 본문·이미지 동시 비우기 허용
-- Supabase Dashboard → SQL Editor 에서 실행. idempotent (재실행 안전).
--
-- 배경:
--   messages_content_check 는 "본문이 1자 이상이거나 image_url 이 있어야 한다"를
--   강제한다. 신규 메시지 검증용으로는 옳지만, soft delete / 펑 소멸 / 한 번만 보기
--   열람은 content='' + image_url=null 로 비우므로 UPDATE 가 제약에 막혀 실패했다.
--   → 삭제/열람 처리가 조용히 롤백되어 "한 번만 보기" 사진이 계속 열렸다(버그).
--
-- 수정: deleted_at 또는 viewed_at 이 기록된(=이미 소비된) 행은 본문·이미지가
--       모두 비어도 허용. 살아있는 메시지에 대한 검증은 그대로 유지.
-- ============================================================

alter table public.messages
  drop constraint if exists messages_content_check;

alter table public.messages
  add constraint messages_content_check check (
    char_length(content) <= 2000
    and (
      char_length(content) >= 1
      or image_url is not null
      or deleted_at is not null
      or viewed_at is not null
    )
  );
