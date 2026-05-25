// 부하테스트용 공용 헬퍼 (node 스크립트 전용).
// seed/verify/cleanup 이 공유한다. k6 스크립트(match-concurrency.js)는 이걸 안 씀.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const HERE = dirname(fileURLToPath(import.meta.url));
export const USERS_FILE = resolve(HERE, ".testusers.json");

// .env 로드 (scripts/apply-sql.mjs 와 동일한 최소 파서)
export function loadEnv() {
  try {
    const env = readFileSync(resolve(process.cwd(), ".env"), "utf8");
    for (const line of env.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !(m[1] in process.env)) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    /* .env 없으면 무시 */
  }
}

// service_role 클라이언트 — RLS 우회. 시딩/검증/정리에 사용.
export function getAdmin() {
  loadEnv();
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error(
      "환경변수 SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY 가 필요합니다 (.env 또는 직접 export).",
    );
    process.exit(1);
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export function readUsers() {
  if (!existsSync(USERS_FILE)) {
    console.error(
      `${USERS_FILE} 가 없습니다. 먼저 'npm run loadtest:seed' 를 실행하세요.`,
    );
    process.exit(1);
  }
  return JSON.parse(readFileSync(USERS_FILE, "utf8"));
}

export function writeUsers(data) {
  writeFileSync(USERS_FILE, JSON.stringify(data, null, 2));
}
