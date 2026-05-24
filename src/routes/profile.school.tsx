import { redirect, type LoaderFunctionArgs } from "@remix-run/node";

// 학교/학과/동아리는 /profile/basic 한 화면으로 통합됨(단계 축소).
// 이전 링크·뒤로가기 등으로 들어오면 통합 화면으로 보낸다.
export const loader = async (_: LoaderFunctionArgs) => {
  return redirect("/profile/basic");
};

export default function ProfileSchoolRedirect() {
  return null;
}
