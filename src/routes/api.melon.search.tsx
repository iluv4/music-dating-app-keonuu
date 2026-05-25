import { json, type LoaderFunctionArgs } from "@remix-run/node";
import * as cheerio from "cheerio";
import type { SearchResponse, Song } from "~/lib/song-types";
import { getCache, setCache, CACHE_TTL } from "~/lib/melona-cache.server";
import fallbackData from "~/lib/song-fallback.json";

// 멜론 검색 페이지를 직접 fetch + cheerio 로 파싱
// melona의 searchSong은 albumImg를 추출하지 않으므로 자체 파서 사용
// CORS 방지 위해 반드시 서버 경유

const SEARCH_URL = "https://www.melon.com/search/song/index.htm";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const MIN_QUERY = 2;
const MAX_RESULTS = 10;
const REQUEST_TIMEOUT_MS = 4000;

// 앨범 ID 로부터 멜론 CDN 이미지 URL 생성
// 패턴: 8자리 padding → first3/next2/last3 디렉토리 + 원본 albumId 파일명
// 예: 4848555 → 048/48/555/4848555.jpg
// 신규 앨범 일부는 cm2 + 타임스탬프 필요해서 404 가능 → 클라이언트 onError 로 fallback
function buildAlbumImageUrl(albumId: string): string {
  const padded = albumId.padStart(8, "0");
  const a = padded.slice(0, 3);
  const b = padded.slice(3, 5);
  const c = padded.slice(5, 8);
  return `https://cdnimg.melon.co.kr/cm/album/images/${a}/${b}/${c}/${albumId}.jpg`;
}

async function fetchSearchHtml(query: string): Promise<string> {
  const url = `${SEARCH_URL}?q=${encodeURIComponent(query)}&section=song`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`melon search ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

function parseSearchHtml(html: string): Song[] {
  const $ = cheerio.load(html);
  const songs: Song[] = [];
  $("table tbody tr").each((_, el) => {
    const $el = $(el);

    const songNo = Number(
      $el.find("td:nth-child(6) button.btn_icon.like").attr("data-song-no"),
    );
    if (!songNo) return;

    const title = $el
      .find("td:nth-child(3) div.ellipsis a.fc_gray")
      .first()
      .text()
      .trim();
    // #artistName 안에 hidden 중복 span 이 있어 직속 <a> 만 추출
    // 콜라보 시 여러 <a> 가 있어 모두 합침 (예: "CozyPop, 징고")
    const artistNames: string[] = [];
    $el
      .find("td:nth-child(4) #artistName > a")
      .each((_, a) => {
        const name = $(a).text().trim();
        if (name && !artistNames.includes(name)) artistNames.push(name);
      });
    const artist = artistNames.join(", ");

    const albumAnchor = $el.find("td:nth-child(5) a").first();
    const album = albumAnchor.text().trim();
    const albumHref = albumAnchor.attr("href") ?? "";
    const albumIdMatch = albumHref.match(/goAlbumDetail\('(\d+)'\)/);
    const albumId = albumIdMatch ? albumIdMatch[1] : "";

    songs.push({
      songNo,
      title,
      artist,
      album,
      albumImg: albumId ? buildAlbumImageUrl(albumId) : undefined,
    });
  });
  return songs;
}

// 멜론 장애 시: 폴백 곡 목록을 검색어로 필터해 빈 결과 대신 근사치라도 반환
function searchFallback(query: string): Song[] {
  const q = query.toLowerCase();
  return (fallbackData.items as Song[])
    .filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.artist.toLowerCase().includes(q),
    )
    .slice(0, MAX_RESULTS);
}

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const query = (url.searchParams.get("q") ?? "").trim();

  if (query.length < MIN_QUERY) {
    return json<SearchResponse>({ items: [], source: "live" });
  }

  const cacheKey = `search:${query.toLowerCase()}`;
  const cached = getCache<SearchResponse>(cacheKey);
  if (cached) return json<SearchResponse>(cached);

  try {
    const html = await fetchSearchHtml(query);
    const items = parseSearchHtml(html).slice(0, MAX_RESULTS);
    const payload: SearchResponse = { items, source: "live" };
    setCache(cacheKey, payload, CACHE_TTL.search);
    return json<SearchResponse>(payload);
  } catch (err) {
    console.error("[melona search failed]", err);
    const payload: SearchResponse = {
      items: searchFallback(query),
      source: "fallback",
    };
    setCache(cacheKey, payload, CACHE_TTL.searchFail);
    return json<SearchResponse>(payload, { status: 200 });
  }
}
