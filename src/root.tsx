import { useEffect } from "react";
import { json, type LinksFunction, type MetaFunction } from "@remix-run/node";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  useLocation,
} from "@remix-run/react";

import "./styles/globals.css";
import { initAnalytics } from "~/lib/analytics.client";
import GlobalLoadingBar from "~/components/GlobalLoadingBar";
import { getSiteUrl } from "~/lib/site-url.server";

export const links: LinksFunction = () => [
  // 파비콘 (브랜드 로고) — /favicon.ico 404 제거
  { rel: "icon", type: "image/png", href: "/images/logo.png" },
  { rel: "apple-touch-icon", href: "/images/logo.png" },
  // Pretendard is NOT on Google Fonts; the old URL 404'd and blocked render.
  { rel: "preconnect", href: "https://cdn.jsdelivr.net", crossOrigin: "anonymous" },
  {
    rel: "stylesheet",
    href: "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css",
  },
  { rel: "manifest", href: "/manifest.json" },
];

const OG_TITLE = "뮤직매치 · 음악 취향으로 만나는 인연";
const OG_DESC =
  "같은 노래를 고른 사람과 매칭되어 대화를 시작하는 음악 취향 기반 소개팅 앱";

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  // 배포 도메인(SITE_URL/Railway 자동 도메인)을 loader 에서 받아 절대 URL 구성
  const siteUrl = data?.siteUrl ?? "https://music-dating-app-keonuu.up.railway.app";
  const ogImage = `${siteUrl}/images/welcome-mascot.png`;
  return [
    { charset: "utf-8" },
    { name: "theme-color", content: "#ff625d" },
    {
      name: "viewport",
      // interactive-widget: 키보드가 뜰 때 레이아웃을 밀어올려 입력창이 가려지지 않게
      content:
        "width=device-width,initial-scale=1,interactive-widget=resizes-content",
    },
    { title: OG_TITLE },
    { name: "description", content: OG_DESC },
    // 링크 공유 미리보기 (카카오톡/슬랙/X 등) — 마스코트 캐릭터 노출
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: "뮤직매치" },
    { property: "og:title", content: OG_TITLE },
    { property: "og:description", content: OG_DESC },
    { property: "og:url", content: siteUrl },
    { property: "og:image", content: ogImage },
    { property: "og:image:width", content: "600" },
    { property: "og:image:height", content: "547" },
    { property: "og:image:alt", content: "뮤직매치 마스코트" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: OG_TITLE },
    { name: "twitter:description", content: OG_DESC },
    { name: "twitter:image", content: ogImage },
  ];
};

// PostHog 공개 클라이언트 키(phc_*) — 어차피 window.ENV 로 브라우저에 노출되는 공개값.
// env 가 우선이고, 미설정 시 이 기본값으로 폴백해 별도 env 없이도 트래킹/리플레이 동작.
const POSTHOG_KEY_DEFAULT = "phc_tJJ9JhT6UCDvB4PzmLeGqLPqY8rZb7DU2MiX6LtSDkgY";
const POSTHOG_HOST_DEFAULT = "https://us.i.posthog.com";
// Amplitude 브라우저 키 — PostHog 와 같은 공개값 정책(브라우저 전송용). env 우선, 미설정 시 폴백.
const AMPLITUDE_KEY_DEFAULT = "28e9d25bf96f1b7abd44383f43700511";

// 브라우저 Supabase 클라이언트(Realtime) + PostHog 용 공개 키 노출
export async function loader() {
  return json({
    siteUrl: getSiteUrl(),
    env: {
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
      POSTHOG_KEY: process.env.POSTHOG_KEY || POSTHOG_KEY_DEFAULT,
      POSTHOG_HOST: process.env.POSTHOG_HOST || POSTHOG_HOST_DEFAULT,
      AMPLITUDE_API_KEY: process.env.AMPLITUDE_API_KEY || AMPLITUDE_KEY_DEFAULT,
      // Google Analytics(GA4) 측정 ID(G-XXXXXXX). 미설정 시 GA 비활성.
      GA_MEASUREMENT_ID: process.env.GA_MEASUREMENT_ID,
      VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY,
    },
  });
}

export type RootLoaderData = {
  env: {
    SUPABASE_URL: string;
    SUPABASE_ANON_KEY: string;
    POSTHOG_KEY?: string;
    POSTHOG_HOST?: string;
    AMPLITUDE_API_KEY?: string;
    GA_MEASUREMENT_ID?: string;
    VAPID_PUBLIC_KEY?: string;
  };
};

export default function App() {
  const { env } = useLoaderData<typeof loader>();
  const location = useLocation();
  const gaId = env.GA_MEASUREMENT_ID;

  // window.ENV 세팅 직후 PostHog 초기화 (키 없으면 no-op)
  useEffect(() => {
    void initAnalytics();
  }, []);

  // GA4 SPA 페이지뷰: Remix 라우트 전환은 풀 페이지 로드가 아니라 자동 집계가 안 됨.
  // → location 변경 시(최초 마운트 포함) page_view 를 수동 전송. gtag 없으면 no-op.
  useEffect(() => {
    if (!gaId || typeof window === "undefined" || typeof window.gtag !== "function") {
      return;
    }
    window.gtag("event", "page_view", {
      page_path: location.pathname + location.search,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [gaId, location.pathname, location.search]);

  return (
    <html lang="ko">
      <head>
        <Meta />
        <Links />
        {gaId ? (
          <>
            <script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
            />
            <script
              // gtag 초기화. send_page_view:false → 위 useEffect 가 페이지뷰를 전담해 중복 집계 방지.
              dangerouslySetInnerHTML={{
                __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config','${gaId}',{send_page_view:false});`,
              }}
            />
          </>
        ) : null}
      </head>
      <body>
        <GlobalLoadingBar />
        <Outlet />
        <ScrollRestoration />
        <script
          // 클라이언트가 window.ENV 로 접근
          dangerouslySetInnerHTML={{
            __html: `window.ENV = ${JSON.stringify(env)};`,
          }}
        />
        <Scripts />
      </body>
    </html>
  );
}
