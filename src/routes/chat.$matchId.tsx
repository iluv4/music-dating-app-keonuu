import { Fragment, useEffect, useRef, useState } from "react";
import {
  json,
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "@remix-run/node";
import {
  useFetcher,
  useLoaderData,
  useNavigate,
  useParams,
} from "@remix-run/react";
import StatusBar from "~/components/StatusBar";
import HomeIndicator from "~/components/HomeIndicator";
import PhoneFrame from "~/components/PhoneFrame";
import { COLORS, TYPOGRAPHY } from "~/lib/constants";
import { requireMatchAccess } from "~/lib/auth.server";
import {
  deleteMessage,
  disappearMessage,
  editMessage,
  listMessages,
  markMessagesRead,
  markViewed,
  sendMessage,
} from "~/lib/repos/messages.server";
import { endMatch } from "~/lib/repos/matches.server";
import { listUserSongs } from "~/lib/repos/user-songs.server";
import { buildIcebreakers } from "~/lib/icebreakers";
import { dispatchPushToUser } from "~/lib/push.server";
import type { MessageRow } from "~/lib/db-types";
import { getSupabaseBrowser } from "~/lib/supabase.client";
import { getClientEnv } from "~/lib/env.client";
import { downscaleImage } from "~/lib/image.client";
import { capture } from "~/lib/analytics.client";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const matchId = params.matchId;
  if (!matchId) throw redirect("/chat");

  const ctx = await requireMatchAccess(request, matchId);
  const messages = await listMessages(ctx.supabase, matchId, 50);

  // 진입 시 상대 메시지 read_at 일괄 갱신 (실패해도 무시)
  await markMessagesRead(ctx.supabase, matchId, ctx.user.id);

  // 첫 메시지 추천 — 아직 대화가 없을 때만 내 선택곡 기반 오프너 제안
  let icebreakers: string[] = [];
  if (messages.length === 0 && ctx.match.status === "active") {
    const mySongs = await listUserSongs(ctx.supabase, ctx.user.id);
    icebreakers = buildIcebreakers(mySongs);
  }

  return json(
    {
      match: ctx.match,
      currentUserId: ctx.user.id,
      messages,
      icebreakers,
    },
    { headers: ctx.headers },
  );
}

export async function action({ request, params }: ActionFunctionArgs) {
  const matchId = params.matchId;
  if (!matchId)
    return json({ error: "채팅방 정보를 찾을 수 없어요." }, { status: 400 });

  const ctx = await requireMatchAccess(request, matchId);
  const fd = await request.formData();
  const intent = String(fd.get("intent") ?? "send");

  // 채팅 끊기
  if (intent === "end") {
    if (ctx.match.status !== "active") {
      return redirect("/chat", { headers: ctx.headers });
    }
    const result = await endMatch(ctx.supabase, matchId);
    if (!result.ok) {
      return json(
        { error: "채팅을 끊지 못했어요. 잠시 후 다시 시도해주세요." },
        { status: 500, headers: ctx.headers },
      );
    }
    return redirect("/chat", { headers: ctx.headers });
  }

  // 메시지 수정 (본인 텍스트)
  if (intent === "edit") {
    const messageId = String(fd.get("message_id") ?? "");
    const newContent = String(fd.get("content") ?? "");
    const result = await editMessage(
      ctx.supabase,
      messageId,
      ctx.user.id,
      newContent,
    );
    if (!result.ok || !result.message) {
      return json(
        { error: result.error ?? "메시지를 수정하지 못했어요." },
        { status: 400, headers: ctx.headers },
      );
    }
    return json({ ok: true, message: result.message }, { headers: ctx.headers });
  }

  // 메시지 삭제 (본인, 양쪽 적용)
  if (intent === "delete") {
    const messageId = String(fd.get("message_id") ?? "");
    const result = await deleteMessage(ctx.supabase, messageId, ctx.user.id);
    if (!result.ok || !result.message) {
      return json(
        { error: result.error ?? "메시지를 삭제하지 못했어요." },
        { status: 400, headers: ctx.headers },
      );
    }
    return json({ ok: true, message: result.message }, { headers: ctx.headers });
  }

  // 펑 — 수신자가 읽은 뒤 소멸
  if (intent === "disappear") {
    const messageId = String(fd.get("message_id") ?? "");
    const result = await disappearMessage(ctx.supabase, messageId, ctx.user.id);
    if (!result.ok || !result.message) {
      return json(
        { error: result.error ?? "메시지를 소멸시키지 못했어요." },
        { status: 400, headers: ctx.headers },
      );
    }
    return json({ ok: true, message: result.message }, { headers: ctx.headers });
  }

  // 한 번만 보기 사진 — 수신자 열람 처리 (스토리지 원본 삭제)
  if (intent === "view") {
    const messageId = String(fd.get("message_id") ?? "");
    const result = await markViewed(ctx.supabase, messageId, ctx.user.id);
    if (!result.ok || !result.message) {
      return json(
        { error: result.error ?? "사진을 열람 처리하지 못했어요." },
        { status: 400, headers: ctx.headers },
      );
    }
    return json({ ok: true, message: result.message }, { headers: ctx.headers });
  }

  // 일반 메시지 전송 (텍스트 또는 사진)
  const content = String(fd.get("content") ?? "");
  const imagePathRaw = String(fd.get("image_url") ?? "").trim();
  // 비공개 chat-images 버킷에 업로드된 "경로"만 저장 (public URL 없음).
  // 이 매칭 폴더(`${matchId}/...`) 안의 안전한 경로만 허용 — 타 매칭/외부 주입 차단.
  const imageUrl =
    imagePathRaw &&
    imagePathRaw.startsWith(`${matchId}/`) &&
    !imagePathRaw.includes("..") &&
    !imagePathRaw.includes("://")
      ? imagePathRaw
      : null;
  if (imagePathRaw && !imageUrl) {
    console.error("[chat.image] rejected path", { imagePathRaw, matchId });
    return json(
      { error: "사진 경로가 올바르지 않아요. 다시 시도해주세요." },
      { status: 400, headers: ctx.headers },
    );
  }
  const viewOnce = String(fd.get("view_once") ?? "") === "1";
  const disappear = String(fd.get("disappear") ?? "") === "1";
  const result = await sendMessage(
    ctx.supabase,
    matchId,
    ctx.user.id,
    content,
    imageUrl,
    { viewOnce, disappear },
  );
  if (!result.ok || !result.message) {
    return json(
      { error: result.error ?? "메시지를 보내지 못했어요. 다시 시도해주세요." },
      { status: 400, headers: ctx.headers },
    );
  }
  // 상대에게 푸시 알림 — 응답을 막지 않도록 비동기 발송(waitUntil).
  // 외부 push 서버 왕복을 기다리지 않아 전송 응답이 즉시 돌아온다.
  dispatchPushToUser(ctx.match.partnerId, {
    title: "새 메시지가 도착했어요 💬",
    // 펑·한 번만 보기는 알림에 원문을 노출하지 않음
    body: viewOnce
      ? "사진을 보냈어요"
      : disappear
        ? "메시지를 보냈어요"
        : imageUrl && !content.trim()
          ? "사진을 보냈어요"
          : content.slice(0, 50),
    url: `/chat/${matchId}`,
  });

  // 송신 직후 클라이언트가 본인 메시지를 바로 표시할 수 있도록 row 반환
  return json(
    { ok: true, message: result.message },
    { headers: ctx.headers },
  );
}

