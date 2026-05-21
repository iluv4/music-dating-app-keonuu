import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";

export const loader = async (_: LoaderFunctionArgs) => {
  return redirect("/profile/basic");
};

export default function ProfileIndex() {
  return null;
}
