const assert = require("node:assert/strict");
const m = require("../src/domain/money.js");

// الخصم: الصافي = الإجمالي − الخصم، بتقريب ثلاث خانات
assert.deepEqual(m.applyDiscount(1000, 150.5), { grossAmount: 1000, discountAmount: 150.5, netAmount: 849.5 });
assert.equal(m.applyDiscount(0.3, 0.1).netAmount, 0.2, "لا فروق عشرية (0.3 − 0.1)");
assert.equal(m.applyDiscount(100.1, 0.2).netAmount, 99.9);
assert.equal(m.applyDiscount(500, 0).netAmount, 500);
assert.equal(m.applyDiscount("250", "50").netAmount, 200, "النصوص الرقمية تُقبل");

// التحقق من الأرقام
assert.equal(m.isPositive(1), true);
assert.equal(m.isPositive(0), false);
assert.equal(m.isPositive(-5), false);
assert.equal(m.isPositive("abc"), false);
assert.equal(m.isNonNegative(0), true);
assert.equal(m.isNonNegative(-0.001), false);

// مجموع بنود الفاتورة: يتجاهل البند بلا اسم أو بقيمة غير صالحة
assert.equal(
  m.itemsTotal([{ name: "أ", total: 5 }, { name: " ", total: 3 }, { name: "ب", total: "x" }, { name: "ج", total: "2.5" }], "name"),
  7.5,
);

assert.equal(m.monthKey("2026-03-15T10:00"), "2026-03");
assert.equal(m.monthKey(undefined), "");
assert.equal(m.normalizeName("  أحمد   علي "), m.normalizeName("أحمد علي"));
assert.equal(m.round3(1.00049), 1);
assert.equal(m.round3(0.1 + 0.2), 0.3);

console.log("money tests: ok");
