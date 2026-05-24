#!/usr/bin/env node
// 색상 가드 — 폐기된 브랜드색이 코드에 들어오는 걸 막는다.
// 브랜드 메인은 #ff625d(코랄, Figma color/primary/500), soft는 #ffeeed.
// 과거 마젠타 #ff0558 은 폐기됨. 이 값이 발견되면 커밋 실패.
//   실행: npm run lint:colors   (pre-commit 훅에서 자동 실행)

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const FORBIDDEN = [
  { pattern: /#ff0558/i, msg: "폐기된 마젠타 #ff0558 — 브랜드 코랄 #ff625d 사용" },
];

const SCAN_DIRS = ["src", "public"];
const SCAN_EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".css", ".json", ".html"]);
const SKIP_DIRS = new Set(["node_modules", "build", ".git", "dist", ".cache"]);

const violations = [];

function walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full);
    } else if (SCAN_EXT.has(extname(name))) {
      const lines = readFileSync(full, "utf8").split("\n");
      lines.forEach((line, i) => {
        for (const { pattern, msg } of FORBIDDEN) {
          if (pattern.test(line)) {
            violations.push({ file: full, line: i + 1, text: line.trim(), msg });
          }
        }
      });
    }
  }
}

for (const d of SCAN_DIRS) walk(d);

if (violations.length > 0) {
  console.error("❌ 폐기된 색상 발견 (커밋 차단):\n");
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}`);
    console.error(`    ${v.text}`);
    console.error(`    → ${v.msg}\n`);
  }
  process.exit(1);
}

console.log("✅ 색상 가드 통과 (폐기된 색 없음)");
