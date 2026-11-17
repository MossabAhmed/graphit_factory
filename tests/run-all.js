const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const files = fs.readdirSync(__dirname).filter((f) => f.endsWith(".test.js")).sort();
let failed = 0;
for (const f of files) {
  const r = spawnSync(process.execPath, [path.join(__dirname, f)], { encoding: "utf8" });
  process.stdout.write(r.stdout);
  if (r.status !== 0) { failed++; process.stderr.write(`FAIL ${f}\n${r.stderr}\n`); }
}
if (failed) { console.error(`${failed} test file(s) failed`); process.exit(1); }
console.log(`\nAll ${files.length} test files passed.`);
