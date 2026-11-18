/* يختبر منطق الواجهة الصغير (Enter للحفظ، قفل التمرير للنوافذ) باستخراجه من app.js وتشغيله. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");

const a = app.indexOf("function submitOnEnter");
const b = app.indexOf("function ce(");
assert.ok(a > 0 && b > a, "لم أجد دوال الواجهة في app.js");
const bodyBg = { style: { overflow: "" } };
const factory = new Function("document", app.slice(a, b) + "\nreturn { submitOnEnter, __modalStack, __lockScroll, __unlockScroll };");
const ui = factory({ body: bodyBg });

function makeEvent({ key = "Enter", tag = "INPUT", buttons, shift = false, noEnter = false, composing = false }) {
  const calls = { prevented: false };
  return {
    calls,
    e: {
      key, shiftKey: shift, nativeEvent: { isComposing: composing },
      target: { tagName: tag, closest: (sel) => (noEnter && sel === "[data-no-enter]" ? {} : null) },
      currentTarget: { querySelectorAll: () => buttons },
      preventDefault: () => { calls.prevented = true; },
    },
  };
}
const btn = (text, disabled = false) => { const o = { textContent: text, disabled, clicked: 0, click() { o.clicked++; } }; return o; };

// Enter في حقل نص يضغط زر «حفظ …»
let add = btn(" + إضافة بند"), save = btn(" حفظ الفاتورة");
let t = makeEvent({ buttons: [add, save] });
ui.submitOnEnter(t.e, "حفظ الفاتورة");
assert.equal(save.clicked, 1);
assert.equal(add.clicked, 0);
assert.ok(t.calls.prevented);

// وضع التعديل: «حفظ تعديل الفاتورة» يعمل أيضًا (كان لا يعمل سابقًا)
save = btn(" حفظ تعديل الفاتورة");
t = makeEvent({ buttons: [btn("× حذف"), save] });
ui.submitOnEnter(t.e, "حفظ الفاتورة");
assert.equal(save.clicked, 1);

// Enter وهو على زر لا يحفظ ولا يلغي عمل الزر
save = btn("حفظ المصروف");
t = makeEvent({ tag: "BUTTON", buttons: [save] });
ui.submitOnEnter(t.e, "حفظ المصروف");
assert.equal(save.clicked, 0);
assert.equal(t.calls.prevented, false);

// textarea وShift+Enter وحقل البحث (data-no-enter) وكتابة IME لا تحفظ
for (const over of [{ tag: "TEXTAREA" }, { shift: true }, { noEnter: true }, { composing: true }, { key: "a" }]) {
  save = btn("حفظ الوارد");
  t = makeEvent({ buttons: [save], ...over });
  ui.submitOnEnter(t.e, "حفظ الوارد");
  assert.equal(save.clicked, 0, JSON.stringify(over));
}

// الزر المعطّل لا يُضغط (مبلغ فارغ)
save = btn("حفظ المصروف", true);
t = makeEvent({ buttons: [save] });
ui.submitOnEnter(t.e, "حفظ المصروف");
assert.equal(save.clicked, 0);

// قفل التمرير للنوافذ المتداخلة: يُعاد التمرير فقط بعد إغلاق آخر نافذة
bodyBg.style.overflow = "";
ui.__lockScroll(); ui.__lockScroll();
assert.equal(bodyBg.style.overflow, "hidden");
ui.__unlockScroll();
assert.equal(bodyBg.style.overflow, "hidden", "ما زالت نافذة مفتوحة");
ui.__unlockScroll();
assert.equal(bodyBg.style.overflow, "");

// ربط الأرقام والترحيل داخل التطبيق
assert.ok(app.includes("nextInvoiceSerial(x)"), "مشروع جديد يأخذ رقمًا تسلسليًا");
assert.ok(app.includes("assignMissingSerials(x)"), "المشاريع القديمة تُرقَّم مرة واحدة");
assert.ok(app.includes('paymentScope: "customer"'), "السداد العام للعميل مسجّل بنوعه");
assert.ok(app.includes('__uiStateKey = "factory_ui_state_v1"'), "حالة القسم لها مفتاح تخزين مستقل");
assert.ok(app.includes("localStorage.setItem(__uiStateKey, JSON.stringify({ section: F, subSection: X }))"), "القسم الحالي محفوظ بعد التحديث");
assert.ok(app.includes("if (oPrinted || v.closed) return;"), "التقرير السنوي لا يطبع مرتين");
assert.ok(app.includes('name: "printer"'), "أزرار الطباعة تستخدم أيقونة طابعة");
assert.ok(app.includes("goReports: () => U(\"reports\")"), "بطاقات لوحة التحكم تستطيع فتح التقارير");
assert.ok(app.includes("dashboard-card") && app.includes('" interactive"'), "بطاقات لوحة التحكم تفاعلية");
assert.ok(app.includes("app-sidebar"), "الشريط الجانبي يحمل تنسيقًا مخصصًا");
const css = fs.readFileSync(path.join(__dirname, "..", "styles.css"), "utf8");
assert.ok(css.includes("--sidebar-border") && css.includes(".mobile-bottom-nav"), "الشريط له تباين وحدود ثابتة");

console.log("ui-behavior tests: ok");
