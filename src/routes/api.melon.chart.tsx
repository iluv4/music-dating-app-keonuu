import { json } from "@remix-run/node";
import { getChartTop } from "~/lib/melon-chart.server";

// 클라이언트 측 차트 조회용 엔드포인트. 서버 로더는 getChartTop() 을 직접 호출하세요.
export async function loader() {
  return json(await getChartTop());
}
