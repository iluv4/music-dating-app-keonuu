import type { LinksFunction } from "@remix-run/node";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import "./tailwind.css";

export const links: LinksFunction = () => [];

export default function App() {
  return (
    <html lang="ko">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>러비더비</title>
        <Meta />
        <Links />
      </head>
      <body>
        {/* 모바일 앱 캔버스 (가운데 정렬, 최대 420px) */}
        <div className="mx-auto flex min-h-screen w-full max-w-[420px] flex-col bg-cream shadow-card">
          <Outlet />
        </div>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
