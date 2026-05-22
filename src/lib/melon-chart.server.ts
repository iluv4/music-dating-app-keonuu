import { MelonChart } from "melona";
import type { ChartResponse, Song } from "~/lib/song-types";
import { getCache, setCache, CACHE_TTL } from "~/lib/melona-cache.server";
import fallbackData from "~/lib/song-fallback.json";

// 멜론 차트 TOP 조회 (캐시 우선, 실패 시 fallback).
// loader 와 api.melon.chart 라우트가 공유 — 로더에서 self-fetch(HTTP 왕복) 없이 직접 호출.

const TOP_N = 5;
const CACHE_KEY = "chart-top";

const chart = new MelonChart({
  timeout: 4000,
  retryOptions: { maxRetries: 1, baseDelay: 300 },
});

function getFallback(): Song[] {
  return (fallbackData.items as Song[]).slice(0, TOP_N);
}

export async function getChartTop(): Promise<ChartResponse> {
  const cached = getCache<ChartResponse>(CACHE_KEY);
  if (cached) return cached;

  try {
    const raw = await chart.getChart();
    const items: Song[] = raw.slice(0, TOP_N).map((s) => ({
      songNo: s.songNo,
      title: s.title,
      artist: s.artist,
      album: s.album,
      albumImg: s.albumImg,
    }));
    const payload: ChartResponse = { items, source: "live" };
    setCache(CACHE_KEY, payload, CACHE_TTL.chart);
    return payload;
  } catch (err) {
    console.error("[melona chart failed]", err);
    return { items: getFallback(), source: "fallback" };
  }
}
