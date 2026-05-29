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
import { requireRegisteredUser } from "~/lib/auth.server";
import { getProfileFields } from "~/lib/repos/profiles.server";
import {
  listUserSongs,
  replaceUserSongs,
} from "~/lib/repos/user-songs.server";
import { captureServer } from "~/lib/analytics.server";
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
  const ctx = await requireRegisteredUser(request);

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
  const ctx = await requireRegisteredUser(request);
  const fd = await request.formData();
  const songs = parseSongsFromForm(String(fd.get("songs") ?? "[]"));

  if (songs === null) {
    return json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }
  if (songs.length > MAX_SONGS) {
    return json(
      { error: `최대 ${MAX_SONGS}곡까지 선택할 수 있어요.` },
      { status: 400 },
    );
  }

  // 곡은 선택사항 — 0개면 기존 곡을 유지한 채 건너뛰고 진행(매칭은 폴백으로 동작).
  if (songs.length > 0) {
    const result = await replaceUserSongs(ctx.supabase, ctx.user.id, songs);
    if (!result.ok) {
      return json({ error: "저장 중 오류가 발생했어요." }, { status: 500 });
    }
  }

  // 곡 선택 "성공" — 음악 데이팅의 핵심 기능 완료 지점.
  await captureServer(ctx.user.id, "songs.selected", { count: songs.length });

  // 음악 프로필을 다 만든 뒤에야 결제(참가비)를 안내한다 — 가치를 먼저 경험시키고 결제는 후순위.
  // - 승인됨 → 바로 매칭 화면
  // - 미승인이지만 이미 입금자명 제출(결제 완료) → 승인 대기 화면으로 복귀
  //   (대기 중 곡 고르기 진입한 경우 결제 폼이 다시 뜨지 않게)
  // - 그 외(결제 전) → 결제 안내
  if (ctx.isApproved) {
    return redirect("/music", { headers: ctx.headers });
  }
  const profile = await getProfileFields(ctx.supabase, ctx.user.id, [
    "bank_holder",
  ]);
  const alreadyPaid = !!profile?.bank_holder;
  return redirect(alreadyPaid ? "/waiting" : "/profile/payment", {
    headers: ctx.headers,
  });
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

  const canSubmit = !submitting;

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
          회원님을 소개할 음악을 골라보세요. 선택 안 해도 매칭은 가능해요.
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
          {submitting
            ? "저장 중..."
            : songs.length === 0
              ? "건너뛰기"
              : "매칭하러 가기"}
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
