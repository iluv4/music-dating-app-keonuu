import { useEffect, useState } from "react";
import {
  json,
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "@remix-run/node";
import {
  Form,
  useFetcher,
  useLoaderData,
  useNavigate,
  useNavigation,
} from "@remix-run/react";
import { requireApprovedUser } from "~/lib/auth.server";
import {
  listUserSongs,
  replaceUserSongs,
} from "~/lib/repos/user-songs.server";
import { getMatchWithPartner } from "~/lib/repos/matches.server";
import { sendPushToUser } from "~/lib/push.server";
import { getChartTop } from "~/lib/melon-chart.server";
import StatusBar from "~/components/StatusBar";
import HomeIndicator from "~/components/HomeIndicator";
import PhoneFrame from "~/components/PhoneFrame";
import { PrimaryButton } from "~/components/Button";
import SongSearchInput from "~/components/SongSearchInput";
import SongDropdown from "~/components/SongDropdown";
import SelectedSongCard from "~/components/SelectedSongCard";
import RecommendedSongCard from "~/components/RecommendedSongCard";
import { COLORS, TYPOGRAPHY } from "~/lib/constants";
import { useDebouncedValue } from "~/lib/useDebouncedValue";
import { useSelectedSongs, MAX_SONGS } from "~/lib/song-selection";
import type { SearchResponse, Song } from "~/lib/song-types";

// SSR: 인증 + 승인 + 기존 user_songs + 추천 차트 prefetch
export async function loader({ request }: LoaderFunctionArgs) {
  const ctx = await requireApprovedUser(request);

  // 기존 곡 + 추천 차트 병렬 조회. 차트는 self-fetch(HTTP 왕복) 없이 서버 함수 직접 호출.
  const [existing, recommended] = await Promise.all([
    listUserSongs(ctx.supabase, ctx.user.id),
    getChartTop(),
  ]);

  return json({ existing, recommended }, { headers: ctx.headers });
}

function parseSongsFromForm(raw: string): Song[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed)) return null;

  const songs: Song[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const songNo = Number(o.songNo);
    const title = typeof o.title === "string" ? o.title.trim() : "";
    const artist = typeof o.artist === "string" ? o.artist.trim() : "";
    if (!songNo || !title || !artist) continue;
    songs.push({
      songNo,
      title,
      artist,
      album: typeof o.album === "string" ? o.album : undefined,
      albumImg: typeof o.albumImg === "string" ? o.albumImg : undefined,
    });
  }
  return songs;
}

export async function action({ request }: ActionFunctionArgs) {
  const ctx = await requireApprovedUser(request);
  const fd = await request.formData();
  const songs = parseSongsFromForm(String(fd.get("songs") ?? "[]"));

  if (songs === null) {
    return json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }
  if (songs.length === 0) {
    return json({ error: "최소 1곡 이상 선택해주세요." }, { status: 400 });
  }
  if (songs.length > MAX_SONGS) {
    return json(
      { error: `최대 ${MAX_SONGS}곡까지 선택할 수 있어요.` },
      { status: 400 },
    );
  }

  const result = await replaceUserSongs(ctx.supabase, ctx.user.id, songs);
  if (!result.ok) {
    return json({ error: "저장 중 오류가 발생했어요." }, { status: 500 });
  }

  // 곡 저장 직후 자동 매칭 — 장르 우선, 안 겹쳐도 후보가 있으면 매칭.
  const { data, error } = await ctx.supabase.rpc("find_best_match", {
    p_user_id: ctx.user.id,
  });

  if (error) {
    // 누적 매칭 캡 도달 → 매칭 화면에서 안내. 그 외 오류는 로그만 남기고 진행.
    if (error.message?.includes("match_cap_reached")) {
      return redirect("/music?capped=1", { headers: ctx.headers });
    }
    console.error("[music-select.find_best_match]", error);
    return redirect("/music", { headers: ctx.headers });
  }

  const matchId = data as string | null;
  if (matchId) {
    // 매칭된 상대에게 푸시 (본인은 채팅으로 이동하므로 상대만).
    try {
      const m = await getMatchWithPartner(ctx.supabase, matchId, ctx.user.id);
      if (m?.partnerId) {
        await sendPushToUser(m.partnerId, {
          title: "새 매칭이 성사됐어요! 💘",
          body: "음악 취향이 통하는 상대와 매칭됐어요.",
          url: `/chat/${matchId}`,
        });
      }
    } catch (e) {
      console.error("[music-select.match push]", e);
    }
    return redirect(`/chat/${matchId}`, { headers: ctx.headers });
  }

  // 후보 없음 → 매칭 대기 화면.
  return redirect("/music", { headers: ctx.headers });
}

