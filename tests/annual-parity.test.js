/* التقرير السنوي يجب أن يعطي نفس أرقام التقرير الشهري (نفس مصدر الواردات المدموج). */
const assert = require("node:assert/strict");
const P = require("../src/domain/projects.js");
const S = require("../src/domain/suppliers.js");
const { buildAnnualRows } = require("../src/finance/metrics.js");

const projects = [
  // دفعة داخل المشروع فقط (غير مسجّلة في income)
  { id: "p1", customerName: "أ", payments: [{ id: "a", amount: 500, date: "2026-03-05T10:00" }], measurements: [] },
];
const income = [
  { id: "g1", customerId: "c1", amount: 120, date: "2026-03-09T09:00" }, // سداد عام
  { id: "g2", amount: 77, date: "2026-03-10", includeInIncome: false }, // غير محتسب
  { id: "p2", projectId: "p1", amount: 50, date: "2026-04-01" },
];
const invoices = [{ id: "i1", amount: 200, date: "2026-03-02" }, { id: "i2", amount: 900, date: "2026-03-03", debtTransactionId: "d" }];
const suppliers = [{ id: "s", transactions: [{ id: "t", amount: 60, supplierPayment: true, date: "2026-03-20" }] }];
const expenses = [{ id: "e1", amount: 100, date: "2026-03-15" }];

const merged = P.countedIncome(projects, income);
const rows = buildAnnualRows({ year: 2026, invoices, expenses, income: merged, suppliers });
const march = rows[2];

assert.equal(march.income, 620, "السنوي يشمل الدفعة المخزّنة داخل المشروع والسداد العام");
assert.equal(march.paidInvoices, S.paidInvoicesForMonth(invoices, suppliers, "2026-03"));
assert.equal(march.paidInvoices, 260);
assert.equal(march.invoices, 1100, "إجمالي قيمة الفواتير يشمل الآجلة");
assert.equal(march.net, 620 - 100 - 260);
assert.equal(rows[3].income, 50);

// لو مُرِّر income الخام لضاعت الدفعة المخزّنة داخل المشروع — هذا ما صُحِّح
const raw = buildAnnualRows({ year: 2026, invoices, expenses, income, suppliers });
assert.notEqual(raw[2].income, march.income);

console.log("annual-parity tests: ok");
