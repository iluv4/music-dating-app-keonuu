// 메모리 캐시 — Remix 서버 인스턴스 단위로 공유
// 차트같이 자주 변하지 않는 응답을 캐시해서 멜론 부하·자체 응답 시간 둘 다 줄임

type Entry<T> = {
  data: T;
  expiresAt: number;
};

const store = new Map<string, Entry<unknown>>();

export function getCache<T>(key: string): T | null {
  const entry = store.get(key) as Entry<T> | undefined;
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.data;
}

export function setCache<T>(key: string, data: T, ttlMs: number): void {
  store.set(key, { data, expiresAt: Date.now() + ttlMs });
}

export const CACHE_TTL = {
  chart: 5 * 60 * 1000, // 5분
} as const;