function formatBubbleTime(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  const ampm = h >= 12 ? "오후" : "오전";
  const hh = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${ampm} ${hh}:${m}`;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
function formatDateLabel(iso: string): string {
  const d = new Date(iso);
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}. ${mm}. ${dd} (${WEEKDAYS[d.getDay()]})`;
}
function isSameDay(a: string, b: string): boolean {
  const x = new Date(a);
  const y = new Date(b);
  return (
    x.getFullYear() === y.getFullYear() &&
    x.getMonth() === y.getMonth() &&
    x.getDate() === y.getDate()
  );
}

// 펑 메시지: 수신자가 읽은 뒤 소멸하기까지의 지연(ms)
const DISAPPEAR_AFTER_MS = 6000;
// 한 번만 보기: 뷰어 자동 닫힘(ms)
const VIEW_ONCE_TIMEOUT_MS = 10000;

// 캡처 억제용 반복 워터마크 — 보는 사람 식별자를 깔아 유출 시 추적 단서로 삼는다.
// (웹은 OS 캡처를 100% 막을 수 없어 '억제 + 추적'이 현실적 최선)
function Watermark({ text }: { text: string }) {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 3,
        overflow: "hidden",
        display: "flex",
        flexWrap: "wrap",
        alignContent: "center",
        justifyContent: "center",
        transform: "rotate(-28deg) scale(1.4)",
        opacity: 0.22,
        gap: "20px 14px",
      }}
    >
      {Array.from({ length: 40 }).map((_, i) => (
        <span
          key={i}
          style={{
            whiteSpace: "nowrap",
            fontSize: "10px",
            fontWeight: 700,
            color: "#000",
          }}
        >
          {text}
        </span>
      ))}
    </div>
  );
}

