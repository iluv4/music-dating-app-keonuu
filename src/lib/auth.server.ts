import { redirect } from "@remix-run/node";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "~/lib/supabase.server";
import { getProfileFields } from "~/lib/repos/profiles.server";
import { countUserSongs } from "~/lib/repos/user-songs.server";
import { getMatchWithPartner } from "~/lib/repos/matches.server";
import type { MatchWithPartner } from "~/lib/db-types";

// 인증 게이트
// - getUser: 세션이 있으면 user, 없으면 null
// - requireUser: 세션 없으면 /login
// - requireApprovedUser: 세션 + 프로필 + is_approved 모두 충족 안 되면 적절한 페이지로
// - requireGuest: 세션 있으면 적절한 페이지로

export async function getUser(request: Request) {
  const { supabase, headers } = createSupabaseServerClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { user, supabase, headers };
}

/**
 * 승인 완료 사용자의 다음 목적지 결정
 * - 곡 1곡 이상 선택 → /music (매칭 화면)
 * - 곡 미선택 → /genre (장르 → 음악 선택 시작점)
 */
export async function postApprovalDestination(
  supabase: SupabaseClient,
  userId: string,
): Promise<"/music" | "/genre"> {
  const count = await countUserSongs(supabase, userId);
  return count > 0 ? "/music" : "/genre";
}

export async function requireUser(request: Request) {
  const ctx = await getUser(request);
  if (!ctx.user) {
    throw redirect("/login", { headers: ctx.headers });
  }
  return ctx as {
    user: NonNullable<typeof ctx.user>;
    supabase: typeof ctx.supabase;
    headers: typeof ctx.headers;
  };
}

/**
 * 매칭·채팅 등 핵심 기능 접근 게이트.
 * - 로그인 안 됨 → /login
 * - 프로필 없음 → /profile/basic
 * - 프로필 있고 미승인 → /waiting
 * - 승인 완료 → 통과
 */
export async function requireApprovedUser(request: Request) {
  const ctx = await requireUser(request);
  const profile = await getProfileFields(ctx.supabase, ctx.user.id, [
    "user_id",
    "is_approved",
  ]);

  if (!profile) {
    throw redirect("/profile/basic", { headers: ctx.headers });
  }

  if (!profile.is_approved) {
    throw redirect("/waiting", { headers: ctx.headers });
  }

  return ctx;
}

/**
 * 채팅방 접근 게이트.
 * - 로그인 필수
 * - 미승인(승인대기) 사용자는 채팅 접근 불가 → /waiting
 * - matchId 가 본인 참여 매칭이어야 함 (RLS 가 1차 차단, 여기서 명시적으로 확인)
 */
export async function requireMatchAccess(
  request: Request,
  matchId: string,
): Promise<{
  user: { id: string; email?: string };
  supabase: SupabaseClient;
  headers: Headers;
  match: MatchWithPartner;
}> {
  const ctx = await requireApprovedUser(request);
  const match = await getMatchWithPartner(
    ctx.supabase,
    matchId,
    ctx.user.id,
  );
  if (!match) {
    throw redirect("/chat", { headers: ctx.headers });
  }
  return { ...ctx, match };
}

/**
 * 게스트 미리보기 허용 게이트.
 * - 비로그인 → { guest: true } (호출 측에서 샘플 데이터로 미리보기 렌더)
 * - 로그인 → requireApprovedUser 와 동일하게 프로필/승인 검사 후 통과
 *   (미가입·미승인 로그인 사용자는 기존처럼 /profile/basic·/waiting 으로 리다이렉트)
 */
export async function approvedUserOrGuest(request: Request) {
  const ctx = await getUser(request);
  if (!ctx.user) {
    return {
      guest: true as const,
      user: null,
      supabase: ctx.supabase,
      headers: ctx.headers,
    };
  }

  const profile = await getProfileFields(ctx.supabase, ctx.user.id, [
    "user_id",
    "is_approved",
  ]);
  if (!profile) {
    throw redirect("/profile/basic", { headers: ctx.headers });
  }
  if (!profile.is_approved) {
    throw redirect("/waiting", { headers: ctx.headers });
  }

  return {
    guest: false as const,
    user: ctx.user,
    supabase: ctx.supabase,
    headers: ctx.headers,
  };
}

export async function requireGuest(request: Request) {
  const ctx = await getUser(request);
  if (ctx.user) {
    const profile = await getProfileFields(ctx.supabase, ctx.user.id, [
      "is_approved",
    ]);

    if (!profile) {
      throw redirect("/profile/basic", { headers: ctx.headers });
    }
    if (!profile.is_approved) {
      throw redirect("/waiting", { headers: ctx.headers });
    }
    const dest = await postApprovalDestination(ctx.supabase, ctx.user.id);
    throw redirect(dest, { headers: ctx.headers });
  }
  return ctx;
}
