const assert = require("node:assert/strict");
const P = require("../src/domain/projects.js");

const project = (over = {}) => ({ id: "p1", customerId: "c1", customerName: "أحمد", status: "جديد", measurements: [], payments: [], ...over });
const measured = (total) => [{ id: "m1", totalAmount: total }];

// --- مشروع جديد بلا كيل: لا يظهر خالصًا ---
let s = P.projectSummary(project(), []);
assert.equal(s.settled, false, "المشروع الجديد ليس خالصًا");
assert.equal(s.remaining, 0);

// --- دفعة مقدمة قبل الاكتمال تبقى داخل المشروع كـ «مقدّم» ---
s = P.projectSummary(project({ status: "قيد التنفيذ", payments: [{ id: "a", amount: 300 }] }), []);
assert.equal(s.advance, 300);
assert.equal(s.surplus, 0, "المقدّم لا يدخل رصيد العميل");
assert.equal(s.settled, false);

// --- كيل أقل من المدفوع بعد الاكتمال: الزيادة رصيد للعميل ---
s = P.projectSummary(project({ status: "مكتمل", measurements: measured(200), payments: [{ id: "a", amount: 300 }] }), []);
assert.equal(s.surplus, 100);
assert.equal(s.advance, 0);
assert.equal(s.remaining, 0);
assert.equal(s.settled, true);

// --- باقٍ على العميل ---
s = P.projectSummary(project({ status: "مكتمل", measurements: measured(1000), payments: [{ id: "a", amount: 400 }] }), []);
assert.equal(s.remaining, 600);
assert.equal(s.settled, false);

// --- التغاضي عن جزء من الباقي (100 دينار) يجعل المشروع خالصًا ---
s = P.projectSummary(project({ status: "مكتمل", measurements: measured(1000), payments: [{ id: "a", amount: 900 }], waivedAmount: 100 }), []);
assert.equal(s.remaining, 0);
assert.equal(s.settled, true);
assert.equal(s.surplus, 0, "المتغاضى عنه ليس فائضًا");

// --- التغاضي لا يتجاوز التكلفة ---
s = P.projectSummary(project({ status: "مكتمل", measurements: measured(100), waivedAmount: 5000 }), []);
assert.equal(s.waived, 100);

// --- الدفعات: داخل المشروع + في income بلا تكرار ---
const pr = project({ payments: [{ id: "a", amount: 100 }] });
const inc = [{ id: "a", paymentId: "a", projectId: "p1", amount: 100 }, { id: "b", projectId: "p1", amount: 50 }];
assert.equal(P.projectPayments(pr, inc).length, 2, "الدفعة المكررة تُحسب مرة واحدة");
assert.equal(P.projectSummary(pr, inc).paid, 150);

// --- الواردات الكلية: العامة + دفعات المشاريع، والمحتسبة فقط ---
const all = P.allProjectIncome([pr], [...inc, { id: "g1", amount: 70 }, { id: "g2", amount: 30, includeInIncome: false }]);
assert.equal(all.reduce((t, x) => t + x.amount, 0), 250);
assert.equal(P.countedIncome([], [{ id: "g2", amount: 30, includeInIncome: false }, { id: "g3", amount: 5 }]).length, 1);

// --- رصيد العميل: يدوي + باقي المشاريع − فائض − سداد عام ---
const customer = { id: "c1", name: "أحمد", transactions: [{ type: "debit", amount: 50 }, { type: "credit", amount: 20 }] };
const projects = [
  project({ id: "p1", status: "مكتمل", measurements: measured(1000), payments: [{ id: "a", amount: 400 }] }), // باقي 600
  project({ id: "p2", status: "مكتمل", measurements: measured(100), payments: [{ id: "b", amount: 160 }] }), // فائض 60
];
let out = P.customerOutstanding(customer, projects, []);
assert.equal(out.ledger, 30);
assert.equal(out.projectsRemaining, 600);
assert.equal(out.projectsSurplus, 60);
assert.equal(out.total, 30 + 600 - 60);

// --- السداد العام: يُخصم من المستحق، ويُربط بالعميل بالمعرّف أو الاسم ---
const general = [
  { id: "g1", customerId: "c1", amount: 100, date: "2026-03-01T10:00", description: "دفعة" },
  { id: "g2", customerName: "  أحمد ", amount: 40, date: "2026-03-02T10:00" },
  { id: "g3", customerId: "other", amount: 999 },
  { id: "g4", projectId: "px", amount: 777 },
];
out = P.customerOutstanding(customer, projects, general);
assert.equal(out.directPaid, 140);
assert.equal(out.total, 570 - 140);
assert.deepEqual(P.customerDirectPayments(customer, general).map((x) => x.id), ["g1", "g2"]);

// --- سداد يغطي كل المستحق يعطي رصيدًا سالبًا (رصيد للعميل) ---
out = P.customerOutstanding(customer, projects, [{ id: "g9", customerId: "c1", amount: 1000 }]);
assert.ok(out.total < 0);

