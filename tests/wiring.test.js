/* يتأكد أن index.html يحمّل كل الملفات الموجودة فعلًا وبالترتيب الصحيح. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");

const local = [...html.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)].map((m) => m[1]).filter((s) => !/^https?:/.test(s));
local.forEach((f) => assert.ok(fs.existsSync(path.join(root, f)), "الملف غير موجود: " + f));
const idx = (f) => local.indexOf(f);
["src/domain/money.js", "src/domain/projects.js", "src/domain/suppliers.js", "src/domain/invoice-number.js", "src/finance/metrics.js", "src/reports/annual-report.js"]
  .forEach((f) => assert.ok(idx(f) >= 0 && idx(f) < idx("app.js"), f + " يجب أن يُحمَّل قبل app.js"));
assert.ok(idx("src/domain/money.js") < idx("src/domain/projects.js"), "money قبل projects");
assert.ok(idx("src/domain/money.js") < idx("src/domain/suppliers.js"), "money قبل suppliers");
assert.ok(html.includes('href="styles.css"'));
assert.ok(fs.existsSync(path.join(root, "styles.css")));

// لا حاجة لخطوة بناء: لا ملف يتجاوز حدًّا معقولًا للنشر المجاني
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.name === "node_modules" || e.name === ".git" ? [] : e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const total = walk(root).reduce((t, f) => t + fs.statSync(f).size, 0);
assert.ok(total < 5 * 1024 * 1024, "حجم المشروع أقل من 5 ميغابايت");

console.log("wiring tests: ok");
