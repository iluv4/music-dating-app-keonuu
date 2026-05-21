// 공용 노래 타입 (클라이언트·서버 양쪽 사용)
// 서버는 melona 응답을 이 형태로 정규화하고, 클라이언트는 이 형태만 알면 됨.

export type Song = {
  songNo: number;
  title: string;
  artist: string;
  album?: string;
  albumImg?: string;
};

export type SearchResponse = {
  items: Song[];
  source: "live" | "fallback";
};

export type ChartResponse = {
  items: Song[];
  source: "live" | "fallback";
};