// --- ربط المشاريع بالعميل: بالمعرّف أو بالاسم للمشاريع القديمة ---
assert.equal(P.customerProjects(customer, [project({ customerId: undefined, customerName: "أحمد" }), project({ customerId: "zzz", customerName: "أحمد" })]).length, 1);

console.log("projects tests: ok");

// --- فلاتر صفحة المشاريع: «مكتمل خالص» و«مكتمل غير خالص» ---
{
  const mk = (over) => project(over);
  const settledP = mk({ id: "s", status: "مكتمل", measurements: measured(500), payments: [{ id: "a", amount: 500 }] });
  const surplusP = mk({ id: "su", status: "مكتمل", measurements: measured(500), payments: [{ id: "b", amount: 700 }] });
  const waivedP = mk({ id: "w", status: "مكتمل", measurements: measured(500), payments: [{ id: "c", amount: 400 }], waivedAmount: 100 });
  const openP = mk({ id: "o", status: "مكتمل", measurements: measured(500), payments: [{ id: "d", amount: 100 }] });
  const unpaidP = mk({ id: "u", status: "مكتمل", measurements: measured(500) });
  const progressP = mk({ id: "pr", status: "قيد التنفيذ", payments: [{ id: "e", amount: 999 }] });
  const newP = mk({ id: "n", status: "جديد" });
  const all = [settledP, surplusP, waivedP, openP, unpaidP, progressP, newP];
  const ids = (f) => all.filter((x) => P.matchesProjectFilter(x, f, [])).map((x) => x.id);

  assert.deepEqual(ids(P.FILTER_ALL), all.map((x) => x.id), "الكل");
  assert.deepEqual(ids("جديد"), ["n"]);
  assert.deepEqual(ids("قيد التنفيذ"), ["pr"]);
  assert.deepEqual(ids("مكتمل"), ["s", "su", "w", "o", "u"]);
  assert.deepEqual(ids(P.FILTER_SETTLED), ["s", "su", "w"], "خالص: مسدد بالكامل أو بزيادة أو مع تغاضٍ");
  assert.deepEqual(ids(P.FILTER_OPEN), ["o", "u"], "غير خالص: عليه باقٍ");
  // كل مشروع مكتمل يقع في فلتر واحد بالضبط من الاثنين
  ids("مكتمل").forEach((id) => assert.equal(ids(P.FILTER_SETTLED).includes(id) !== ids(P.FILTER_OPEN).includes(id), true, id));
  // المشروع غير المكتمل لا يظهر في أيٍّ منهما حتى لو دُفع أكثر من تكلفته
  assert.ok(!ids(P.FILTER_SETTLED).includes("pr") && !ids(P.FILTER_OPEN).includes("pr"));
  // الدفعات المسجّلة في income تُحتسب أيضًا
  assert.ok(P.matchesProjectFilter(openP, P.FILTER_SETTLED, [{ id: "x", projectId: "p1", amount: 400 }]) === false, "مشروع آخر لا يتأثر");
  assert.ok(P.matchesProjectFilter({ ...openP, id: "p1" }, P.FILTER_SETTLED, [{ id: "x", projectId: "p1", amount: 400 }]), "دفعة income تجعله خالصًا");
}
console.log("project filters tests: ok");

