import { redirect, type LoaderFunctionArgs } from "@remix-run/node";
import { createSupabaseServerClient } from "~/lib/supabase.server";
import { getProfileFields } from "~/lib/repos/profiles.server";
import { postApprovalDestination } from "~/lib/auth.server";

// OAuth redirect target: exchange the ?code for a session cookie, then route
// the user to the right step (mirrors the email/password login branching).
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (!code) return redirect("/login");

  const { supabase, headers } = createSupabaseServerClient(request);
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return redirect("/login", { headers });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return redirect("/login", { headers });

  const profile = await getProfileFields(supabase, user.id, ["user_id", "is_approved"]);
  if (!profile) return redirect("/profile/basic", { headers });
  if (!profile.is_approved) return redirect("/profile/payment", { headers });

  const dest = await postApprovalDestination(supabase, user.id);
  return redirect(dest, { headers });
}
