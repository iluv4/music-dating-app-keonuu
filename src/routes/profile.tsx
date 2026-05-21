import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { Outlet } from "@remix-run/react";
import { requireUser } from "~/lib/auth.server";

// Profile 부모 레이아웃 — 모든 profile.* 자식 라우트가 인증 필요
export async function loader({ request }: LoaderFunctionArgs) {
  const ctx = await requireUser(request);
  return json({}, { headers: ctx.headers });
}

export default function ProfileLayout() {
  return <Outlet />;
}
