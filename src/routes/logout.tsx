import { redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { createSupabaseServerClient } from "~/lib/supabase.server";

export async function action({ request }: ActionFunctionArgs) {
  const { supabase, headers } = createSupabaseServerClient(request);
  await supabase.auth.signOut();
  return redirect("/login", { headers });
}

// GET 으로 들어오면 (예: 새로고침) 그냥 로그인 페이지로
export async function loader(_: LoaderFunctionArgs) {
  return redirect("/login");
}
