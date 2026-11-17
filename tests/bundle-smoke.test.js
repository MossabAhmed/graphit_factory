/* يشغّل app.js فعليًا في بيئة وهمية ليتأكد أنه يُحمَّل بلا أخطاء وأنه يرتبط بوحدات الحسابات. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");

function collectStrings(node, out = []) {
  if (node == null || typeof node === "boolean") return out;
  if (typeof node === "string" || typeof node === "number") { out.push(String(node)); return out; }
  if (Array.isArray(node)) { node.forEach((n) => collectStrings(n, out)); return out; }
  if (typeof node === "object") {
    // يُشغَّل مكوّن React الوظيفي لنرى ما يرسمه فعلًا
    if (typeof node.type === "function") { collectStrings(node.type(node.props || {}), out); return out; }
    collectStrings(node.props && node.props.children, out);
  }
  return out;
}

function boot({ withSupabase }) {
  const rendered = [];
  const ctx = {
    console,
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    document: {
      getElementById: () => ({ textContent: "" }),
      createElement: () => ({ style: {}, setAttribute() {} }),
      head: { appendChild() {} },
      documentElement: { setAttribute() {}, style: {} },
      body: { style: {} },
      addEventListener() {},
    },
    addEventListener() {},
    removeEventListener() {},
    setTimeout, clearTimeout,
  };
  ctx.window = ctx;
  ctx.globalThis = ctx;
  const el = (type, props, ...children) => ({ type, props: { ...(props || {}), children: children.length === 1 ? children[0] : children } });
  ctx.React = {
    createElement: el,
    Fragment: "Fragment",
    useState: (init) => [typeof init === "function" ? init() : init, () => {}],
    useEffect: () => {},
    useMemo: (fn) => fn(),
    useRef: (init) => ({ current: init }),
  };
  ctx.ReactDOM = { createRoot: () => ({ render: (node) => rendered.push(node) }) };
  if (withSupabase) {
    const client = {
      auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) },
      channel: () => ({ on() { return this; }, subscribe() { return this; } }),
      removeChannel() {},
    };
    ctx.supabase = { createClient: () => client };
  }
  vm.createContext(ctx);
  const files = ["src/domain/money.js", "src/domain/projects.js", "src/domain/suppliers.js", "src/domain/invoice-number.js",
    "src/finance/metrics.js", "src/reports/annual-report.js", "app.js"];
  files.forEach((f) => new vm.Script(read(f), { filename: f }).runInContext(ctx));
  return { rendered, ctx };
}

// 1) الاتصال متاح: يُعرض الموقع (شاشة التحقق من الحساب) بلا أخطاء
let { rendered } = boot({ withSupabase: true });
assert.equal(rendered.length, 1, "يجب أن يُرسم التطبيق مرة واحدة");
assert.ok(collectStrings(rendered[0]).some((t) => t.includes("جارٍ التحقق")), "تظهر شاشة التحقق من الحساب");

// 2) مكتبة Supabase لم تُحمَّل: لا سقوط صامت للتخزين المحلي، بل شاشة خطأ واضحة
({ rendered } = boot({ withSupabase: false }));
assert.ok(collectStrings(rendered[0]).some((t) => t.includes("تعذر الاتصال بخدمة البيانات")));

// 3) غياب وحدات الحسابات يعطي رسالة واضحة بدل شاشة بيضاء صامتة
assert.throws(() => {
  const ctx = { document: { getElementById: () => ({}) }, React: { useState() {}, useEffect() {}, useMemo() {}, useRef() {} }, console };
  ctx.window = ctx; vm.createContext(ctx);
  new vm.Script(read("app.js")).runInContext(ctx);
}, /FactoryDomain/);

// 4) الحزمة لا تحتوي على المنطق القديم المكرر ولا على رقم الفاتورة العشوائي القديم
const app = read("app.js");
assert.ok(!app.includes("-0000550"), "رقم الفاتورة القديم المبني على المعرّف العشوائي أُزيل");
assert.ok(app.includes("FD.projects.projectSummary"), "الحسابات تأتي من وحدات src/domain");

console.log("bundle-smoke tests: ok");
