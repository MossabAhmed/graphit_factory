/* انحدار: نافذة «تعديل الفاتورة» كانت تُمرّر `upsert` غير المعرَّف فتنهار الصفحة كلها (شاشة فارغة).
   يمنع بقاء خاصية مختصرة (shorthand) بلا متغير معرَّف في app.js. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");

// أسماء تُستخدم كخصائص مختصرة `name,` في app.js ويجب أن تكون معرَّفة في مكانها
const bad = app.split("\n").map((l, i) => [i + 1, l]).filter(([, l]) => /^\s*(upsert|remove|transact|onSave|onDelete),\s*$/.test(l));
assert.deepEqual(bad, [], "خاصية مختصرة غير معرَّفة: " + JSON.stringify(bad));
// نافذة التعديل تمرّر الخصائص التي يستخدمها نموذج الفاتورة فقط
assert.ok(/React\.createElement\(rt, \{\s*initialInvoice: v,\s*projects: a,\s*suppliers: t,\s*onAdd: X,\s*\}\)/.test(app));
console.log("no-dangling-refs tests: ok");