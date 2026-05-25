// k6 동시 매칭 부하/경합 테스트.
//   사전: npm run loadtest:seed  (loadtest/.testusers.json 생성)
//   실행: SUPABASE_URL=... SUPABASE_ANON_KEY=... k6 run loadtest/match-concurrency.js
//        (= npm run loadtest:run, 단 env 는 직접 export 필요)
//
// 시나리오: 시딩된 전원이 "매칭 찾기"(find_or_create_match RPC)를 동시에 난타.
//   각 유저를 여러 VU 가 동시에 호출(더블서밋/두 탭 재현) → advisory lock + 재확인 +
//   active 쌍 유니크 인덱스가 제대로면 5xx 0건. 중복 매칭 0건은 loadtest:verify 로 확인.
//
// 재매칭(find_additional_match) 을 테스트하려면 아래 RPC 이름만 바꾸면 됨.
import http from "k6/http";
import { check } from "k6";

const RPC = "find_or_create_match";
const URL = __ENV.SUPABASE_URL;
const ANON = __ENV.SUPABASE_ANON_KEY;
const seeded = JSON.parse(open("./.testusers.json")).users;

if (!URL || !ANON) {
  throw new Error("SUPABASE_URL / SUPABASE_ANON_KEY 환경변수가 필요합니다.");
}

// 각 유저를 3개 VU 가 동시에 호출 → 같은 유저 동시 매칭 경합을 강제.
export const options = {
  scenarios: {
    burst: {
      executor: "per-vu-iterations",
      vus: seeded.length * 3,
      iterations: 5,
      maxDuration: "1m",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"], // 5xx/네트워크 실패 1% 미만
    checks: ["rate>0.99"],
  },
};

export function setup() {
  // 전원 로그인해서 access_token 확보 (password grant)
  const sessions = seeded.map((u) => {
    const res = http.post(
      `${URL}/auth/v1/token?grant_type=password`,
      JSON.stringify({ email: u.email, password: u.password }),
      { headers: { apikey: ANON, "Content-Type": "application/json" } },
    );
    const token = res.json("access_token");
    if (!token) {
      throw new Error(`로그인 실패 ${u.email}: ${res.status} ${res.body}`);
    }
    return { id: u.id, token };
  });
  return { sessions };
}

export default function (data) {
  const s = data.sessions[(__VU - 1) % data.sessions.length];
  const res = http.post(
    `${URL}/rest/v1/rpc/${RPC}`,
    JSON.stringify({ p_user_id: s.id }),
    {
      headers: {
        apikey: ANON,
        Authorization: `Bearer ${s.token}`,
        "Content-Type": "application/json",
      },
    },
  );
  check(res, {
    "status 2xx": (r) => r.status >= 200 && r.status < 300,
    "no server error": (r) => r.status < 500,
  });
}
