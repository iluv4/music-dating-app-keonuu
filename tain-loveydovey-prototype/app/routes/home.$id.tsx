// ============================================================
// "우리집" — 동거 모드 (신규 기능 이식 지점)
// ============================================================
// 기획안 ①의 "우리, 그 이후"를 기존 러비더비 플로우에 graft한 화면.
// 진입점: 채팅에서 결혼(Lv5) 도달 시에만 열린다 (아래 loader 가드).
// 정복형 서사(호감도 올리기) → 반복형 일상 서사로 전환해 Lv5 천장
// 리텐션 누수를 막는 게 목적. 기존 채팅/하네스를 그대로 재사용한다.

import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { Form, Link, useLoaderData, useNavigation } from "@remix-run/react";
import { getSession, saveSession } from "../lib/store.server";
import { sendMessage, scoreToLevel } from "../lib/harness.server";
import { visualFor } from "../lib/presentation";

// 일상 트리거 — 잼 부담 낮은 짧은 상호작용으로 매일 접속 동기를 만든다
const DAILY = [
  { emoji: "🍳", label: "오늘 저녁 뭐 먹을까?", text: "오늘 저녁 뭐 먹을까?" },
  { emoji: "🗺️", label: "주말에 어디 갈까?", text: "이번 주말에 우리 어디 갈까?" },
  { emoji: "💬", label: "오늘 하루 어땠어?", text: "오늘 하루 어땠어? 나는 네 생각 많이 났어." },
  { emoji: "📖", label: "첫 추억 얘기하기", text: "우리 처음 만났을 때 기억나? 그때 얘기 해줘." },
];

export async function loader({ params }: LoaderFunctionArgs) {
  const state = getSession(params.id!);
  if (!state) throw new Response("Not Found", { status: 404 });

  // 가드: 결혼(Lv5) 전에는 우리집에 들어올 수 없다 → 채팅으로 돌려보냄
  if (scoreToLevel(state.affinityScore) < 5) {
    throw redirect(`/chat/${params.id}`);
  }

  return {
    character: { id: state.character.id, name: state.character.name },
    memoryBook: state.memoryBook,
    daily: DAILY,
    anniversaryDday: 14, // 데모: 결혼기념일 D-14
  };
}

export async function action({ request, params }: ActionFunctionArgs) {
  const state = getSession(params.id!);
  if (!state) throw new Response("Not Found", { status: 404 });

  const form = await request.formData();
  const text = String(form.get("text") ?? "").trim();
  if (text) {
    const result = await sendMessage(state, text);
    saveSession(result.state);
  }
  // 일상 대화는 기존 채팅 화면으로 이어진다 (기능이 자연스럽게 녹아듦)
  return redirect(`/chat/${params.id}`);
}

export default function Home() {
  const { character, memoryBook, daily, anniversaryDday } =
    useLoaderData<typeof loader>();
  const v = visualFor(character.id);
  const nav = useNavigation();
  const busy = nav.state !== "idle";

  return (
    <div className="flex flex-1 flex-col">
      {/* 앱바 */}
      <header className="flex items-center gap-3 px-4 py-3">
        <Link to={`/chat/${character.id}`} className="text-xl text-sub">
          ‹
        </Link>
        <p className="flex-1 text-sm font-bold">우리집 💍</p>
      </header>

      {/* 결혼 배너 */}
      <div className="mx-4 flex items-center gap-4 rounded-3xl bg-gradient-to-br from-brand-400 to-brand-600 p-5 text-white shadow-soft">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-3xl">
          {v.emoji}
        </div>
        <div>
          <p className="text-xs opacity-90">{character.name}와(과) 함께 사는 중</p>
          <p className="text-lg font-bold">우리, 그 이후</p>
          <p className="mt-0.5 text-xs opacity-90">
            💞 결혼기념일 D-{anniversaryDday}
          </p>
        </div>
      </div>

      <main className="flex-1 space-y-5 px-4 py-5">
        {/* 추억(메모리북) */}
        <section>
          <h2 className="mb-2 text-sm font-semibold text-sub">📖 우리의 추억</h2>
          <div className="rounded-2xl bg-white p-4 text-sm leading-relaxed shadow-card">
            {memoryBook ? (
              <p className="whitespace-pre-wrap text-ink">{memoryBook}</p>
            ) : (
              <p className="text-sub">
                아직 쌓인 추억이 없어요. 함께 대화를 나눌수록 둘만의 기억이
                여기에 쌓여요.
              </p>
            )}
          </div>
        </section>

        {/* 오늘의 일상 */}
        <section>
          <h2 className="mb-2 text-sm font-semibold text-sub">☀️ 오늘의 일상</h2>
          <div className="grid grid-cols-2 gap-2.5">
            {daily.map((d) => (
              <Form method="post" key={d.label}>
                <input type="hidden" name="text" value={d.text} />
                <button
                  disabled={busy}
                  className="flex w-full flex-col items-start gap-1 rounded-2xl bg-white p-3.5 text-left shadow-card transition active:scale-[0.98] disabled:opacity-50"
                >
                  <span className="text-2xl">{d.emoji}</span>
                  <span className="text-sm font-medium">{d.label}</span>
                </button>
              </Form>
            ))}
          </div>
        </section>

        <p className="px-1 text-center text-xs text-sub">
          일상 대화는 기존 채팅으로 이어져요 — 관계가 끝나지 않고 계속됩니다 💗
        </p>
      </main>
    </div>
  );
}
