import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import {
  Form,
  Link,
  useActionData,
  useLoaderData,
  useNavigation,
} from "@remix-run/react";
import { getSession, saveSession } from "../lib/store.server";
import {
  sendMessage,
  scoreToLevel,
  AFFINITY_LABELS,
  CHAT_MODES,
  HAS_KEY,
} from "../lib/harness.server";
import { visualFor } from "../lib/presentation";
import type { ReactNode } from "react";
import type { ChatMode } from "../../src/harness/types";

const THRESHOLDS = [0, 80, 250, 500, 800, 1000];

function progress(score: number) {
  const level = scoreToLevel(score);
  const lo = THRESHOLDS[level - 1];
  const hi = THRESHOLDS[level] ?? 1000;
  const pct = Math.max(0, Math.min(100, ((score - lo) / (hi - lo)) * 100));
  const toNext = level >= 5 ? 0 : hi - score;
  return { level, pct, toNext };
}

export async function loader({ params }: LoaderFunctionArgs) {
  const state = getSession(params.id!);
  if (!state) throw new Response("Not Found", { status: 404 });

  const { level, pct, toNext } = progress(state.affinityScore);
  return {
    character: { id: state.character.id, name: state.character.name, greeting: state.character.greeting },
    turns: state.recentTurns,
    score: state.affinityScore,
    level,
    levelLabel: AFFINITY_LABELS[level],
    pct,
    toNext,
    jam: state.jam,
    mode: state.mode,
    modes: (Object.keys(CHAT_MODES) as ChatMode[]).map((m) => ({
      key: m,
      cost: CHAT_MODES[m].jamCost,
    })),
    unlockedHome: level >= 5,
    hasKey: HAS_KEY,
  };
}

export async function action({ request, params }: ActionFunctionArgs) {
  const state = getSession(params.id!);
  if (!state) throw new Response("Not Found", { status: 404 });

  const form = await request.formData();
  const intent = form.get("intent");

  if (intent === "mode") {
    const mode = String(form.get("mode")) as ChatMode;
    if (CHAT_MODES[mode]) saveSession({ ...state, mode });
    return { ok: true, levelChange: null };
  }

  if (intent === "demo-fill") {
    // 데모: 결혼(Lv5)까지 호감도를 채워 "우리집" 이식 지점을 바로 확인
    saveSession({ ...state, affinityScore: 820 });
    return { ok: true, levelChange: null };
  }

  if (intent === "send") {
    const text = String(form.get("text") ?? "").trim();
    if (!text) return { ok: false, levelChange: null };
    const result = await sendMessage(state, text);
    saveSession(result.state);
    return { ok: true, levelChange: result.levelChange ?? null };
  }

  return { ok: false, levelChange: null };
}

export default function Chat() {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const nav = useNavigation();
  const v = visualFor(data.character.id);
  const sending = nav.state !== "idle";

  return (
    <div className="flex flex-1 flex-col">
      {/* 앱바 */}
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-brand-100 bg-cream/95 px-4 py-3 backdrop-blur">
        <Link to="/" className="text-xl text-sub">
          ‹
        </Link>
        <div className={`flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br text-lg ${v.gradient}`}>
          {v.emoji}
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold leading-none">{data.character.name}</p>
          <p className="mt-0.5 text-xs text-brand-600">
            {data.levelLabel} · Lv.{data.level}
          </p>
        </div>
        <span className="pill bg-jam/15 text-[#B57A00]">💎 {data.jam}</span>
      </header>

      {/* 호감도 바 */}
      <div className="px-4 pb-2 pt-3">
        <div className="mb-1 flex justify-between text-xs text-sub">
          <span>호감도 {data.score}/1000</span>
          <span>{data.level >= 5 ? "❤️ 최고 단계" : `다음 단계까지 ${data.toNext}`}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-brand-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all"
            style={{ width: `${data.pct}%` }}
          />
        </div>
      </div>

      {/* 우리집(동거 모드) 이식 지점 — Lv5에서만 노출 */}
      {data.unlockedHome && (
        <Link
          to={`/home/${data.character.id}`}
          className="mx-4 mb-1 mt-2 flex items-center justify-between rounded-2xl bg-gradient-to-r from-brand-400 to-brand-600 px-4 py-3 text-white shadow-soft"
        >
          <span className="text-sm font-semibold">💍 우리집이 열렸어요 — 함께하는 일상으로</span>
          <span className="text-lg">›</span>
        </Link>
      )}

      {/* 레벨업 토스트 */}
      {actionData?.levelChange && (
        <div className="mx-4 my-1 rounded-xl bg-brand-50 px-3 py-2 text-center text-sm font-medium text-brand-700">
          {actionData.levelChange}
        </div>
      )}

      {/* 대화 */}
      <main className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
        {/* 첫 인사 */}
        <Bubble role="assistant">{data.character.greeting}</Bubble>
        {data.turns.map((t, i) => (
          <Bubble key={i} role={t.role}>
            {t.text}
          </Bubble>
        ))}
      </main>

      {/* 모드 선택 */}
      <Form method="post" className="flex gap-1.5 px-4 pb-1">
        <input type="hidden" name="intent" value="mode" />
        {data.modes.map((m) => (
          <button
            key={m.key}
            name="mode"
            value={m.key}
            className={`pill border text-xs ${
              data.mode === m.key
                ? "border-brand bg-brand text-white"
                : "border-brand-100 bg-white text-sub"
            }`}
          >
            {m.key} · {m.cost}💎
          </button>
        ))}
      </Form>

      {/* 입력 */}
      <Form method="post" className="flex items-center gap-2 border-t border-brand-100 px-4 py-3">
        <input type="hidden" name="intent" value="send" />
        <input
          name="text"
          autoComplete="off"
          placeholder={`${data.character.name}에게 메시지…`}
          className="flex-1 rounded-full border border-brand-100 bg-white px-4 py-2.5 text-sm outline-none focus:border-brand"
        />
        <button
          disabled={sending}
          className="btn-brand px-5 py-2.5 text-sm disabled:opacity-50"
        >
          {sending ? "…" : "전송"}
        </button>
      </Form>

      {/* 데모 도우미 */}
      <div className="flex items-center justify-between px-4 pb-3 text-xs text-sub">
        <span>{data.hasKey ? "🔌 실시간 AI 연결됨" : "데모 모드 (키 없음)"}</span>
        {!data.unlockedHome && (
          <Form method="post">
            <input type="hidden" name="intent" value="demo-fill" />
            <button className="underline">🔧 데모: 결혼까지 채우기</button>
          </Form>
        )}
      </div>
    </div>
  );
}

function Bubble({
  role,
  children,
}: {
  role: "user" | "assistant";
  children: ReactNode;
}) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[78%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "rounded-br-md bg-brand text-white"
            : "rounded-bl-md bg-white text-ink shadow-card"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
