import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Gender,
  MatchRow,
  MatchStatus,
  MatchWithPartner,
} from "~/lib/db-types";

// matches 테이블 접근. RLS 가 적용된 server client 사용.
// matches ↔ profiles 사이 직접 FK 가 없어 PostgREST 의 nested select 미사용.
// matches 한 번 + profiles in() 한 번 = 두 쿼리로 안전하게 처리.

type PartnerProfile = {
  user_id: string;
  name: string;
  school: string;
  gender: Gender | null;
};

type RawMessagePreview = {
  match_id: string;
  content: string;
  created_at: string;
  sender_id: string;
};

async function fetchPartnerProfiles(
  supabase: SupabaseClient,
  userIds: string[],
): Promise<Map<string, PartnerProfile>> {
  const map = new Map<string, PartnerProfile>();
  if (userIds.length === 0) return map;
  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, name, school, gender")
    .in("user_id", userIds)
    .returns<PartnerProfile[]>();
  if (error) {
    console.error("[matches.fetchPartnerProfiles]", error);
    return map;
  }
  for (const p of data ?? []) map.set(p.user_id, p);
  return map;
}

async function fetchLastMessages(
  supabase: SupabaseClient,
  matchIds: string[],
): Promise<Map<string, RawMessagePreview>> {
  const map = new Map<string, RawMessagePreview>();
  if (matchIds.length === 0) return map;
  const { data, error } = await supabase
    .from("messages")
    .select("match_id, content, created_at, sender_id")
    .in("match_id", matchIds)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[matches.fetchLastMessages]", error);
    return map;
  }
  for (const m of (data ?? []) as RawMessagePreview[]) {
    if (!map.has(m.match_id)) map.set(m.match_id, m);
  }
  return map;
}

type ListUserMatchesOptions = {
  status?: MatchStatus | "all";
};

/**
 * 본인이 참여한 매칭 + 상대 프로필 + 가장 최근 메시지.
 * 기본은 status='active' 만 반환.
 */
export async function listUserMatches(
  supabase: SupabaseClient,
  userId: string,
  options: ListUserMatchesOptions = {},
): Promise<MatchWithPartner[]> {
  const status = options.status ?? "active";

  let query = supabase
    .from("matches")
    .select("id, user_a, user_b, created_at, status, ended_at, ended_by")
    .or(`user_a.eq.${userId},user_b.eq.${userId}`)
    .order("created_at", { ascending: false });

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data: rows, error } = await query.returns<MatchRow[]>();

  if (error) {
    console.error("[matches.listUserMatches]", error);
    return [];
  }
  const matches = rows ?? [];

  const partnerIds = matches.map((m) =>
    m.user_a === userId ? m.user_b : m.user_a,
  );
  const matchIds = matches.map((m) => m.id);

  const [partnerMap, lastMsgMap] = await Promise.all([
    fetchPartnerProfiles(supabase, partnerIds),
    fetchLastMessages(supabase, matchIds),
  ]);

  return matches.map((m) => {
    const partnerId = m.user_a === userId ? m.user_b : m.user_a;
    const partner = partnerMap.get(partnerId);
    const last = lastMsgMap.get(m.id);
    return {
      matchId: m.id,
      partnerId,
      partnerName: partner?.name ?? "이름 없음",
      partnerSchool: partner?.school ?? "",
      partnerGender: partner?.gender ?? null,
      matchedAt: m.created_at,
      status: m.status,
      endedAt: m.ended_at,
      lastMessage: last
        ? {
            content: last.content,
            createdAt: last.created_at,
            senderId: last.sender_id,
          }
        : null,
    };
  });
}

/**
 * 특정 매칭 + 상대 프로필 — 채팅방 진입 시 사용.
 * RLS 가 자동으로 권한 체크. 없으면 null 반환.
 * 종료된 매칭도 반환 (UI 에서 종료 상태 표시).
 */
export async function getMatchWithPartner(
  supabase: SupabaseClient,
  matchId: string,
  userId: string,
): Promise<MatchWithPartner | null> {
  const { data, error } = await supabase
    .from("matches")
    .select("id, user_a, user_b, created_at, status, ended_at, ended_by")
    .eq("id", matchId)
    .maybeSingle<MatchRow>();

  if (error) {
    console.error("[matches.getMatchWithPartner]", error);
    return null;
  }
  if (!data) return null;
  if (data.user_a !== userId && data.user_b !== userId) return null;

  const partnerId = data.user_a === userId ? data.user_b : data.user_a;
  const partnerMap = await fetchPartnerProfiles(supabase, [partnerId]);
  const partner = partnerMap.get(partnerId);

  return {
    matchId: data.id,
    partnerId,
    partnerName: partner?.name ?? "이름 없음",
    partnerSchool: partner?.school ?? "",
    partnerGender: partner?.gender ?? null,
    matchedAt: data.created_at,
    status: data.status,
    endedAt: data.ended_at,
    lastMessage: null,
  };
}

/**
 * 채팅 끊기 — RPC 호출.
 * SECURITY DEFINER 함수가 본인 참여 매칭인지 확인 후 status='ended' 처리.
 */
export async function endMatch(
  supabase: SupabaseClient,
  matchId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.rpc("end_match", { match_id: matchId });
  if (error) {
    console.error("[matches.endMatch]", error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
