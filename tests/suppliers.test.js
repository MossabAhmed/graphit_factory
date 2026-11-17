const assert = require("node:assert/strict");
const S = require("../src/domain/suppliers.js");

const supplier = (transactions = []) => ({ id: "s1", name: "مورد", transactions });
const inv = (id, amount, date, debtId) => ({ id, supplierId: "s1", amount, date, debtTransactionId: debtId });

// فاتورتان آجلتان
const invoices = [inv("i1", 500, "2026-01-01", "d1"), inv("i2", 300, "2026-01-10", "d2")];
const debts = [{ id: "d1", type: "debit", amount: 500 }, { id: "d2", type: "debit", amount: 300 }];

let st = S.supplierStatement(supplier(debts), invoices);
assert.equal(st.owed, 800);
assert.equal(st.totalInvoices, 800);

// السداد يُوزَّع على الأقدم أولًا
const alloc = S.allocatePayment(supplier(debts), invoices, 600);
assert.deepEqual(alloc, [{ invoiceId: "i1", amount: 500 }, { invoiceId: "i2", amount: 100 }]);

const paid = { id: "p1", type: "credit", amount: 600, supplierPayment: true, allocations: alloc, date: "2026-01-20" };
st = S.supplierStatement(supplier([...debts, paid]), invoices);
assert.equal(st.owed, 200);
assert.equal(st.invoicePaid, 600);
assert.equal(st.rows[0].remaining, 0);
assert.equal(st.rows[1].remaining, 200);

// سداد زائد يصبح رصيدًا لنا عند المورد
const over = { id: "p2", type: "credit", amount: 1000, supplierPayment: true, allocations: S.allocatePayment(supplier(debts), invoices, 1000), date: "2026-01-21" };
st = S.supplierStatement(supplier([...debts, over]), invoices);
assert.equal(st.owed, 0);
assert.equal(st.credit, 200);

// فاتورة غير آجلة (مدفوعة نقدًا) لا تدخل دين المورد
assert.equal(S.debtInvoices("s1", [inv("i3", 100, "2026-01-01", undefined)]).length, 0);

// المدفوع فعليًا في الشهر = فواتير نقدية + سداد الموردين، بلا الفواتير الآجلة
const mixed = [inv("c1", 400, "2026-02-03"), inv("c2", 300, "2026-02-04", "dx"), inv("c3", 90, "2026-03-01")];
const sup = [supplier([{ id: "t", amount: 40, supplierPayment: true, date: "2026-02-10" }, { id: "u", amount: 99, supplierPayment: true, date: "2026-03-10" }])];
assert.equal(S.paidInvoicesForMonth(mixed, sup, "2026-02"), 440);
assert.equal(S.paidInvoicesForMonth(mixed, sup, "2026-03"), 189);
assert.equal(S.paidInvoicesForMonth([], [], "2026-01"), 0);

console.log("suppliers tests: ok");
