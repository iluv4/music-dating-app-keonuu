import { redirect, type LoaderFunctionArgs } from "@remix-run/node";

// 약관 동의는 회원가입(/signup) 단계에 통합됨(단계 축소).
// 이전 링크·뒤로가기로 들어오면 가입 화면으로 보낸다.
export const loader = async (_: LoaderFunctionArgs) => {
  return redirect("/signup");
};

export default function TermsRedirect() {
  return null;
}
