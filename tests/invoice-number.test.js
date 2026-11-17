const assert = require("node:assert/strict");
const N = require("../src/domain/invoice-number.js");

assert.equal(N.formatInvoiceNumber(1), "0000551");
assert.equal(N.formatInvoiceNumber(12), "0000562");
assert.equal(N.formatInvoiceNumber(0), "", "بلا رقم تسلسلي لا يوجد رقم فاتورة");
assert.equal(N.formatInvoiceNumber(undefined), "");

const proj = (id, dateCreated, invoiceSerial) => ({ id, dateCreated, invoiceSerial });

// مشاريع بلا أرقام: تُرقَّم 1، 2، 3 بترتيب dateCreated ثم id
const fresh = [proj("b", "2026-02-01"), proj("a", "2026-01-01"), proj("c", "2026-02-01")];
const assigned = N.assignMissingSerials(fresh);
const bySerial = Object.fromEntries(assigned.map((p) => [p.id, p.invoiceSerial]));
assert.deepEqual(bySerial, { a: 1, b: 2, c: 3 });

// idempotent: التشغيل الثاني لا يغيّر شيئًا
const merged = fresh.map((p) => assigned.find((x) => x.id === p.id) || p);
assert.deepEqual(N.assignMissingSerials(merged), []);

// أرقام موجودة لا تتغير، والناقص يبدأ بعد أعلى رقم
const partial = [proj("x", "2026-01-01", 7), proj("y", "2026-01-02"), proj("z", "2025-12-01")];
const res = N.assignMissingSerials(partial);
assert.equal(res.find((p) => p.id === "z").invoiceSerial, 8, "الأقدم أولًا");
assert.equal(res.find((p) => p.id === "y").invoiceSerial, 9);
assert.equal(res.find((p) => p.id === "x"), undefined, "المشروع المرقّم لا يُمس");

// مشروع جديد بعد مشاريع مرقّمة
assert.equal(N.nextInvoiceSerial([proj("a", "", 1), proj("b", "", 5)]), 6);
assert.equal(N.nextInvoiceSerial([]), 1);

// تغيير الاسم أو التاريخ لا يغيّر الرقم (الرقم يعتمد على الحقل المخزَّن فقط)
const p1 = { ...proj("a", "2026-01-01", 3), customerName: "س" };
assert.equal(N.formatInvoiceNumber({ ...p1, customerName: "ص", dateCreated: "2030-01-01" }.invoiceSerial), "0000553");

// كشف التكرار
assert.deepEqual(N.findDuplicateSerials([proj("a", "", 2), proj("b", "", 2), proj("c", "", 3)]), [2]);
assert.deepEqual(N.findDuplicateSerials([proj("a", "", 1)]), []);

console.log("invoice-number tests: ok");
