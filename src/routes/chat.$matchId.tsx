import { useEffect, useRef, useState } from "react";
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
import BottomNav from "~/components/BottomNav";
import { COLORS, TYPOGRAPHY } from "~/lib/constants";
import { requireMatchAccess } from "~/lib/auth.server";
import {
  listMessages,
  markMessagesRead,
  sendMessage,
} from "~/lib/repos/messages.server";
import { endMatch } from "~/lib/repos/matches.server";
import type { MessageRow } from "~/lib/db-types";
import { getSupabaseBrowser } from "~/lib/supabase.client";
import { getClientEnv } from "~/lib/env.client";
import { capture } from "~/lib/analytics.client";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const matchId = params.matchId;
  if (!matchId) throw redirect("/chat");

  const ctx = await requireMatchAccess(request, matchId);
  const messages = await listMessages(ctx.supabase, matchId, 50);

  // 진입 시 상대 메시지 read_at 일괄 갱신 (실패해도 무시)
  await markMessagesRead(ctx.supabase, matchId, ctx.user.id);

  return json(
    {
      match: ctx.match,
      currentUserId: ctx.user.id,
      messages,
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

  // 일반 메시지 전송 (텍스트 또는 사진)
  const content = String(fd.get("content") ?? "");
  const imageUrlRaw = String(fd.get("image_url") ?? "").trim();
  // 업로드는 클라이언트가 Supabase Storage 에 직접 → 여기엔 public URL 만 전달.
  // 우리 스토리지 도메인의 URL 만 허용 (임의 외부 URL 주입 차단).
  const imageUrl =
    imageUrlRaw &&
    imageUrlRaw.startsWith(`${process.env.SUPABASE_URL}/storage/v1/object/public/`)
      ? imageUrlRaw
      : null;
  const result = await sendMessage(
    ctx.supabase,
    matchId,
    ctx.user.id,
    content,
    imageUrl,
  );
  if (!result.ok || !result.message) {
    return json(
      { error: result.error ?? "메시지를 보내지 못했어요. 다시 시도해주세요." },
      { status: 400, headers: ctx.headers },
    );
  }
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

export default function ChatRoom() {
  const { match, currentUserId, messages: initial } =
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const endFetcher = useFetcher<{ error?: string }>();
  const ending = endFetcher.state === "submitting";

  const isEnded = match.status === "ended";
  const confirmEnd = () => {
    const fd = new FormData();
    fd.set("intent", "end");
    endFetcher.submit(fd, { method: "post" });
  };

  // 새 메시지 도착 시 자동 스크롤
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
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
        .subscribe();
    };

    setup();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [matchId, currentUserId]);

  // sendFetcher 성공 시: 입력 비움 + 메시지 즉시 표시 (Realtime 실패해도 본인은 봄)
  useEffect(() => {
    if (sendFetcher.state !== "idle") return;
    const newMsg = sendFetcher.data?.message;
    if (!newMsg) return;
    setMessages((prev) => {
      if (prev.some((m) => m.id === newMsg.id)) return prev;
      return [...prev, newMsg];
    });
    setDraft("");
    inputRef.current?.focus();
  }, [sendFetcher.state, sendFetcher.data]);

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || submitting) return;
    const fd = new FormData();
    fd.set("content", trimmed);
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
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${matchId}/${currentUserId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("chat-images")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;

      const { data } = supabase.storage.from("chat-images").getPublicUrl(path);
      const fd = new FormData();
      fd.set("image_url", data.publicUrl);
      sendFetcher.submit(fd, { method: "post" });
      capture("message.sent", { match_id: matchId, has_image: true });
    } catch (err) {
      console.error("[chat photo upload]", err);
      setUploadError("사진 전송에 실패했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <PhoneFrame style={{ paddingBottom: "107px" }}>
      <StatusBar />

      {/* 헤더 */}
      <div
        style={{
          height: "52px",
          padding: "0 16px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          background: "white",
          borderBottom: "none",
        }}
      >
        <button
          type="button"
          onClick={() => navigate("/music")}
          aria-label="back"
          style={{
            fontSize: "22px",
            color: COLORS.text.secondary,
            padding: "4px 6px",
          }}
        >
          ‹
        </button>
        <div
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            background: COLORS.accentSoft,
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <img
            src="/images/profile-mascot.png"
            alt=""
            style={{ width: "30px", height: "30px", objectFit: "contain" }}
          />
        </div>
        <span
          style={{
            ...TYPOGRAPHY.bodyBold,
            color: COLORS.text.primary,
            flex: 1,
          }}
        >
          {match.partnerName}
        </span>
        {!isEnded && (
          <button
            type="button"
            onClick={() => setShowEndConfirm(true)}
            style={{
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
          <p
            style={{
              ...TYPOGRAPHY.label,
              color: COLORS.text.placeholder,
              textAlign: "center",
              marginTop: "40px",
            }}
          >
            아직 메시지가 없어요. 먼저 인사해보세요!
          </p>
        )}
        {messages.map((msg) => {
          const fromMe = msg.sender_id === currentUserId;
          return (
            <div
              key={msg.id}
              style={{
                alignSelf: fromMe ? "flex-end" : "flex-start",
                maxWidth: "75%",
                display: "flex",
                flexDirection: "column",
                alignItems: fromMe ? "flex-end" : "flex-start",
                gap: "4px",
              }}
            >
              {msg.image_url ? (
                <a
                  href={msg.image_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: "block", borderRadius: "16px", overflow: "hidden" }}
                >
                  <img
                    src={msg.image_url}
                    alt="사진 메시지"
                    loading="lazy"
                    style={{
                      display: "block",
                      maxWidth: "220px",
                      maxHeight: "280px",
                      width: "auto",
                      height: "auto",
                      borderRadius: "16px",
                      objectFit: "cover",
                      background: COLORS.cardBg,
                    }}
                  />
                </a>
              ) : null}
              {msg.content ? (
                <div
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
                  }}
                >
                  {msg.content}
                </div>
              ) : null}
              <span
                style={{
                  ...TYPOGRAPHY.tiny,
                  fontSize: "11px",
                  color: COLORS.text.muted,
                }}
              >
                {formatBubbleTime(msg.created_at)}
              </span>
            </div>
          );
        })}
      </div>

      {/* 입력 폼 / 종료 안내 */}
      {isEnded ? (
        <div
          style={{
            position: "fixed",
            bottom: "107px",
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
        <form
          onSubmit={send}
          style={{
            position: "fixed",
            bottom: "107px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "390px",
            padding: "10px 16px",
            background: "white",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            zIndex: 5,
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
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={onPickPhoto}
            style={{ display: "none" }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            aria-label="사진 보내기"
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: COLORS.cardBg,
              color: COLORS.text.secondary,
              fontSize: "18px",
              flexShrink: 0,
              cursor: uploading ? "wait" : "pointer",
            }}
          >
            {uploading ? "…" : "📷"}
          </button>
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="메시지를 입력하세요"
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
            ↑
          </button>
        </form>
      )}

      {/* 채팅 끊기 확인 모달 */}
      {showEndConfirm && (
        <div
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

      <BottomNav active="chat" />
      <HomeIndicator />
    </PhoneFrame>
  );
}
