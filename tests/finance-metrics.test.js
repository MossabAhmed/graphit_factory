const assert = require("node:assert/strict");
const {
  buildAnnualRows,
  totals,
} = require("../src/finance/metrics.js");

const rows = buildAnnualRows({
  year: 2026,
  expenses: [
    { date: "2026-01-03", amount: 100 },
    { date: "2026-02-03", amount: 50 },
  ],
  income: [
    { date: "2026-01-05", amount: 250 },
    { date: "2026-01-12", amount: 75, paymentScope: "customer" },
    { date: "2026-01-20", amount: 999, includeInIncome: false },
  ],
  invoices: [
    { date: "2026-01-06", amount: 400 },
    { date: "2026-02-06", amount: 300, debtTransactionId: "debt-1" },
  ],
  suppliers: [
    {
      transactions: [
        { date: "2026-01-08", amount: 40, supplierPayment: true },
      ],
    },
  ],
});

assert.equal(rows.length, 12, "التقرير السنوي يجب أن يحتوي على 12 شهرًا");
assert.deepEqual(rows[0], {
  month: "2026-01",
  expenses: 100,
  income: 325,
  invoices: 400,
  paidInvoices: 440,
  net: -215,
});
assert.equal(rows[1].income, 0, "لا تُحتسب السجلات خارج الشهر");
assert.equal(rows[1].paidInvoices, 0, "الفاتورة المرتبطة بالدين لا تُعد مدفوعة نقديًا");
assert.equal(rows[0].net, rows[0].income - rows[0].expenses - rows[0].paidInvoices);
assert.deepEqual(totals(rows), {
  expenses: 150,
  income: 325,
  invoices: 700,
  paidInvoices: 440,
  net: -265,
});

console.log("finance-metrics tests: ok");