// --- توزيع السداد العام على المشاريع المكتملة ---
{
  const cust = { id: "c1", name: "أحمد", transactions: [] };
  const done = (id, cost, paid = 0, extra = {}) => project({ id, status: "مكتمل", measurements: measured(cost), payments: paid ? [{ id: "pp" + id, amount: paid }] : [], ...extra });
  const A = done("A", 500), B = done("B", 300, 100), C = done("C", 400), Z = done("Z", 100, 100); // Z خالص
  const running = project({ id: "R", status: "قيد التنفيذ" }), fresh = project({ id: "N", status: "جديد" });
  const projects = [A, B, C, Z, running, fresh];

  // المشاريع القابلة للاختيار: مكتملة وعليها باقٍ فقط
  assert.deepEqual(P.payableProjects(cust, projects, []).map((x) => x.project.id), ["A", "B", "C"]);

  // توزيع بالترتيب: 800 على B(200) ثم A(500) ثم C يأخذ الباقي 100
  let r = P.allocateGeneralPayment({ amount: 800, projectIds: ["B", "A", "C"], projects, income: [] });
  assert.deepEqual(r.parts.map((x) => [x.projectId, x.amount, x.covers]), [["B", 200, true], ["A", 500, true], ["C", 100, false]]);
  assert.equal(r.surplus, 0);

  // الترتيب مهم
  r = P.allocateGeneralPayment({ amount: 300, projectIds: ["A", "B"], projects, income: [] });
  assert.deepEqual(r.parts.map((x) => [x.projectId, x.amount]), [["A", 300]]);
  r = P.allocateGeneralPayment({ amount: 300, projectIds: ["B", "A"], projects, income: [] });
  assert.deepEqual(r.parts.map((x) => [x.projectId, x.amount]), [["B", 200], ["A", 100]]);

  // الزيادة بعد تغطية كل المشاريع المختارة ترجع للعميل
  r = P.allocateGeneralPayment({ amount: 1000, projectIds: ["A", "B"], projects, income: [] });
  assert.equal(r.parts.reduce((s, x) => s + x.amount, 0), 700);
  assert.equal(r.surplus, 300);

  // بلا مشاريع مختارة: كل المبلغ زيادة (سداد عام كما كان)
  r = P.allocateGeneralPayment({ amount: 250, projectIds: [], projects, income: [] });
  assert.deepEqual([r.parts.length, r.surplus], [0, 250]);

  // الجديد وقيد التنفيذ والخالص والمكرر تُتجاهل
  r = P.allocateGeneralPayment({ amount: 400, projectIds: ["N", "R", "Z", "A", "A", "ghost"], projects, income: [] });
  assert.deepEqual(r.parts.map((x) => [x.projectId, x.amount]), [["A", 400]]);

  // التغاضي يُحتسب: باقي D = 500 − 100 دفع − 50 تغاضي = 350
  const D = done("D", 500, 100, { waivedAmount: 50 });
  r = P.allocateGeneralPayment({ amount: 1000, projectIds: ["D"], projects: [D], income: [] });
  assert.deepEqual([r.parts[0].amount, r.surplus], [350, 650]);

  // دقة الكسور العشرية
  const F = done("F", 0.3);
  r = P.allocateGeneralPayment({ amount: 0.1 + 0.2, projectIds: ["F"], projects: [F], income: [] });
  assert.deepEqual([r.parts[0].amount, r.surplus, r.parts[0].covers], [0.3, 0, true]);

  // السجلات: كل جزء دفعة عادية على مشروعه + وارد، والزيادة وارد عام للعميل
  let n = 0;
  const date = "2026-03-10T10:00";
  const out = P.buildGeneralPayment({ customer: cust, amount: 1000, date, note: "دفعة نقدية", projectIds: ["B", "A"], projects, income: [], newId: () => "id" + ++n });
  const byCol = (c) => out.upserts.filter((u) => u.collection === c).map((u) => u.record);
  assert.equal(byCol("projects").length, 2);
  assert.equal(byCol("income").length, 3, "جزءان + الزيادة");
  const incomeParts = byCol("income").filter((x) => x.projectId);
  incomeParts.forEach((inc) => {
    const proj = byCol("projects").find((p) => p.id === inc.projectId);
    const emb = proj.payments[0];
    assert.equal(emb.id, inc.id, "نفس المعرّف داخل المشروع وفي income");
    assert.equal(inc.paymentId, inc.id);
    assert.equal(inc.date, date); assert.equal(emb.date, date);
    assert.equal(inc.includeInIncome, true);
    assert.ok(inc.description.includes("دفعة نقدية"));
  });
  const surplusRec = byCol("income").find((x) => !x.projectId);
  assert.deepEqual([surplusRec.amount, surplusRec.customerId, surplusRec.paymentScope], [300, "c1", "customer"]);
  assert.equal(new Set(byCol("income").map((x) => x.batchId)).size, 1, "كلها من سداد واحد");
  assert.equal(new Set(byCol("income").map((x) => x.id)).size, 3, "معرّفات فريدة");

  // الأثر بعد الحفظ: المشروعان خالصان، ومستحق العميل ينقص بقيمة السداد بالضبط (والزيادة رصيد له)
  const apply = (list, upserts, col) => list.map((x) => (upserts.find((u) => u.collection === col && u.record.id === x.id) || { record: x }).record);
  const after = apply(projects, out.upserts, "projects");
  const incomeAfter = byCol("income");
  assert.equal(P.projectSummary(after.find((p) => p.id === "A"), incomeAfter).settled, true);
  assert.equal(P.projectSummary(after.find((p) => p.id === "B"), incomeAfter).settled, true);
  assert.equal(P.projectSummary(after.find((p) => p.id === "C"), incomeAfter).settled, false, "غير مختار فلا يتأثر");
  const before = P.customerOutstanding(cust, projects, []).total;
  const afterTotal = P.customerOutstanding(cust, after, incomeAfter).total;
  assert.equal(Math.round((before - afterTotal) * 1000) / 1000, 1000);
  // لا تكرار في الواردات: مجموع الواردات المحتسبة = المبلغ المدفوع
  assert.equal(P.countedIncome(after, incomeAfter).reduce((s, x) => s + x.amount, 0), 1000 + 100 + 100, "الدفعات السابقة (200) + السداد الجديد (1000)");
}
console.log("general payment distribution tests: ok");