// 캡처 억제: 우클릭/드래그/길게눌러 저장 차단 + 워터마크 오버레이를 두른 사진.
function SecureImg({
  src,
  watermark,
  onLoad,
  style,
}: {
  src: string;
  watermark: string;
  onLoad?: () => void;
  style?: React.CSSProperties;
}) {
  return (
    <div
      onContextMenu={(e) => e.preventDefault()}
      style={{ position: "relative", display: "inline-block", lineHeight: 0 }}
    >
      <img
        src={src}
        alt="사진 메시지"
        loading="lazy"
        draggable={false}
        onLoad={onLoad}
        onContextMenu={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
        style={{
          display: "block",
          WebkitUserSelect: "none",
          userSelect: "none",
          WebkitTouchCallout: "none",
          ...style,
        }}
      />
      <Watermark text={watermark} />
    </div>
  );
}

// 한 번만 보기 사진 전체화면 뷰어 — 캡처 억제 + 워터마크 + 자동 닫힘.
function ViewOnceViewer({
  url,
  watermark,
  onLoaded,
  onClose,
}: {
  url: string;
  watermark: string;
  onLoaded: () => void;
  onClose: () => void;
}) {
  const loadedRef = useRef(false);
  useEffect(() => {
    const t = setTimeout(onClose, VIEW_ONCE_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div
      onContextMenu={(e) => e.preventDefault()}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 300,
        background: "rgba(0,0,0,0.95)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "18px",
          left: 0,
          right: 0,
          textAlign: "center",
          color: "rgba(255,255,255,0.7)",
          fontSize: "12px",
          padding: "0 16px",
        }}
      >
        ⚠️ 캡처 금지 · 한 번만 볼 수 있어요 · 닫으면 사라집니다
      </div>
      <div style={{ position: "relative", display: "inline-block", lineHeight: 0 }}>
        <img
          src={url}
          alt="한 번만 보기 사진"
          draggable={false}
          onContextMenu={(e) => e.preventDefault()}
          onDragStart={(e) => e.preventDefault()}
          onLoad={() => {
            if (loadedRef.current) return;
            loadedRef.current = true;
            onLoaded();
          }}
          style={{
            display: "block",
            maxWidth: "90vw",
            maxHeight: "70vh",
            borderRadius: "12px",
            WebkitUserSelect: "none",
            userSelect: "none",
            WebkitTouchCallout: "none",
          }}
        />
        <Watermark text={watermark} />
      </div>
      <button
        type="button"
        onClick={onClose}
        style={{
          marginTop: "24px",
          padding: "12px 28px",
          borderRadius: "24px",
          background: "white",
          color: "#000",
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        닫기
      </button>
    </div>
  );
}

export default function ChatRoom() {
  const { match, currentUserId, messages: initial, icebreakers } =
    useLoaderData<typeof loader>();
  const params = useParams();
  const matchId = params.matchId as string;
  const navigate = useNavigate();
  const sendFetcher = useFetcher<{
    ok?: boolean;
    message?: MessageRow;
    error?: string;
  }>();
  const submitting = sendFetcher.state === "submitting";

  const [messages, setMessages] = useState<MessageRow[]>(initial);
  const [draft, setDraft] = useState("");
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  // 매칭 후 공개: 상대 프로필 사진(서버가 활성 매칭 확인 후 서명 URL 발급).
  const [partnerPhoto, setPartnerPhoto] = useState<string | null>(null);
  // 사진 메시지: image_url 은 비공개 버킷 경로 → 서명 URL 로 변환해 렌더
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  // 보내기 옵션: 펑(읽으면 소멸) / 한 번만 보기(사진)
  const [showAttach, setShowAttach] = useState(false);
  const [disappearMode, setDisappearMode] = useState(false);
  const [viewOnceMode, setViewOnceMode] = useState(false);
  // 수정 중인 메시지 / 길게눌러 뜨는 동작 시트 / 한 번만 보기 뷰어
  const [editing, setEditing] = useState<MessageRow | null>(null);
  const [actionSheet, setActionSheet] = useState<MessageRow | null>(null);
  const [viewer, setViewer] = useState<{ id: string; url: string } | null>(null);
  // 캡처 억제: 탭을 벗어나면 화면을 가린다 (전환 중 캡처/녹화 미리보기 방지)
  const [obscured, setObscured] = useState(false);
  useEffect(() => {
    let active = true;
    if (!match.partnerId) return;
    fetch(`/api/member-photo?userId=${encodeURIComponent(match.partnerId)}`)
      .then((r) => r.json())
      .then((d: { url?: string | null }) => {
        if (active && d?.url) setPartnerPhoto(d.url);
      })
      .catch(() => {
        /* 사진 미공개/미등록은 무시 */
      });
    return () => {
      active = false;
    };
  }, [match.partnerId]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // 이미 서명 URL을 받은 경로 — 메시지가 바뀔 때마다 전체를 재서명하던 낭비 방지
  const signedPathsRef = useRef<Set<string>>(new Set());
  // 펑 메시지: 소멸 타이머 중복 예약 방지 + 언마운트 정리용
  const disappearScheduledRef = useRef<Set<string>>(new Set());
  const disappearTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const endFetcher = useFetcher<{ error?: string }>();
  const ending = endFetcher.state === "submitting";
  // 수정/삭제/펑/열람 처리용 — send 와 분리해 응답 머지 로직을 단순화
  const actionFetcher = useFetcher<{
    ok?: boolean;
    message?: MessageRow;
    error?: string;
  }>();

  // 워터마크: 보는 사람(=현재 사용자) 식별자 — 유출 시 추적 단서
  const watermark = `캡처 금지 · ${currentUserId.slice(0, 8)}`;

  // 메시지 한 건을 id 기준으로 상태에 머지 (수정/삭제/펑/열람 공통)
  const mergeMessage = (row: MessageRow) =>
    setMessages((prev) => prev.map((m) => (m.id === row.id ? row : m)));

  const submitMessageAction = (
    intent: "edit" | "delete" | "disappear" | "view",
    messageId: string,
    extra?: Record<string, string>,
  ) => {
    const fd = new FormData();
    fd.set("intent", intent);
    fd.set("message_id", messageId);
    if (extra) for (const [k, v] of Object.entries(extra)) fd.set(k, v);
    actionFetcher.submit(fd, { method: "post" });
  };

  const isEnded = match.status === "ended";
  const confirmEnd = () => {
    const fd = new FormData();
    fd.set("intent", "end");
    endFetcher.submit(fd, { method: "post" });
  };

  // 새 메시지 도착 + 사진 서명URL 로드 완료 시 하단으로 스크롤
  // (사진은 placeholder → 이미지로 높이가 커지므로 imageUrls 도 의존성에 포함)
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, imageUrls]);

  // 사진 메시지 경로 → 서명 URL 변환 (비공개 버킷)
  useEffect(() => {
    const paths = Array.from(
      new Set(
        messages
          // 한 번만 보기 사진은 미리 서명하지 않음 — 탭할 때 1회용으로 단기 서명
          .filter((m) => !m.view_once)
          .map((m) => m.image_url)
          .filter((p): p is string => !!p),
      ),
    ).filter((p) => !signedPathsRef.current.has(p));
    if (paths.length === 0) return;
    let cancelled = false;
    (async () => {
      const env = getClientEnv();
      const supabase = getSupabaseBrowser({
        url: env.SUPABASE_URL,
        anonKey: env.SUPABASE_ANON_KEY,
      });
      const { data, error } = await supabase.storage
        .from("chat-images")
        .createSignedUrls(paths, 3600);
      if (cancelled || error || !data) return;
      setImageUrls((prev) => {
        const next = { ...prev };
        for (const item of data) {
          if (item.path && item.signedUrl) {
            next[item.path] = item.signedUrl;
            signedPathsRef.current.add(item.path);
          }
        }
        return next;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [messages]);

  // Realtime 구독 — 세션 먼저 가져와서 realtime.setAuth 명시 후 subscribe
  useEffect(() => {
    const env = getClientEnv();
    const supabase = getSupabaseBrowser({
      url: env.SUPABASE_URL,
      anonKey: env.SUPABASE_ANON_KEY,
    });

    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    const setup = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session?.access_token) {
        // Realtime websocket 의 JWT 를 명시적으로 세팅
        supabase.realtime.setAuth(session.access_token);
      }

      channel = supabase
        .channel(`messages:${matchId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            // 이 매칭의 메시지만 서버에서 필터 — 타 매칭 INSERT 브로드캐스트 차단
            filter: `match_id=eq.${matchId}`,
          },
          (payload) => {
            const newMsg = payload.new as MessageRow;
            // 안전망: 필터가 적용돼도 본인이 보낸 메시지는 낙관적 표시와 중복 방지
            if (newMsg.sender_id === currentUserId) return;
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
          },
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "messages",
            filter: `match_id=eq.${matchId}`,
          },
          (payload) => {
            // 수정/삭제/펑 소멸/열람 등 상태 변경을 양쪽에 실시간 반영
            const updated = payload.new as MessageRow;
            setMessages((prev) =>
              prev.map((m) => (m.id === updated.id ? updated : m)),
            );
          },
        )
        .subscribe();
    };

    setup();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [matchId, currentUserId]);

  // sendFetcher 응답 처리: 서버 확정 메시지로 낙관적 임시(temp-) 메시지를 교체.
  // 실패 시(텍스트·사진 공통): 임시 메시지 롤백 + 서버 에러 노출.
  useEffect(() => {
    if (sendFetcher.state !== "idle") return;
    if (sendFetcher.data?.error) {
      setMessages((prev) => prev.filter((m) => !m.id.startsWith("temp-")));
      setUploadError(sendFetcher.data.error);
      return;
    }
    const newMsg = sendFetcher.data?.message;
    if (!newMsg) return;
    setUploadError(null);
    setMessages((prev) => {
      // 한 번에 하나만 전송(submitting 가드) → temp- 전부 제거 후 확정본 추가
      const withoutTemp = prev.filter((m) => !m.id.startsWith("temp-"));
      if (withoutTemp.some((m) => m.id === newMsg.id)) return withoutTemp;
      return [...withoutTemp, newMsg];
    });
    inputRef.current?.focus();
  }, [sendFetcher.state, sendFetcher.data]);

  // 수정/삭제/펑/열람 응답 머지 (서버 확정 row 로 교체)
  useEffect(() => {
    if (actionFetcher.state !== "idle") return;
    if (actionFetcher.data?.error) {
      setUploadError(actionFetcher.data.error);
      return;
    }
    const row = actionFetcher.data?.message;
    if (row) mergeMessage(row);
  }, [actionFetcher.state, actionFetcher.data]);

  // 캡처 억제: 탭 전환·창 비활성 시 화면을 가린다 (전환 캡처/녹화 미리보기 방지)
  useEffect(() => {
    const onVis = () => setObscured(document.visibilityState !== "visible");
    const onBlur = () => setObscured(true);
    const onFocus = () => setObscured(false);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  // 펑(읽으면 소멸): 상대가 보낸 disappear 메시지를 화면에서 읽었으니
  // 일정 시간 뒤 소멸 요청. 메시지 변경마다 재실행되므로 타이머는 한 번만 예약하고
  // (messages 변경 시 cleanup 으로 지워버리면 다시 예약되지 않아) 언마운트 때만 정리.
  useEffect(() => {
    if (isEnded) return;
    for (const m of messages) {
      if (
        m.disappear &&
        !m.deleted_at &&
        m.sender_id !== currentUserId &&
        !m.id.startsWith("temp-") &&
        !disappearScheduledRef.current.has(m.id)
      ) {
        const id = m.id;
        disappearScheduledRef.current.add(id);
        const timer = setTimeout(
          () => submitMessageAction("disappear", id),
          DISAPPEAR_AFTER_MS,
        );
        disappearTimersRef.current.push(timer);
      }
    }
  }, [messages, isEnded, currentUserId]);

  useEffect(() => {
    const timers = disappearTimersRef.current;
    return () => timers.forEach(clearTimeout);
  }, []);

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || submitting) return;

    // 수정 모드: 기존 메시지 내용 갱신
    if (editing) {
      const target = editing;
      setEditing(null);
      setDraft("");
      // 낙관적: 내용 즉시 반영 (edited_at 은 서버 확정으로 머지)
      mergeMessage({ ...target, content: trimmed });
      submitMessageAction("edit", target.id, { content: trimmed });
      return;
    }

    const isDisappear = disappearMode;
    // 낙관적 표시 — 서버 왕복을 기다리지 않고 즉시 말풍선 노출
    const temp: MessageRow = {
      id: `temp-${Date.now()}`,
      match_id: matchId,
      sender_id: currentUserId,
      content: trimmed,
      image_url: null,
      created_at: new Date().toISOString(),
      read_at: null,
      edited_at: null,
      deleted_at: null,
      view_once: false,
      viewed_at: null,
      disappear: isDisappear,
    };
    setMessages((prev) => [...prev, temp]);
    setDraft("");
    setDisappearMode(false);
    setShowAttach(false);
    inputRef.current?.focus();
    const fd = new FormData();
    fd.set("content", trimmed);
    if (isDisappear) fd.set("disappear", "1");
    sendFetcher.submit(fd, { method: "post" });
    capture("message.sent", {
      match_id: matchId,
      length_bucket:
        trimmed.length < 20 ? "short" : trimmed.length < 100 ? "medium" : "long",
    });
  };

  const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB

  const onPickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // 같은 파일 재선택 허용
    if (!file || uploading) return;
    setUploadError(null);

    if (!file.type.startsWith("image/")) {
      setUploadError("이미지 파일만 보낼 수 있어요.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setUploadError("사진은 5MB 이하만 보낼 수 있어요.");
      return;
    }

    setUploading(true);
    try {
      const env = getClientEnv();
      const supabase = getSupabaseBrowser({
        url: env.SUPABASE_URL,
        anonKey: env.SUPABASE_ANON_KEY,
      });
      // 스토리지 insert 정책은 authenticated 전용 → 세션이 붙어있어야 업로드 가능.
      // 세션이 없으면 anon 으로 올라가 RLS 에 막히므로 먼저 확인한다.
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setUploadError("로그인이 만료됐어요. 새로고침 후 다시 시도해주세요.");
        return;
      }
      // 업로드 전 축소 — 전송 속도와 수신측 렌더 속도를 함께 개선
      const { blob, ext } = await downscaleImage(file);
      const path = `${matchId}/${currentUserId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("chat-images")
        .upload(path, blob, { contentType: blob.type, upsert: false });
      if (error) throw error;

      // 비공개 버킷 → public URL 없음. 경로만 저장하고 렌더 시 서명 URL 생성.
      const fd = new FormData();
      fd.set("image_url", path);
      if (viewOnceMode) fd.set("view_once", "1");
      sendFetcher.submit(fd, { method: "post" });
      capture("message.sent", {
        match_id: matchId,
        has_image: true,
        view_once: viewOnceMode,
      });
      setViewOnceMode(false);
      setShowAttach(false);
    } catch (err) {
      // 실제 원인을 화면·콘솔에 노출해 디버깅 가능하게 (이전엔 항상 같은 메시지라 원인 불명)
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[chat photo upload]", err);
      setUploadError(`사진 전송 실패: ${msg}`);
    } finally {
      setUploading(false);
    }
  };

  // 한 번만 보기 사진 열기 (수신자) — 1회용 단기 서명 URL 생성 후 뷰어로.
  // 이미지 로드 완료 시점에 view 처리(서버가 원본 삭제)하므로 재열람 불가.
  const openViewOnce = async (msg: MessageRow) => {
    if (!msg.image_url) return;
    try {
      const env = getClientEnv();
      const supabase = getSupabaseBrowser({
        url: env.SUPABASE_URL,
        anonKey: env.SUPABASE_ANON_KEY,
      });
      const { data, error } = await supabase.storage
        .from("chat-images")
        .createSignedUrl(msg.image_url, 60);
      if (error || !data?.signedUrl) {
        setUploadError("사진을 불러오지 못했어요.");
        return;
      }
      setViewer({ id: msg.id, url: data.signedUrl });
    } catch {
      setUploadError("사진을 불러오지 못했어요.");
    }
  };

  const beginEdit = (msg: MessageRow) => {
    setActionSheet(null);
    setEditing(msg);
    setDraft(msg.content);
    setDisappearMode(false);
    setShowAttach(false);
    inputRef.current?.focus();
  };

  const confirmDelete = (msg: MessageRow) => {
    setActionSheet(null);
    // 낙관적: 즉시 삭제 표시 (서버 확정으로 머지)
    mergeMessage({ ...msg, deleted_at: new Date().toISOString(), content: "", image_url: null });
    submitMessageAction("delete", msg.id);
  };

  return (
    <PhoneFrame style={{ paddingBottom: 0 }}>
      <StatusBar />

      {/* 헤더 — 이름 중앙정렬 (디자인 정합) */}
      <div
        style={{
          height: "52px",
          padding: "0 8px",
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "white",
          borderBottom: "none",
        }}
      >
        <button
          type="button"
          onClick={() => navigate("/music")}
          aria-label="back"
          style={{
            position: "absolute",
            left: "8px",
            fontSize: "22px",
            color: COLORS.text.secondary,
            padding: "4px 8px",
          }}
        >
          ‹
        </button>
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          {partnerPhoto && (
            <img
              src={partnerPhoto}
              alt=""
              style={{
                width: "30px",
                height: "30px",
                borderRadius: "50%",
                objectFit: "cover",
              }}
            />
          )}
          <span
            style={{
              ...TYPOGRAPHY.bodyBold,
              fontSize: "17px",
              color: COLORS.text.primary,
            }}
          >
            {match.partnerName}
          </span>
        </span>
        {!isEnded && (
          <button
            type="button"
            onClick={() => setShowEndConfirm(true)}
            style={{
              position: "absolute",
              right: "8px",
              ...TYPOGRAPHY.caption,
              color: COLORS.text.placeholder,
              padding: "6px 8px",
              fontSize: "13px",
            }}
          >
            채팅 끊기
          </button>
        )}
      </div>

      {/* 메시지 영역 */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "14px 18px 80px",
          background: "#fafafa",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        {messages.length === 0 && (
          <div style={{ marginTop: "40px" }}>
            <p
              style={{
                ...TYPOGRAPHY.label,
                color: COLORS.text.placeholder,
                textAlign: "center",
                margin: 0,
              }}
            >
              아직 메시지가 없어요. 먼저 인사해보세요!
            </p>
            {!isEnded && icebreakers.length > 0 && (
              <div style={{ marginTop: "24px" }}>
                <p
                  style={{
                    ...TYPOGRAPHY.caption,
                    color: COLORS.text.helper,
                    textAlign: "center",
                    margin: "0 0 12px",
                  }}
                >
                  ✨ 이렇게 시작해보세요
                </p>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    padding: "0 8px",
                  }}
                >
                  {icebreakers.map((text, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setDraft(text);
                        inputRef.current?.focus();
                      }}
                      style={{
                        textAlign: "left",
                        background: "white",
                        color: COLORS.text.primary,
                        border: `1px solid ${COLORS.accentSoft}`,
                        borderRadius: "14px",
                        padding: "12px 14px",
                        ...TYPOGRAPHY.label,
                        lineHeight: 1.45,
                        cursor: "pointer",
                      }}
                    >
                      {text}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        {messages.map((msg, i) => {
          const fromMe = msg.sender_id === currentUserId;
          const prev = i > 0 ? messages[i - 1] : null;
          // 날짜가 바뀌면 구분선 표시
          const showDate =
            !prev || !isSameDay(prev.created_at, msg.created_at);
          // 상대 메시지 묶음의 첫 줄에만 발신자 이름 표시
          const showSenderName =
            !fromMe && (showDate || !prev || prev.sender_id !== msg.sender_id);
          return (
            <Fragment key={msg.id}>
              {showDate && (
                <div
                  style={{
                    alignSelf: "center",
                    margin: "6px 0",
                    padding: "4px 12px",
                    borderRadius: "12px",
                    background: COLORS.cardBg,
                    ...TYPOGRAPHY.tiny,
                    fontSize: "11px",
                    color: COLORS.text.helper,
                  }}
                >
                  {formatDateLabel(msg.created_at)}
                </div>
              )}
              {showSenderName && (
                <span
                  style={{
                    alignSelf: "flex-start",
                    ...TYPOGRAPHY.caption,
                    fontSize: "12px",
                    color: COLORS.text.secondary,
                    margin: "2px 0 0 2px",
                  }}
                >
                  {match.partnerName}
                </span>
              )}
              <div
                style={{
                  alignSelf: fromMe ? "flex-end" : "flex-start",
                  maxWidth: "75%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: fromMe ? "flex-end" : "flex-start",
                  gap: "4px",
                }}
              >
              {msg.deleted_at ? (
                // 삭제 / 펑 소멸 — 양쪽에 안내만 남긴다
                <div
                  style={{
                    background: COLORS.cardBg,
                    color: COLORS.text.placeholder,
                    borderRadius: "16px",
                    padding: "10px 14px",
                    ...TYPOGRAPHY.body,
                    fontSize: "13px",
                    fontStyle: "italic",
                  }}
                >
                  {msg.disappear ? "💨 사라진 메시지" : "삭제된 메시지예요"}
                </div>
              ) : msg.view_once ? (
                // 한 번만 볼 수 있는 사진
                fromMe ? (
                  <div
                    style={{
                      background: COLORS.accentSoft,
                      borderRadius: "16px",
                      padding: "12px 16px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "2px",
                    }}
                  >
                    <span style={{ ...TYPOGRAPHY.label, fontSize: "13px", color: COLORS.text.primary }}>
                      📸 한 번만 볼 수 있는 사진
                    </span>
                    <span style={{ ...TYPOGRAPHY.tiny, fontSize: "11px", color: COLORS.text.placeholder }}>
                      {msg.viewed_at ? "상대가 확인함" : "열람 전"}
                    </span>
                  </div>
                ) : msg.image_url ? (
                  <button
                    type="button"
                    onClick={() => openViewOnce(msg)}
                    style={{
                      background: "white",
                      border: `1px solid ${COLORS.accentSoft}`,
                      borderRadius: "16px",
                      padding: "12px 16px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "2px",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <span style={{ ...TYPOGRAPHY.label, fontSize: "13px", color: COLORS.text.primary, fontWeight: 600 }}>
                      👁 한 번만 볼 수 있는 사진
                    </span>
                    <span style={{ ...TYPOGRAPHY.tiny, fontSize: "11px", color: COLORS.accent }}>
                      탭하여 보기 · 1회만 열람 가능
                    </span>
                  </button>
                ) : (
                  <div
                    style={{
                      background: COLORS.cardBg,
                      borderRadius: "16px",
                      padding: "12px 16px",
                      ...TYPOGRAPHY.label,
                      fontSize: "13px",
                      color: COLORS.text.placeholder,
                    }}
                  >
                    👁 사진이 사라졌어요
                  </div>
                )
              ) : (
                <>
                  {msg.image_url ? (
                    imageUrls[msg.image_url] ? (
                      <div style={{ borderRadius: "16px", overflow: "hidden" }}>
                        <SecureImg
                          src={imageUrls[msg.image_url]}
                          watermark={watermark}
                          style={{
                            maxWidth: "220px",
                            maxHeight: "280px",
                            width: "auto",
                            height: "auto",
                            borderRadius: "16px",
                            objectFit: "cover",
                            background: COLORS.cardBg,
                          }}
                        />
                      </div>
                    ) : (
                      <div
                        style={{
                          width: "180px",
                          height: "180px",
                          borderRadius: "16px",
                          background: COLORS.cardBg,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          ...TYPOGRAPHY.caption,
                          color: COLORS.text.placeholder,
                        }}
                      >
                        사진 불러오는 중…
                      </div>
                    )
                  ) : null}
                  {msg.content ? (
                    <div
                      onClick={fromMe ? () => setActionSheet(msg) : undefined}
                      style={{
                        background: fromMe ? COLORS.accentSoft : "white",
                        color: COLORS.text.primary,
                        borderRadius: "16px",
                        padding: "10px 14px",
                        ...TYPOGRAPHY.body,
                        fontSize: "14px",
                        lineHeight: 1.4,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        cursor: fromMe ? "pointer" : "default",
                      }}
                    >
                      {msg.content}
                    </div>
                  ) : null}
                </>
              )}
              {!msg.deleted_at && (
                <span
                  style={{
                    ...TYPOGRAPHY.tiny,
                    fontSize: "11px",
                    color: COLORS.text.muted,
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  {msg.disappear && <span title="읽으면 사라지는 메시지">💨</span>}
                  {msg.edited_at && <span>수정됨</span>}
                  {fromMe && (
                    <span style={{ color: msg.read_at ? COLORS.accent : COLORS.text.placeholder }}>
                      {msg.read_at ? "읽음" : "전송됨"}
                    </span>
                  )}
                  {formatBubbleTime(msg.created_at)}
                </span>
              )}
              </div>
            </Fragment>
          );
        })}
      </div>

      {/* 입력 폼 / 종료 안내 */}
      {isEnded ? (
        <div
          style={{
            position: "fixed",
            bottom: "34px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "390px",
            padding: "14px 16px",
            background: COLORS.cardBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            zIndex: 5,
          }}
        >
          <span
            style={{
              ...TYPOGRAPHY.label,
              color: COLORS.text.placeholder,
            }}
          >
            종료된 채팅입니다.
          </span>
        </div>
      ) : (
        <div
          style={{
            position: "fixed",
            bottom: "34px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "390px",
            background: "white",
            zIndex: 5,
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={onPickPhoto}
            style={{ display: "none" }}
          />

          {/* 수정 모드 안내 배너 */}
          {editing && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 16px",
                background: COLORS.accentSoft,
                borderTop: `1px solid ${COLORS.divider2}`,
              }}
            >
              <span style={{ ...TYPOGRAPHY.caption, color: COLORS.text.secondary }}>
                ✏️ 메시지 수정 중
              </span>
              <button
                type="button"
                onClick={() => {
                  setEditing(null);
                  setDraft("");
                }}
                style={{ ...TYPOGRAPHY.caption, color: COLORS.accent, padding: "2px 6px" }}
              >
                취소
              </button>
            </div>
          )}

          {/* 첨부/옵션 패널 */}
          {showAttach && !editing && (
            <div
              style={{
                display: "flex",
                gap: "8px",
                padding: "10px 16px",
                background: COLORS.cardBg,
                borderTop: `1px solid ${COLORS.divider2}`,
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                disabled={uploading}
                onClick={() => {
                  setViewOnceMode(false);
                  fileInputRef.current?.click();
                }}
                style={{
                  ...TYPOGRAPHY.caption,
                  padding: "8px 12px",
                  borderRadius: "12px",
                  background: "white",
                  border: `1px solid ${COLORS.cardBorder}`,
                  color: COLORS.text.primary,
                  cursor: "pointer",
                }}
              >
                📷 사진
              </button>
              <button
                type="button"
                disabled={uploading}
                onClick={() => {
                  setViewOnceMode(true);
                  fileInputRef.current?.click();
                }}
                style={{
                  ...TYPOGRAPHY.caption,
                  padding: "8px 12px",
                  borderRadius: "12px",
                  background: "white",
                  border: `1px solid ${COLORS.cardBorder}`,
                  color: COLORS.text.primary,
                  cursor: "pointer",
                }}
              >
                👁 한 번만 보기 사진
              </button>
              <button
                type="button"
                onClick={() => setDisappearMode((v) => !v)}
                style={{
                  ...TYPOGRAPHY.caption,
                  padding: "8px 12px",
                  borderRadius: "12px",
                  background: disappearMode ? COLORS.accent : "white",
                  border: `1px solid ${disappearMode ? COLORS.accent : COLORS.cardBorder}`,
                  color: disappearMode ? "white" : COLORS.text.primary,
                  cursor: "pointer",
                }}
              >
                💨 펑 {disappearMode ? "켜짐" : "꺼짐"}
              </button>
            </div>
          )}

          <form
            onSubmit={send}
            style={{
              position: "relative",
              padding: "10px 16px",
              borderTop: `1px solid ${COLORS.divider2}`,
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            {uploadError && (
              <span
                role="alert"
                style={{
                  position: "absolute",
                  top: "-26px",
                  left: "16px",
                  ...TYPOGRAPHY.caption,
                  color: COLORS.accent,
                }}
              >
                {uploadError}
              </span>
            )}
            <button
              type="button"
              onClick={() => setShowAttach((v) => !v)}
              disabled={uploading || !!editing}
              aria-label="첨부 / 옵션"
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                background: showAttach ? COLORS.accent : COLORS.cardBg,
                color: showAttach ? "white" : COLORS.text.secondary,
                fontSize: "20px",
                flexShrink: 0,
                cursor: uploading ? "wait" : "pointer",
                opacity: editing ? 0.4 : 1,
              }}
            >
              {uploading ? "…" : showAttach ? "×" : "+"}
            </button>
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={
                editing
                  ? "메시지 수정…"
                  : disappearMode
                    ? "💨 읽으면 사라지는 메시지"
                    : "메시지를 입력하세요"
              }
              maxLength={2000}
              style={{
                flex: 1,
                height: "40px",
                padding: "0 14px",
                borderRadius: "20px",
                background: COLORS.cardBg,
                ...TYPOGRAPHY.label,
                color: COLORS.text.primary,
              }}
            />
            <button
              type="submit"
              disabled={!draft.trim() || submitting}
              aria-label="send"
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                background: draft.trim() ? COLORS.accent : COLORS.cardBorder,
                color: "white",
                fontSize: "18px",
                cursor: draft.trim() ? "pointer" : "not-allowed",
              }}
            >
              {editing ? "✓" : "↑"}
            </button>
          </form>
        </div>
      )}

      {/* 채팅 끊기 확인 모달 */}
      {showEndConfirm && (
        <div
          className="overlay-in"
          onClick={() => !ending && setShowEndConfirm(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 100,
          }}
        >
          <div
            className="pop-in"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "300px",
              background: "white",
              borderRadius: "16px",
              padding: "26px 22px 18px",
              textAlign: "center",
            }}
          >
            <p
              style={{
                ...TYPOGRAPHY.bodyBold,
                fontSize: "17px",
                color: COLORS.text.primary,
                margin: 0,
                marginBottom: "8px",
              }}
            >
              채팅을 끊으시겠어요?
            </p>
            <p
              style={{
                ...TYPOGRAPHY.label,
                color: COLORS.text.helper,
                margin: 0,
                marginBottom: "20px",
                lineHeight: 1.5,
              }}
            >
              끊으면 양쪽 모두 더 이상
              <br />
              메시지를 보낼 수 없어요.
            </p>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                onClick={() => setShowEndConfirm(false)}
                disabled={ending}
                style={{
                  flex: 1,
                  height: "46px",
                  borderRadius: "12px",
                  background: COLORS.cardBg,
                  color: COLORS.text.secondary,
                  ...TYPOGRAPHY.bodyBold,
                }}
              >
                취소
              </button>
              <button
                type="button"
                onClick={confirmEnd}
                disabled={ending}
                style={{
                  flex: 1,
                  height: "46px",
                  borderRadius: "12px",
                  background: COLORS.accent,
                  color: "white",
                  ...TYPOGRAPHY.bodyBold,
                  opacity: ending ? 0.6 : 1,
                }}
              >
                {ending ? "끊는 중..." : "끊기"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 내 메시지 동작 시트 (수정/삭제) */}
      {actionSheet && (
        <div
          className="overlay-in"
          onClick={() => setActionSheet(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-end",
            zIndex: 100,
          }}
        >
          <div
            className="pop-in"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "390px",
              background: "white",
              borderTopLeftRadius: "18px",
              borderTopRightRadius: "18px",
              padding: "8px 0 28px",
            }}
          >
            {/* 사진 없는 텍스트 메시지만 수정 가능 */}
            {!actionSheet.image_url && (
              <button
                type="button"
                onClick={() => beginEdit(actionSheet)}
                style={{
                  width: "100%",
                  padding: "16px",
                  textAlign: "center",
                  ...TYPOGRAPHY.body,
                  color: COLORS.text.primary,
                }}
              >
                ✏️ 수정
              </button>
            )}
            <button
              type="button"
              onClick={() => confirmDelete(actionSheet)}
              style={{
                width: "100%",
                padding: "16px",
                textAlign: "center",
                ...TYPOGRAPHY.body,
                color: COLORS.accent,
              }}
            >
              🗑 삭제
            </button>
            <button
              type="button"
              onClick={() => setActionSheet(null)}
              style={{
                width: "100%",
                padding: "16px",
                textAlign: "center",
                ...TYPOGRAPHY.body,
                color: COLORS.text.secondary,
              }}
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* 한 번만 보기 사진 뷰어 — 캡처 억제 + 워터마크. 로드되면 즉시 열람 처리. */}
      {viewer && (
        <ViewOnceViewer
          url={viewer.url}
          watermark={watermark}
          onLoaded={() => submitMessageAction("view", viewer.id)}
          onClose={() => setViewer(null)}
        />
      )}

      {/* 캡처 억제: 탭/창을 벗어나면 화면을 가림 */}
      {obscured && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 400,
            background: "rgba(255,255,255,0.98)",
            backdropFilter: "blur(18px)",
            WebkitBackdropFilter: "blur(18px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            textAlign: "center",
            padding: "0 24px",
          }}
        >
          <span style={{ fontSize: "32px" }}>🔒</span>
          <span style={{ ...TYPOGRAPHY.bodyBold, color: COLORS.text.primary }}>
            보안을 위해 가려졌어요
          </span>
          <span style={{ ...TYPOGRAPHY.caption, color: COLORS.text.helper }}>
            화면 보호를 위해 대화 내용을 일시적으로 숨깁니다
          </span>
        </div>
      )}

      <HomeIndicator />
    </PhoneFrame>
  );
}
