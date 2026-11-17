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
