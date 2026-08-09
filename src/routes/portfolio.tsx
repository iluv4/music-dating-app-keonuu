import type { MetaFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { COLORS, FONT_STACK, RADIUS } from "~/lib/constants";
import { getSiteUrl } from "~/lib/site-url.server";

/**
 * /portfolio — 공개 케이스 스터디 / 포트폴리오 페이지.
 * 인증 게이트 없이 누구나 접근 가능(앱 본 흐름과 분리).
 *
 * ▼▼▼ 작성자 정보: 아래 PROFILE 값을 채우면 페이지·푸터·연락처에 반영됩니다 ▼▼▼
 *  (현재는 플레이스홀더 — 이름/연락처/링크를 본인 것으로 교체하세요)
 */
const PROFILE = {
  name: "한현민",
  role: "Frontend · Full-stack Developer",
  tagline: "음악 취향으로 사람을 잇는 제품을 만듭니다.",
  email: "4mins12@gmail.com",
  // 비워두면 해당 버튼이 숨겨집니다.
  github: "",
  blog: "",
};

const PROJECT = {
  name: "뮤직매치",
  subtitle: "음악 취향 기반 1:1 매칭 + 채팅 PWA",
  period: "2026.04 — 2026.06",
  team: "멋쟁이사자처럼 1조 (기획·디자인·개발 협업)",
  repo: "https://github.com/iluv4/music-dating-app-keonuu",
} as const;

export const meta: MetaFunction<typeof loader> = () => [
  { title: `${PROFILE.name === "{{이름}}" ? "포트폴리오" : PROFILE.name} · ${PROJECT.name} 케이스 스터디` },
  {
    name: "description",
    content: `${PROJECT.name} — ${PROJECT.subtitle}. Remix + Supabase + Railway 풀스택 프로젝트 케이스 스터디.`,
  },
  // 포트폴리오는 모바일 프레임이 아닌 일반 반응형 문서
  { name: "viewport", content: "width=device-width,initial-scale=1" },
];

export async function loader({ request: _request }: LoaderFunctionArgs) {
  return json({ liveUrl: getSiteUrl() });
}

// ─────────────────────────────────────────────────────────────────────────
// 콘텐츠 데이터 (팀 구성 정직 반영: 디자인=디자이너, 초기 회원가입/DB=다른 백엔드)
// ─────────────────────────────────────────────────────────────────────────

const STACK = [
  { group: "Frontend", items: ["Remix v2", "React 18", "TypeScript", "PWA / Service Worker"] },
  { group: "Backend", items: ["Supabase (Postgres)", "Auth", "Realtime", "Row Level Security"] },
  { group: "Infra", items: ["Railway (자동 배포)", "Web Push (VAPID)", "CI 색상 가드 (husky)"] },
  { group: "Data / 외부", items: ["Melona (멜론 검색)", "PostHog", "Amplitude", "GA4"] },
];

const FEATURES = [
  {
    icon: "🎵",
    title: "취향 온보딩",
    desc: "멜론 검색으로 곡 3개 · 장르 3개를 고르는 단계형 가입 플로우. 학교/학과/동아리까지 프로필 구성.",
  },
  {
    icon: "💞",
    title: "1:1 매칭",
    desc: "취향이 맞는 상대와 1:1로 연결. 재매칭 시 재참여가 필요한 운영 모델로 매칭 가치를 보존.",
  },
  {
    icon: "💬",
    title: "실시간 채팅",
    desc: "Supabase Realtime 기반 1:1 채팅. 메시지 수정/삭제, 읽으면 사라지는 '펑', 1회만 보는 사진.",
  },
  {
    icon: "🔒",
    title: "프라이버시 보호",
    desc: "민감 사진 캡처 억제 — 워터마크 · 우클릭/드래그 차단 · 탭 이탈 시 가림 처리.",
  },
  {
    icon: "👀",
    title: "비로그인 둘러보기",
    desc: "가입 전 방문자도 샘플 데이터로 홈/탐색/채팅을 미리 체험 → 전환 유도.",
  },
  {
    icon: "🔔",
    title: "PWA 푸시",
    desc: "Web Push(VAPID)로 접속 중이 아니어도 알림. 홈 화면 설치로 앱처럼 사용.",
  },
];

const HIGHLIGHTS = [
  {
    title: "동시성 안전 매칭",
    problem: "두 요청이 동시에 같은 사용자를 매칭하면 중복 active 쌍이 생길 수 있음.",
    solution:
      "Postgres advisory lock으로 매칭 생성을 직렬화하고, active 쌍에 부분 유니크 인덱스(partial unique index)를 걸어 DB 레벨에서 중복을 원천 차단.",
    tags: ["Postgres", "advisory lock", "partial index"],
  },
  {
    title: "외부 API 장애 격리",
    problem: "비공식 멜론 검색(Melona)은 느리거나 간헐적으로 실패함.",
    solution:
      "서버 인메모리 캐시(검색 10분 · 차트 5분)로 재호출을 줄이고, 장애 시엔 폴백 곡 목록을 필터링해 반환 + 실패 응답은 30초만 짧게 캐시해 빠르게 복구.",
    tags: ["caching", "graceful fallback", "TTL"],
  },
  {
    title: "서버/클라이언트 경계 분리",
    problem: "service_role 키·DB 접근이 클라이언트로 새면 치명적.",
    solution:
      "DB 쿼리는 `lib/repos/*.server.ts`에만, 서버 전용 모듈은 `.server.ts` 네이밍으로 번들 분리. RLS로 행 단위 권한을 이중 방어.",
    tags: ["RLS", ".server.ts", "repo layer"],
  },
  {
    title: "디자인 시스템 + CI 가드",
    problem: "브랜드색이 시안과 어긋나 여러 색이 혼재(마젠타 vs 코랄).",
    solution:
      "토큰을 `constants.ts` 한 곳으로 일원화하고, 폐기색이 커밋되면 pre-commit(husky)에서 `lint:colors`가 자동 차단 — 색 충돌 재발을 구조적으로 방지.",
    tags: ["design tokens", "husky", "lint"],
  },
];

const METRICS = [
  { value: "30+", label: "Remix 라우트" },
  { value: "3", label: "분석 파이프라인 통합" },
  { value: "PWA", label: "설치형 + Web Push" },
  { value: "RLS", label: "행 단위 보안" },
];

// 본인 기여 vs 협업자 — 과장 없이 구분
const CONTRIBUTIONS = {
  mine: [
    "매칭 동시성 버그 수정 (advisory lock + 부분 유니크 인덱스)",
    "실시간 채팅 고급 기능 (수정/삭제 · '펑' · 1회보기 사진 · 캡처 억제)",
    "멜론 검색 캐싱 + 장애 폴백 설계",
    "비로그인 둘러보기(샘플 데이터 미리보기) 플로우",
    "PWA Web Push 연동 · 분석 파이프라인(PostHog/Amplitude/GA4) 통합",
    "디자인 토큰 일원화 + 색상 CI 가드 구축",
  ],
  others: [
    { who: "디자이너", what: "전체 UI/UX 디자인 (Figma 디자인 시스템)" },
    { who: "다른 백엔드 개발자", what: "초기 회원가입 플로우 · 데이터베이스 기초 설계" },
  ],
};

// ─────────────────────────────────────────────────────────────────────────

export default function Portfolio() {
  const { liveUrl } = useLoaderData<typeof loader>();
  const hasName = PROFILE.name !== "{{이름}}";

  return (
    <main style={styles.page}>
      <style dangerouslySetInnerHTML={{ __html: css }} />

      {/* HERO */}
      <section style={styles.hero}>
        <div style={styles.heroInner}>
          <span style={styles.eyebrow}>CASE STUDY · {PROJECT.period}</span>
          <h1 style={styles.h1}>
            {PROJECT.name}
            <span style={styles.h1Accent}> ♪</span>
          </h1>
          <p style={styles.heroSub}>{PROJECT.subtitle}</p>
          <p style={styles.heroDesc}>
            같은 노래를 고른 사람과 매칭되어 대화를 시작하는, 대학생 대상 음악
            취향 기반 소개팅 웹앱. Remix · Supabase · Railway 풀스택.
          </p>
          <div style={styles.ctaRow}>
            <a className="pf-btn pf-btn-primary" href={liveUrl} target="_blank" rel="noreferrer">
              라이브 데모 보기 →
            </a>
            <a className="pf-btn pf-btn-ghost" href={PROJECT.repo} target="_blank" rel="noreferrer">
              GitHub 저장소
            </a>
          </div>
        </div>
      </section>

      {/* METRICS */}
      <section style={styles.metricsWrap}>
        <div className="pf-metrics" style={styles.metrics}>
          {METRICS.map((m) => (
            <div key={m.label} style={styles.metricCard}>
              <div style={styles.metricValue}>{m.value}</div>
              <div style={styles.metricLabel}>{m.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* OVERVIEW */}
      <Section title="개요" subtitle="Overview">
        <div className="pf-overview" style={styles.overview}>
          <Panel label="문제">
            소개팅 앱은 많지만 “무엇을 좋아하는가”로 시작하는 대화는 드뭅니다.
            대학생들이 부담 없이, 공통의 음악 취향을 매개로 자연스럽게 연결될
            방법이 필요했습니다.
          </Panel>
          <Panel label="해법">
            곡·장르를 고르는 가벼운 온보딩 → 취향 기반 1:1 매칭 → 실시간 채팅.
            모바일 PWA로 설치 없이 시작하고, 푸시로 다시 끌어들입니다.
          </Panel>
          <Panel label="역할">
            팀 협업 프로젝트({PROJECT.team}). 디자인과 초기 가입/DB는 동료가
            맡았고, 저는 매칭·채팅·인프라·데이터 안정성 등 핵심 기능 개발을
            담당했습니다.
          </Panel>
        </div>
      </Section>

      {/* STACK */}
      <Section title="기술 스택" subtitle="Tech Stack">
        <div className="pf-stack" style={styles.stackGrid}>
          {STACK.map((s) => (
            <div key={s.group} style={styles.stackCol}>
              <h3 style={styles.stackGroup}>{s.group}</h3>
              <div style={styles.badgeWrap}>
                {s.items.map((i) => (
                  <span key={i} style={styles.badge}>
                    {i}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* FEATURES */}
      <Section title="주요 기능" subtitle="Features">
        <div className="pf-features" style={styles.featureGrid}>
          {FEATURES.map((f) => (
            <div key={f.title} className="pf-card" style={styles.featureCard}>
              <span style={styles.featureIcon}>{f.icon}</span>
              <h3 style={styles.featureTitle}>{f.title}</h3>
              <p style={styles.featureDesc}>{f.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ENGINEERING HIGHLIGHTS */}
      <Section title="엔지니어링 하이라이트" subtitle="Deep Dives">
        <div style={styles.highlightList}>
          {HIGHLIGHTS.map((h, idx) => (
            <div key={h.title} className="pf-card" style={styles.highlightCard}>
              <div style={styles.highlightNum}>{String(idx + 1).padStart(2, "0")}</div>
              <div style={styles.highlightBody}>
                <h3 style={styles.highlightTitle}>{h.title}</h3>
                <p style={styles.problemLine}>
                  <strong style={{ color: COLORS.accent }}>문제 </strong>
                  {h.problem}
                </p>
                <p style={styles.solutionLine}>
                  <strong style={{ color: COLORS.text.primary }}>해결 </strong>
                  {h.solution}
                </p>
                <div style={styles.badgeWrap}>
                  {h.tags.map((t) => (
                    <span key={t} style={styles.tagSmall}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ARCHITECTURE */}
      <Section title="아키텍처" subtitle="Architecture">
        <div className="pf-arch" style={styles.archRow}>
          <ArchNode title="Client (PWA)" items={["Remix Routes", "Service Worker", "Realtime 구독"]} />
          <ArchArrow />
          <ArchNode title="Remix Server" items={["loaders/actions", "repos/*.server.ts", "Web Push"]} />
          <ArchArrow />
          <ArchNode title="Supabase" items={["Postgres + RLS", "Auth", "Realtime"]} />
        </div>
        <p style={styles.archNote}>
          외부: Melona(멜론 검색) · 분석(PostHog/Amplitude/GA4) · 배포 Railway(main 푸시 시 자동 배포)
        </p>
      </Section>

      {/* TEAM & CONTRIBUTION */}
      <Section title="팀 & 내 기여" subtitle="Team & My Role">
        <div className="pf-team" style={styles.teamGrid}>
          <div className="pf-card" style={{ ...styles.featureCard, borderColor: COLORS.accent }}>
            <h3 style={styles.featureTitle}>
              <span style={{ color: COLORS.accent }}>●</span> 내가 담당한 부분
            </h3>
            <ul style={styles.list}>
              {CONTRIBUTIONS.mine.map((c) => (
                <li key={c} style={styles.listItem}>
                  {c}
                </li>
              ))}
            </ul>
          </div>
          <div className="pf-card" style={styles.featureCard}>
            <h3 style={styles.featureTitle}>함께한 동료</h3>
            <ul style={styles.list}>
              {CONTRIBUTIONS.others.map((o) => (
                <li key={o.who} style={styles.listItem}>
                  <strong>{o.who}</strong> — {o.what}
                </li>
              ))}
            </ul>
            <p style={styles.teamNote}>
              협업 프로젝트로, 위 분담은 정직하게 구분해 표기했습니다.
            </p>
          </div>
        </div>
      </Section>

      {/* CONTACT / FOOTER */}
      <footer style={styles.footer}>
        <h2 style={styles.footerTitle}>{hasName ? `${PROFILE.name} · ${PROFILE.role}` : "연락처"}</h2>
        <p style={styles.footerTagline}>{PROFILE.tagline}</p>
        <div style={styles.ctaRow}>
          {PROFILE.email !== "{{you@example.com}}" && (
            <a className="pf-btn pf-btn-primary" href={`mailto:${PROFILE.email}`}>
              이메일
            </a>
          )}
          {PROFILE.github && !PROFILE.github.includes("{{") && (
            <a className="pf-btn pf-btn-ghost" href={PROFILE.github} target="_blank" rel="noreferrer">
              GitHub
            </a>
          )}
          {PROFILE.blog && (
            <a className="pf-btn pf-btn-ghost" href={PROFILE.blog} target="_blank" rel="noreferrer">
              Blog
            </a>
          )}
        </div>
        {!hasName && (
          <p style={styles.placeholderHint}>
            ⓘ 이 영역은 <code>src/routes/portfolio.tsx</code>의 <code>PROFILE</code>에 이름·연락처를
            채우면 자동으로 표시됩니다.
          </p>
        )}
        <p style={styles.copyright}>
          © {new Date().getFullYear()} {PROJECT.name}. Built with Remix · Supabase · Railway.
        </p>
      </footer>
    </main>
  );
}

// ── 재사용 컴포넌트 ────────────────────────────────────────────────────────

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section style={styles.section}>
      <div style={styles.sectionHead}>
        <span style={styles.sectionSub}>{subtitle}</span>
        <h2 style={styles.sectionTitle}>{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Panel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="pf-card" style={styles.panel}>
      <div style={styles.panelLabel}>{label}</div>
      <p style={styles.panelText}>{children}</p>
    </div>
  );
}

function ArchNode({ title, items }: { title: string; items: string[] }) {
  return (
    <div style={styles.archNode}>
      <div style={styles.archTitle}>{title}</div>
      <ul style={styles.archList}>
        {items.map((i) => (
          <li key={i} style={styles.archItem}>
            {i}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ArchArrow() {
  return <div className="pf-arrow" style={styles.archArrow}>→</div>;
}

// ── 스타일 ────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  page: {
    fontFamily: FONT_STACK.brand,
    color: COLORS.text.primary,
    background: COLORS.bg,
    margin: 0,
    overflowX: "hidden",
  },
  hero: {
    background: `linear-gradient(160deg, ${COLORS.accentSoft} 0%, ${COLORS.bg} 70%)`,
    padding: "96px 24px 72px",
  },
  heroInner: { maxWidth: 880, margin: "0 auto", textAlign: "center" },
  eyebrow: {
    display: "inline-block",
    color: COLORS.accent,
    fontWeight: 700,
    fontSize: 13,
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  h1: { fontSize: 64, fontWeight: 800, lineHeight: 1.05, margin: "0 0 12px", letterSpacing: "-1.5px" },
  h1Accent: { color: COLORS.accent },
  heroSub: { fontSize: 22, fontWeight: 700, margin: "0 0 16px", color: COLORS.text.primary },
  heroDesc: {
    fontSize: 17,
    lineHeight: 1.6,
    color: COLORS.text.secondary,
    maxWidth: 620,
    margin: "0 auto 32px",
  },
  ctaRow: { display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" },
  metricsWrap: { padding: "0 24px", marginTop: -36 },
  metrics: {
    maxWidth: 880,
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 16,
  },
  metricCard: {
    background: COLORS.bg,
    border: `1px solid ${COLORS.cardBorder}`,
    borderRadius: RADIUS.card,
    padding: "22px 12px",
    textAlign: "center",
    boxShadow: "0 6px 20px rgba(0,0,0,0.05)",
  },
  metricValue: { fontSize: 30, fontWeight: 800, color: COLORS.accent },
  metricLabel: { fontSize: 13, color: COLORS.text.secondary, marginTop: 4 },
  section: { maxWidth: 980, margin: "0 auto", padding: "72px 24px" },
  sectionHead: { marginBottom: 36, textAlign: "center" },
  sectionSub: {
    color: COLORS.accent,
    fontWeight: 700,
    fontSize: 13,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  sectionTitle: { fontSize: 34, fontWeight: 800, margin: "6px 0 0", letterSpacing: "-0.8px" },
  overview: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 },
  panel: {
    background: COLORS.cardBg,
    border: `1px solid ${COLORS.cardBorder}`,
    borderRadius: RADIUS.card,
    padding: 24,
  },
  panelLabel: { color: COLORS.accent, fontWeight: 800, fontSize: 14, marginBottom: 10 },
  panelText: { margin: 0, fontSize: 15, lineHeight: 1.65, color: COLORS.text.secondary },
  stackGrid: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 28 },
  stackCol: {},
  stackGroup: { fontSize: 16, fontWeight: 800, margin: "0 0 12px" },
  badgeWrap: { display: "flex", flexWrap: "wrap", gap: 8 },
  badge: {
    background: COLORS.accentSoft,
    color: COLORS.accent,
    fontWeight: 700,
    fontSize: 14,
    padding: "8px 14px",
    borderRadius: RADIUS.pill,
  },
  featureGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 },
  featureCard: {
    background: COLORS.bg,
    border: `1px solid ${COLORS.cardBorder}`,
    borderRadius: RADIUS.card,
    padding: 26,
  },
  featureIcon: { fontSize: 30 },
  featureTitle: { fontSize: 18, fontWeight: 800, margin: "14px 0 8px" },
  featureDesc: { margin: 0, fontSize: 15, lineHeight: 1.6, color: COLORS.text.secondary },
  highlightList: { display: "flex", flexDirection: "column", gap: 18 },
  highlightCard: {
    display: "flex",
    gap: 22,
    background: COLORS.bg,
    border: `1px solid ${COLORS.cardBorder}`,
    borderRadius: RADIUS.card,
    padding: 28,
  },
  highlightNum: { fontSize: 34, fontWeight: 800, color: COLORS.accentSoft, lineHeight: 1, flexShrink: 0 },
  highlightBody: { flex: 1 },
  highlightTitle: { fontSize: 20, fontWeight: 800, margin: "0 0 12px" },
  problemLine: { margin: "0 0 8px", fontSize: 15, lineHeight: 1.6, color: COLORS.text.secondary },
  solutionLine: { margin: "0 0 14px", fontSize: 15, lineHeight: 1.65, color: COLORS.text.primary },
  tagSmall: {
    background: COLORS.cardBg,
    border: `1px solid ${COLORS.cardBorder}`,
    color: COLORS.text.secondary,
    fontWeight: 600,
    fontSize: 12.5,
    padding: "5px 10px",
    borderRadius: RADIUS.info,
  },
  archRow: { display: "flex", alignItems: "stretch", justifyContent: "center", gap: 12, flexWrap: "wrap" },
  archNode: {
    flex: "1 1 200px",
    minWidth: 180,
    background: COLORS.cardBg,
    border: `1px solid ${COLORS.cardBorder}`,
    borderRadius: RADIUS.card,
    padding: 20,
  },
  archTitle: { fontWeight: 800, fontSize: 16, marginBottom: 10, color: COLORS.accent },
  archList: { margin: 0, paddingLeft: 18 },
  archItem: { fontSize: 14, lineHeight: 1.7, color: COLORS.text.secondary },
  archArrow: { alignSelf: "center", fontSize: 24, color: COLORS.text.muted, fontWeight: 700 },
  archNote: { textAlign: "center", fontSize: 14, color: COLORS.text.secondary, marginTop: 22 },
  teamGrid: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20 },
  list: { margin: "6px 0 0", paddingLeft: 20 },
  listItem: { fontSize: 15, lineHeight: 1.75, color: COLORS.text.secondary },
  teamNote: { fontSize: 13, color: COLORS.text.helper, marginTop: 14, marginBottom: 0 },
  footer: {
    background: COLORS.text.primary,
    color: COLORS.bg,
    textAlign: "center",
    padding: "72px 24px 56px",
    marginTop: 40,
  },
  footerTitle: { fontSize: 28, fontWeight: 800, margin: "0 0 10px", color: COLORS.bg },
  footerTagline: { fontSize: 16, color: "#c9c9c9", margin: "0 0 28px" },
  placeholderHint: { fontSize: 13, color: "#9f9f9f", marginTop: 24, lineHeight: 1.6 },
  copyright: { fontSize: 13, color: "#8a8a8a", marginTop: 28 },
};

const css = `
  .pf-btn {
    display: inline-block;
    padding: 14px 26px;
    border-radius: ${RADIUS.button};
    font-weight: 700;
    font-size: 16px;
    text-decoration: none;
    transition: transform .15s ease, box-shadow .15s ease, background .15s ease;
    cursor: pointer;
  }
  .pf-btn-primary { background: ${COLORS.accent}; color: #fff; box-shadow: 0 8px 20px rgba(255,98,93,.32); }
  .pf-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 12px 26px rgba(255,98,93,.42); }
  .pf-btn-ghost { background: transparent; color: ${COLORS.accent}; border: 1.5px solid ${COLORS.accent}; }
  .pf-btn-ghost:hover { background: ${COLORS.accentSoft}; transform: translateY(-2px); }
  .pf-card { transition: transform .18s ease, box-shadow .18s ease; }
  .pf-card:hover { transform: translateY(-4px); box-shadow: 0 14px 32px rgba(0,0,0,.08); }
  @media (max-width: 760px) {
    .pf-metrics { grid-template-columns: repeat(2, 1fr) !important; }
    .pf-overview, .pf-stack, .pf-features, .pf-team { grid-template-columns: 1fr !important; }
    .pf-arch { flex-direction: column; }
    .pf-arrow { transform: rotate(90deg); }
  }
`;
