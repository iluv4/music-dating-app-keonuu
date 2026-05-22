import { json } from "@remix-run/node";
import { MelonChart } from "melona";
import type { ChartResponse, Song } from "~/lib/song-types";
import { getCache, setCache, CACHE_TTL } from "~/lib/melona-cache.server";
import fallbackData from "~/lib/song-fallback.json";

const TOP_N = 5;
const CACHE_KEY = "chart-top";

const chart = new MelonChart({
  timeout: 4000,
  retryOptions: { maxRetries: 1, baseDelay: 300 },
});

function getFallback(): Song[] {
  return (fallbackData.items as Song[]).slice(0, TOP_N);
}

export async function loader() {
  // 1) cache hit
  const cached = getCache<ChartResponse>(CACHE_KEY);
  if (cached) return json(cached);

  // 2) live fetch
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
    return json(payload);
  } catch (err) {
    console.error("[melona chart failed]", err);
    const payload: ChartResponse = { items: getFallback(), source: "fallback" };
    return json(payload);
  }
}
