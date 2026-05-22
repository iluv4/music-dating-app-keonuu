import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { Outlet } from "@remix-run/react";
import { requireUser } from "~/lib/auth.server";

// Profile 부모 레이아웃 — 모든 profile.* 자식 라우트가 인증 필요
export async function loader({ request }: LoaderFunctionArgs) {
  const ctx = await requireUser(request);
  return json({}, { headers: ctx.headers });
}

// profile.* 스텝 간 이동 시 부모 인증 게이트(requireUser → getUser 네트워크 왕복)를
// 매번 다시 돌릴 필요 없음. 자식 라우트가 자체 인증을 하므로 부모는 한 번만 검증.
export function shouldRevalidate() {
  return false;
}

export default function ProfileLayout() {
  return <Outlet />;
}
