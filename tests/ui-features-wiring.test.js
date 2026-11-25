/* يتأكد من ربط ألوان الموردين والظهور التدريجي والسداد العام الموزَّع في app.js وstyles.css. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const read = (f) => fs.readFileSync(path.join(__dirname, "..", f), "utf8");
const app = read("app.js");
const css = read("styles.css");

// الظهور التدريجي: غلاف لكل الأقسام عدا لوحة التحكم (لها تحريكها الخاص)، وCSS يحترم تقليل الحركة
assert.ok(app.includes('F !== "dashboard" &&'));
assert.ok(app.includes('className: "tab-view"'));
assert.ok(css.includes(".tab-view > * > *") && css.includes("@keyframes tab-in"));
assert.match(css, /prefers-reduced-motion: reduce\)\s*\{\s*\.tab-view/);
assert.ok(!/\.tab-view[^{]*\{[^}]*animation:[^}]*infinite/.test(css), "لا حركة لا نهائية");

// ألوان الموردين: خريطة من كل الفواتير (لا تتغير بالتصفية)، شريط للصف، ولون لكل رقم من 0 إلى 15
assert.ok(app.includes("supplierColorMap(e)"));
assert.ok(app.includes('className: "sup-row"'));
for (let i = 0; i < 16; i++) assert.ok(css.includes("--sup-" + i + ":"), "اللون " + i);
assert.ok((css.match(/:root\[data-theme="dark"\] \{\s*--sup-0/g) || []).length === 1, "نسخة مظلمة للألوان");

// السداد العام: اختيار المشاريع المكتملة فقط ومعاينة
assert.ok(app.includes("FD.projects.payableProjects(m, o, l)"));
assert.ok(app.includes("gp-preview") && css.includes(".gp-option.is-selected"));
console.log("ui-features-wiring tests: ok");