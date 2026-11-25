/* يتأكد أن لوحة التحكم وصفحة المشاريع يستخدمان تعريف الفلاتر نفسه. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");

// قائمة أزرار الفلاتر تضم الفلترين الجديدين بعد «مكتمل»
assert.ok(app.includes("__projectFilterList = [FD.projects.FILTER_ALL, ...ft, FD.projects.FILTER_SETTLED, FD.projects.FILTER_OPEN]"));
// صفحة المشاريع تصفّي بالدالة المشتركة
assert.ok(app.includes("FD.projects.matchesProjectFilter(l, d, inc)"));
// تبويبا لوحة التحكم يحسبان العدد بالدالة نفسها، وزر «عرض الكل» يفتح الفلتر المطابق لا «مكتمل» العام
assert.ok(app.includes("matchesProjectFilter(u, FD.projects.FILTER_SETTLED, inc)"));
assert.ok(app.includes("matchesProjectFilter(u, FD.projects.FILTER_OPEN, inc)"));
assert.ok(app.includes('list: doneOpen, status: FD.projects.FILTER_OPEN'));
assert.ok(app.includes('list: doneSettled, status: FD.projects.FILTER_SETTLED'));
// الفلتر القادم من اللوحة يُقبل فقط إن كان ضمن القائمة
assert.ok(app.includes("__projectFilterList.includes(s)"));
console.log("project-filters-wiring tests: ok");