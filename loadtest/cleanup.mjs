#!/usr/bin/env node
// 부하테스트 임시 데이터 전부 삭제 (auth 유저 포함).
//   사용: npm run loadtest:cleanup
import { getAdmin, readUsers, USERS_FILE } from "./_lib.mjs";
import { rmSync } from "node:fs";

const admin = getAdmin();
const { users } = readUsers();
const ids = users.map((u) => u.id);

console.log(`▶ 테스트 데이터 정리 (${ids.length}명)...`);

// 매칭(양쪽), 알림, 곡, 프로필 → 마지막에 auth 유저
await admin.from("matches").delete().in("user_a", ids);
await admin.from("matches").delete().in("user_b", ids);
await admin.from("notifications").delete().in("user_id", ids);
await admin.from("user_songs").delete().in("user_id", ids);
await admin.from("profiles").delete().in("user_id", ids);

let ok = 0;
for (const id of ids) {
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) console.error(`  ✗ deleteUser ${id}: ${error.message}`);
  else ok++;
  process.stdout.write(`\r  유저 삭제 ${ok}/${ids.length}`);
}

rmSync(USERS_FILE, { force: true });
console.log(`\n✅ 정리 완료. (${USERS_FILE} 삭제)`);