export default function MusicSelect() {
  const navigate = useNavigate();
  const { existing, recommended } = useLoaderData<typeof loader>();
  const { songs, add, remove } = useSelectedSongs(existing);
  const navigation = useNavigation();
  const submitting = navigation.state === "submitting";

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 300);
  const searchFetcher = useFetcher<SearchResponse>();
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const q = debouncedQuery.trim();
    if (q.length < 2) return;
    searchFetcher.load(`/api/melon/search?q=${encodeURIComponent(q)}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery]);

  const isSearching = query.trim().length >= 2;
  const dropdownItems = searchFetcher.data?.items ?? [];
  const searchLoading =
    searchFetcher.state === "loading" || searchFetcher.state === "submitting";

  const pick = (song: Song) => {
    const result = add(song);
    if (result.ok) {
      setQuery("");
      setToast(null);
    } else if (result.reason === "max") {
      setToast(`최대 ${MAX_SONGS}곡까지 선택할 수 있어요.`);
    } else if (result.reason === "duplicate") {
      setToast("이미 선택한 곡이에요.");
    }
  };

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(id);
  }, [toast]);

  const canSubmit = songs.length > 0 && !submitting;

  return (
    <PhoneFrame>
      <StatusBar />
      <div
        style={{
          flex: 1,
          padding: "0 25px",
          paddingBottom: "120px",
          position: "relative",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            paddingTop: "20px",
            marginBottom: "24px",
          }}
        >
          <h1
            style={{
              ...TYPOGRAPHY.headlineMd,
              color: COLORS.text.primary,
              margin: 0,
              lineHeight: 1.25,
            }}
          >
            OO님의 <span style={{ color: COLORS.accent }}>음악</span>을
            <br />
            선택해주세요!
          </h1>
          <button
            type="button"
            onClick={() => navigate("/genre")}
            aria-label="닫기"
            style={{
              fontSize: "22px",
              color: COLORS.text.secondary,
              padding: "4px 6px",
            }}
          >
            ✕
          </button>
        </div>

        <p
          style={{
            ...TYPOGRAPHY.body,
            color: COLORS.text.helper,
            margin: 0,
            marginBottom: "20px",
          }}
        >
          회원님을 소개할 수 있는 음악을 선택해주세요.
        </p>

        {songs.length > 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              marginBottom: "16px",
            }}
          >
            {songs.map((s) => (
              <SelectedSongCard key={s.songNo} song={s} onRemove={remove} />
            ))}
          </div>
        )}

        {songs.length < MAX_SONGS && (
          <>
            <SongSearchInput
              placeholder="노래를 선택해주세요."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              loading={searchLoading && isSearching}
            />
            {isSearching && (
              <div style={{ marginTop: "10px" }}>
                <SongDropdown
                  items={dropdownItems}
                  onPick={pick}
                  emptyMessage={
                    searchLoading
                      ? "검색 중..."
                      : "검색 결과가 없어요. 다른 키워드로 검색해보세요."
                  }
                />
              </div>
            )}

            {!isSearching && (
              <div style={{ marginTop: "10px" }}>
                <p
                  style={{
                    ...TYPOGRAPHY.caption,
                    fontSize: "13px",
                    color: COLORS.accent,
                    margin: 0,
                    lineHeight: 1.45,
                  }}
                >
                  음악 장르와 일치하는 노래를 골라야 매칭이 잘 돼요.
                </p>
              </div>
            )}
          </>
        )}

        {!isSearching && songs.length < MAX_SONGS && (
          <div style={{ marginTop: "30px" }}>
            <p
              style={{
                ...TYPOGRAPHY.bodyBold,
                color: COLORS.text.primary,
                margin: 0,
                marginBottom: "12px",
              }}
            >
              추천 리스트
            </p>
            {recommended.items.length === 0 ? (
              <p
                style={{
                  ...TYPOGRAPHY.label,
                  color: COLORS.text.placeholder,
                }}
              >
                추천 데이터를 불러오지 못했어요. 검색으로 찾아주세요.
              </p>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: "10px",
                }}
              >
                {recommended.items.slice(0, 6).map((s) => (
                  <RecommendedSongCard
                    key={`rec-${s.songNo}`}
                    song={s}
                    onPick={pick}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 매칭하러 가기 — Form 으로 action 호출 */}
      <Form
        method="post"
        style={{
          position: "absolute",
          bottom: "34px",
          left: "25px",
          right: "25px",
        }}
      >
        <input type="hidden" name="songs" value={JSON.stringify(songs)} />
        <PrimaryButton
          type="submit"
          disabled={!canSubmit}
          style={{ maxWidth: "none" }}
        >
          {submitting ? "저장 중..." : "매칭하러 가기"}
        </PrimaryButton>
      </Form>

      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: "120px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(0,0,0,0.78)",
            color: "white",
            padding: "10px 16px",
            borderRadius: "20px",
            ...TYPOGRAPHY.caption,
            fontSize: "13px",
            whiteSpace: "nowrap",
            zIndex: 50,
          }}
        >
          {toast}
        </div>
      )}

      <HomeIndicator />
    </PhoneFrame>
  );
}
