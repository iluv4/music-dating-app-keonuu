import { useEffect } from "react";
import { json, type LinksFunction, type MetaFunction } from "@remix-run/node";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "@remix-run/react";

import "./styles/globals.css";
import { initAnalytics } from "~/lib/analytics.client";
import GlobalLoadingBar from "~/components/GlobalLoadingBar";

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
];

const SITE_URL = "https://music-dating-app-keonuu.vercel.app";
const OG_TITLE = "뮤직매치 · 음악 취향으로 만나는 인연";
const OG_DESC =
  "같은 노래를 고른 사람과 매칭되어 대화를 시작하는 음악 취향 기반 소개팅 앱";
const OG_IMAGE = `${SITE_URL}/images/welcome-mascot.png`;

export const meta: MetaFunction = () => [
  { charset: "utf-8" },
  { name: "viewport", content: "width=device-width,initial-scale=1" },
  { title: OG_TITLE },
  { name: "description", content: OG_DESC },
  // 링크 공유 미리보기 (카카오톡/슬랙/X 등) — 마스코트 캐릭터 노출
  { property: "og:type", content: "website" },
  { property: "og:site_name", content: "뮤직매치" },
  { property: "og:title", content: OG_TITLE },
  { property: "og:description", content: OG_DESC },
  { property: "og:url", content: SITE_URL },
  { property: "og:image", content: OG_IMAGE },
  { property: "og:image:width", content: "600" },
  { property: "og:image:height", content: "547" },
  { property: "og:image:alt", content: "뮤직매치 마스코트" },
  { name: "twitter:card", content: "summary_large_image" },
  { name: "twitter:title", content: OG_TITLE },
  { name: "twitter:description", content: OG_DESC },
  { name: "twitter:image", content: OG_IMAGE },
];

// 브라우저 Supabase 클라이언트(Realtime) + PostHog 용 공개 키 노출
export async function loader() {
  return json({
    env: {
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
      POSTHOG_KEY: process.env.POSTHOG_KEY,
      POSTHOG_HOST: process.env.POSTHOG_HOST,
    },
  });
}

export type RootLoaderData = {
  env: {
    SUPABASE_URL: string;
    SUPABASE_ANON_KEY: string;
    POSTHOG_KEY?: string;
    POSTHOG_HOST?: string;
  };
};

export default function App() {
  const { env } = useLoaderData<typeof loader>();

  // window.ENV 세팅 직후 PostHog 초기화 (키 없으면 no-op)
  useEffect(() => {
    void initAnalytics();
  }, []);

  return (
    <html lang="ko">
      <head>
        <Meta />
        <Links />
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
