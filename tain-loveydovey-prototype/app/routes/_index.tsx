import type { MetaFunction } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { CHARACTERS } from "../lib/store.server";
import { visualFor } from "../lib/presentation";
import { HAS_KEY } from "../lib/harness.server";

export const meta: MetaFunction = () => [{ title: "러비더비 — 최애를 만나보세요" }];

export function loader() {
  return {
    characters: CHARACTERS.map((c) => ({
      id: c.id,
      name: c.name,
      concept: c.concept,
      greeting: c.greeting,
    })),
    hasKey: HAS_KEY,
  };
}

export default function Index() {
  const { characters, hasKey } = useLoaderData<typeof loader>();

  return (
    <div className="flex flex-1 flex-col">
      {/* 헤더 */}
      <header className="bg-gradient-to-b from-brand-50 to-cream px-5 pb-4 pt-8">
        <p className="text-sm font-medium text-brand-600">💗 러비더비</p>
        <h1 className="mt-1 text-2xl font-bold leading-tight">
          상상 속 그 사람과
          <br />
          썸부터 결혼까지
        </h1>
        {!hasKey && (
          <p className="mt-2 rounded-lg bg-brand-100 px-3 py-1.5 text-xs text-brand-700">
            데모 모드 · API 키 없이 화면을 둘러볼 수 있어요
          </p>
        )}
      </header>

      {/* 캐릭터 카드 목록 */}
      <main className="flex-1 px-5 py-4">
        <h2 className="mb-3 text-sm font-semibold text-sub">최애를 골라보세요</h2>
        <ul className="flex flex-col gap-3">
          {characters.map((c) => {
            const v = visualFor(c.id);
            return (
              <li key={c.id}>
                <Link
                  to={`/chat/${c.id}`}
                  className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-card transition active:scale-[0.99]"
                >
                  <div
                    className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-3xl ${v.gradient}`}
                  >
                    {v.emoji}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">{c.name}</p>
                    <p className="truncate text-sm text-sub">{c.concept}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {v.hashtags.slice(0, 3).map((h) => (
                        <span
                          key={h}
                          className="pill bg-brand-50 px-2 py-0.5 text-xs text-brand-600"
                        >
                          {h}
                        </span>
                      ))}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}
