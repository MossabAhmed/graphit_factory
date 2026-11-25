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

// --- لون المورد: مختلف لكل مورد وثابت ---
{
  const inv2 = (name, date) => ({ id: name + date, supplierName: name, date, amount: 10 });
  const invoicesC = [inv2("شركة الأمان", "2026-01-10"), inv2("مصنع الصفا", "2026-01-12"), inv2("شركة الأمان", "2026-02-01"),
    inv2("مؤسسة النور", "2026-02-03"), inv2("كهرباء", ""), { id: "x", supplierName: "", date: "2026-03-01" }];
  const map = S.supplierColorMap(invoicesC);
  const idx = (n, m = map) => S.supplierColorIndex(n, m);

  // ألوان مختلفة تمامًا لكل مورد
  const names = ["شركة الأمان", "مصنع الصفا", "مؤسسة النور", "كهرباء"];
  assert.equal(new Set(names.map((n) => idx(n))).size, 4);
  // الترتيب بأول ظهور: الأقدم 0 ثم 1 ثم 2 (الفاتورة بلا تاريخ تُعدّ الأولى)
  assert.deepEqual(["كهرباء", "شركة الأمان", "مصنع الصفا", "مؤسسة النور"].map((n) => idx(n)), [0, 1, 2, 3]);
  // التطبيع: المسافات والتكرار لا يغيّر اللون، والاسم الفارغ محايد
  assert.equal(idx("  شركة   الأمان "), idx("شركة الأمان"));
  assert.equal(idx(""), -1);
  assert.equal(idx(undefined), -1);
  assert.equal(idx("غير موجود"), -1);
  // مورد جديد أحدث لا يغيّر ألوان القدامى
  const map2 = S.supplierColorMap([...invoicesC, inv2("مورد جديد", "2026-04-01")]);
  names.forEach((n) => assert.equal(idx(n, map2), idx(n)));
  assert.equal(idx("مورد جديد", map2), 4);
  // 16 مورد بألوان مختلفة، وما بعدها يدور
  const many = Array.from({ length: 17 }, (_, i) => inv2("مورد" + i, "2026-01-" + String(i + 1).padStart(2, "0")));
  const mm = S.supplierColorMap(many);
  assert.equal(new Set(many.slice(0, 16).map((x) => idx(x.supplierName, mm))).size, 16);
  assert.equal(idx("مورد16", mm), 0);
}
console.log("supplier colour tests: ok");