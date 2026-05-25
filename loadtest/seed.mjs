#!/usr/bin/env node
// 부하테스트용 임시 유저 시딩.
//   사용: npm run loadtest:seed            (기본 20명)
//        LOADTEST_USERS=50 npm run loadtest:seed
// 만드는 것: auth 유저 N명 + 승인된 profiles + 공유 곡 1개(전원 곡 겹침 → 서로 후보).
//   - gender=null  → 이성 조건 통과(전원 매칭 가능)
//   - major 는 유저마다 고유 → "같은 전공 제외"에 안 걸림
//   - school='__loadtest__' 로 표시. 끝나면 loadtest:cleanup 으로 전부 삭제.
import { getAdmin, writeUsers, USERS_FILE } from "./_lib.mjs";

const admin = getAdmin();
const N = parseInt(process.env.LOADTEST_USERS || "20", 10);
const runId = Date.now().toString(36);
const SHARED_SONG = 990000; // 전원 동일 곡 → 모든 쌍이 곡 겹침 조건 충족

console.log(`▶ 테스트 유저 ${N}명 시딩 (runId=${runId})...`);
const users = [];

for (let i = 0; i < N; i++) {
  const email = `loadtest-${runId}-${i}@loadtest.invalid`;
  const password = `Lt!${runId}${i}aA9`;

  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (cErr) {
    console.error(`  ✗ createUser[${i}] 실패:`, cErr.message);
    process.exit(1);
  }
  const id = created.user.id;

  const { error: pErr } = await admin.from("profiles").insert({
    user_id: id,
    name: `LT${i}`,
    birth_year: 2000,
    gender: null,
    school: "__loadtest__",
    major: `ltmajor-${runId}-${i}`,
    club: null,
    bank_holder: null,
    is_approved: true,
  });
  if (pErr) {
    console.error(`  ✗ profile[${i}] 실패:`, pErr.message);
    process.exit(1);
  }

  const { error: sErr } = await admin.from("user_songs").insert({
    user_id: id,
    song_no: SHARED_SONG,
    title: "LoadTest",
    artist: "LT",
    album: null,
    album_img: null,
  });
  if (sErr) {
    console.error(`  ✗ user_songs[${i}] 실패:`, sErr.message);
    process.exit(1);
  }

  users.push({ id, email, password });
  process.stdout.write(`\r  생성 ${i + 1}/${N}`);
}

writeUsers({ runId, createdAt: new Date().toISOString(), users });
console.log(`\n✅ 완료. ${users.length}명 → ${USERS_FILE}`);
console.log("   다음: SUPABASE_URL/SUPABASE_ANON_KEY 설정 후 'npm run loadtest:run'");
