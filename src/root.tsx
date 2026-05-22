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
  // Pretendard is NOT on Google Fonts; the old URL 404'd and blocked render.
  { rel: "preconnect", href: "https://cdn.jsdelivr.net", crossOrigin: "anonymous" },
  {
    rel: "stylesheet",
    href: "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css",
  },
];

export const meta: MetaFunction = () => [
  { charset: "utf-8" },
  { name: "viewport", content: "width=device-width,initial-scale=1" },
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
