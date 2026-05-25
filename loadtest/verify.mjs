#!/usr/bin/env node
// 부하테스트 후 매칭 무결성 검증.
//   사용: npm run loadtest:verify
// 검사:
//   1) 같은 쌍에 active 매칭이 2개 이상인가? (= 우리가 고친 동시성 corruption) → 있으면 FAIL
//   2) 한 유저가 여러 active 매칭에 들어갔는가? (참고용 — 재매칭/후보-중복선택으로 정상일 수 있음)
import { getAdmin, readUsers } from "./_lib.mjs";

const admin = getAdmin();
const { users } = readUsers();
const ids = new Set(users.map((u) => u.id));

// 테스트 유저가 낀 active 매칭만 수집 (user_a in ids OR user_b in ids)
const idList = [...ids];
const [{ data: a = [] }, { data: b = [] }] = await Promise.all([
  admin.from("matches").select("id,user_a,user_b").eq("status", "active").in("user_a", idList),
  admin.from("matches").select("id,user_a,user_b").eq("status", "active").in("user_b", idList),
]);
const byId = new Map();
for (const m of [...a, ...b]) byId.set(m.id, m);
const matches = [...byId.values()];

const pairCount = new Map();
const userActive = new Map();
for (const m of matches) {
  const key = [m.user_a, m.user_b].sort().join("|");
  pairCount.set(key, (pairCount.get(key) || 0) + 1);
  for (const u of [m.user_a, m.user_b]) {
    if (ids.has(u)) userActive.set(u, (userActive.get(u) || 0) + 1);
  }
}

const dupPairs = [...pairCount.entries()].filter(([, c]) => c > 1);
const multiUsers = [...userActive.entries()].filter(([, c]) => c > 1);

console.log(`테스트 유저: ${ids.size}명`);
console.log(`active 매칭(테스트 유저 관련): ${matches.length}개`);
console.log(`여러 매칭에 든 유저: ${multiUsers.length}명 (참고 — 정상일 수 있음)`);
console.log(`중복 active 쌍(같은 두 사람 매칭 2개+): ${dupPairs.length}건`);

if (dupPairs.length > 0) {
  console.error("\n❌ FAIL: 중복 매칭 발견 — 동시성 보호가 동작하지 않음");
  for (const [k, c] of dupPairs) console.error(`   ${k} → ${c}개`);
  process.exit(1);
}
console.log("\n✅ PASS: 중복 매칭 0건");
