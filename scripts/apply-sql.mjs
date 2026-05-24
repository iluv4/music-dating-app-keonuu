#!/usr/bin/env node
// MCP 우회용 마이그레이션 실행기.
// Supabase MCP가 끊겨도 .sql 파일을 직접 적용한다.
//   사용: npm run db:apply -- supabase/migration_club.sql
//   여러 파일: npm run db:apply -- a.sql b.sql
// 연결문자열은 env SUPABASE_DB_URL (Dashboard → Project Settings → Database
//   → Connection string → URI, 끝에 ?sslmode=require). .env에 두면 자동 로드.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

// .env 로드 (의존성 없이 최소 파싱)
try {
  const env = readFileSync(resolve(process.cwd(), ".env"), "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
} catch {
  /* .env 없으면 무시 — 환경변수로 직접 줄 수도 있음 */
}

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("사용법: npm run db:apply -- <파일.sql> [추가.sql ...]");
  process.exit(1);
}

const connectionString = process.env.SUPABASE_DB_URL;
if (!connectionString) {
  console.error(
    "환경변수 SUPABASE_DB_URL 가 필요합니다.\n" +
      "Supabase Dashboard → Project Settings → Database → Connection string → URI 복사해서\n" +
      ".env 에 SUPABASE_DB_URL=postgresql://... 로 추가하세요.",
  );
  process.exit(1);
}

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  for (const file of files) {
    const path = resolve(process.cwd(), file);
    const sql = readFileSync(path, "utf8");
    process.stdout.write(`▶ ${file} 적용 중... `);
    await client.query(sql);
    console.log("OK");
  }
  console.log("\n✅ 모든 마이그레이션 적용 완료");
} catch (err) {
  console.error(`\n❌ 실패: ${err.message}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
