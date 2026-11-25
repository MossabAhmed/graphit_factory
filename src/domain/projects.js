/* حسابات المشاريع والعملاء: التكلفة والدفعات والباقي والفائض ورصيد العميل. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./money.js"));
  else {
    root.FactoryDomain = root.FactoryDomain || {};
    root.FactoryDomain.projects = factory(root.FactoryDomain.money);
  }
})(typeof globalThis !== "undefined" ? globalThis : window, function (money) {
  "use strict";
  const { normalizeName, round3 } = money;

  /** تكلفة المشروع = مجموع المكاييل. */
  const projectCost = (project) =>
    (project.measurements || []).reduce((sum, m) => sum + Number(m.totalAmount || 0), 0);

  /** دفعات المشروع: المخزّنة داخله + المسجّلة في income بمعرّف المشروع، بلا تكرار (حسب paymentId). */
  const projectPayments = (project, income = []) => {
    const embedded = (project.payments || []).map((p) => ({
      ...p,
      paymentId: p.paymentId || p.id,
      projectId: project.id,
    }));
    const fromIncome = income
      .filter((entry) => entry.projectId === project.id)
      .map((entry) => ({ ...entry, paymentId: entry.paymentId || entry.id }));
    const unique = new Map();
    [...embedded, ...fromIncome].forEach((p) => {
      const key = p.paymentId || p.id;
      if (key) unique.set(key, p);
    });
    return Array.from(unique.values());
  };

  /**
   * ملخص المشروع.
   * - الباقي = التكلفة − المتغاضى عنه − المدفوع (لا يقل عن صفر).
   * - الزيادة بعد اكتمال المشروع (surplus) تذهب لرصيد العميل، وقبل الاكتمال (advance) تبقى مقدّمًا.
   * - لا يكون المشروع «خالصًا» إلا إذا اكتمل وفيه كيل ولا باقٍ.
   */
  const projectSummary = (project, income = []) => {
    const cost = projectCost(project);
    const paid = projectPayments(project, income).reduce((s, p) => s + Number(p.amount || 0), 0);
    const waived = Math.min(cost, Math.max(0, Number(project.waivedAmount || 0)));
    const completed = project.status === "مكتمل";
    const hasMeasure = (project.measurements || []).length > 0;
    const net = Math.round((cost - waived - paid) * 1e3) / 1e3;
    const extra = Math.max(0, -net);
    return {
      cost,
      paid,
      waived,
      completed,
      hasMeasure,
      remaining: Math.max(0, net),
      surplus: completed ? extra : 0,
      advance: completed ? 0 : extra,
      settled: completed && hasMeasure && net <= 0,
    };
  };

  /** إزالة تكرار الواردات غير المرتبطة بمشروع (حسب المعرّف). */
  const dedupeIncome = (entries = []) => {
    const unique = new Map();
    entries.forEach((entry) => {
      const key = (entry.projectId && entry.paymentId) || entry.id;
      if (key) unique.set(key, entry);
    });
    return Array.from(unique.values());
  };

  /** كل الواردات: الواردات العامة + دفعات كل المشاريع، مدموجة بلا تكرار. */
  const allProjectIncome = (projects = [], income = []) => {
    const unique = new Map();
    dedupeIncome(income.filter((entry) => !entry.projectId)).forEach((entry) => unique.set(entry.id, entry));
    projects.forEach((project) => {
      projectPayments(project, income).forEach((payment) => {
        const key = payment.paymentId || payment.id;
        if (key) {
          unique.set(key, {
            ...payment,
            customerName: payment.customerName || project.customerName,
            projectId: project.id,
          });
        }
      });
    });
    return Array.from(unique.values());
  };

  /** الواردات المحتسبة فقط (includeInIncome ليست false). */
  const countedIncome = (projects = [], income = []) =>
    allProjectIncome(projects, income).filter((entry) => entry.includeInIncome !== false);

  /** رصيد الحركات اليدوية: الزيادة (debit) موجبة، والتسديد (credit) سالب. */
  const ledgerBalance = (contact) =>
    (contact.transactions || []).reduce(
      (sum, t) => sum + (t.type === "debit" ? Number(t.amount) : -Number(t.amount)),
      0,
    );

  /** مشاريع العميل: بالمعرّف، أو بالاسم للمشاريع القديمة التي بلا معرّف عميل. */
  const customerProjects = (customer, projects) =>
    projects.filter(
      (p) => p.customerId === customer.id || (!p.customerId && p.customerName === customer.name),
    );

  /** السداد العام للعميل: واردات موجبة بلا مشروع، مرتبطة بالعميل (بالمعرّف أو بالاسم). */
  const customerDirectPayments = (customer, income = []) =>
    (income || [])
      .filter(
        (entry) =>
          !entry.projectId &&
          Number(entry.amount) > 0 &&
          (entry.customerId
            ? entry.customerId === customer.id
            : entry.customerName && normalizeName(entry.customerName) === normalizeName(customer.name)),
      )
      .sort((a, b) => (a.date || "").localeCompare(b.date || ""));

  /**
   * المستحق على العميل = الرصيد اليدوي + باقي المشاريع − فائض المشاريع المكتملة − السداد العام.
   * القيمة السالبة تعني رصيدًا للعميل.
   */
  const customerOutstanding = (customer, projects, income) => {
    const ledger = ledgerBalance(customer);
    const summaries = customerProjects(customer, projects).map((p) => projectSummary(p, income));
    const projectsRemaining = summaries.reduce((s, m) => s + m.remaining, 0);
    const projectsSurplus = summaries.reduce((s, m) => s + m.surplus, 0);
    const directPaid = customerDirectPayments(customer, income).reduce((s, e) => s + Number(e.amount || 0), 0);
    return {
      ledger,
      projectsRemaining,
      projectsSurplus,
      directPaid,
      total: ledger + projectsRemaining - projectsSurplus - directPaid,
    };
  };


  /** المشاريع التي يمكن توزيع السداد العام عليها: المكتملة وعليها باقٍ (بعد التغاضي والدفعات). */
  const payableProjects = (customer, projects, income = []) =>
    customerProjects(customer, projects)
      .map((project) => ({ project, summary: projectSummary(project, income) }))
      .filter(({ project, summary }) => project.status === "مكتمل" && summary.remaining > 0);

  /**
   * توزيع سداد عام على مشاريع بترتيب اختيارها: كل مشروع يأخذ باقيه ثم ينتقل الباقي للتالي.
   * ما يزيد بعد تغطية المشاريع المختارة (أو كل المبلغ إن لم يُختر شيء) يعود في surplus ليُضاف لرصيد العميل.
   * المشاريع غير المكتملة أو التي لا باقي عليها تُتجاهل.
   */
  const allocateGeneralPayment = ({ amount, projectIds = [], projects = [], income = [] }) => {
    const total = round3(amount);
    let left = total;
    const parts = [];
    const seen = new Set();
    projectIds.forEach((id) => {
      if (seen.has(id)) return;
      seen.add(id);
      const project = projects.find((p) => p.id === id);
      if (!project || project.status !== "مكتمل" || left <= 0) return;
      const remaining = round3(projectSummary(project, income).remaining);
      if (remaining <= 0) return;
      const part = Math.min(left, remaining);
      parts.push({ projectId: id, amount: part, remaining, covers: part >= remaining });
      left = round3(left - part);
    });
    return { parts, surplus: left, total };
  };

  /**
   * سجلات الحفظ لسداد عام موزّع: كل جزء دفعة عادية على مشروعه (داخل المشروع وفي income، بتاريخه)،
   * والزيادة وارد عام للعميل بلا مشروع. newId تُحقن لتبقى الدالة نقية وقابلة للاختبار.
   */
  const buildGeneralPayment = ({ customer, amount, date, note, projectIds = [], projects = [], income = [], newId }) => {
    const alloc = allocateGeneralPayment({ amount, projectIds, projects: customerProjects(customer, projects), income });
    const label = String(note || "").trim() || "سداد عام من العميل";
    const batchId = newId();
    const upserts = [];
    alloc.parts.forEach((part) => {
      const project = projects.find((p) => p.id === part.projectId);
      const id = newId();
      const description = label + " (جزء من سداد عام)";
      const payment = { id, date, amount: part.amount, includeInIncome: true, description };
      upserts.push({ collection: "projects", record: { ...project, payments: [payment, ...(project.payments || [])] } });
      upserts.push({
        collection: "income",
        record: { id, paymentId: id, projectId: project.id, date, customerName: project.customerName, amount: part.amount, includeInIncome: true, description, batchId },
      });
    });
    if (alloc.surplus > 0) {
      upserts.push({
        collection: "income",
        record: {
          id: newId(), projectId: null, customerId: customer.id, customerName: customer.name, paymentScope: "customer",
          amount: alloc.surplus, date, includeInIncome: true, batchId,
          description: alloc.parts.length ? label + " (زيادة أُضيفت لرصيد العميل)" : label,
        },
      });
    }
    return { ...alloc, upserts };
  };

  const FILTER_ALL = "الكل";
  const FILTER_SETTLED = "مكتمل خالص";
  const FILTER_OPEN = "مكتمل غير خالص";

  /**
   * هل يطابق المشروع فلتر صفحة المشاريع؟
   * - الحالات العادية (جديد / قيد التنفيذ / مكتمل) تطابق حقل status.
   * - «مكتمل خالص» = projectSummary.settled، و«مكتمل غير خالص» = مكتمل وغير خالص.
   * لوحة التحكم تستخدم هذه الدالة نفسها، فلا يختلف تعريف «خالص» بين الشاشتين.
   */
  const matchesProjectFilter = (project, filter, income = []) => {
    if (!filter || filter === FILTER_ALL) return true;
    if (filter === FILTER_SETTLED) return projectSummary(project, income).settled;
    if (filter === FILTER_OPEN) return project.status === "مكتمل" && !projectSummary(project, income).settled;
    return project.status === filter;
  };

  return {
    FILTER_ALL,
    FILTER_SETTLED,
    FILTER_OPEN,
    matchesProjectFilter,
    payableProjects,
    allocateGeneralPayment,
    buildGeneralPayment,
    projectCost,
    projectPayments,
    projectSummary,
    dedupeIncome,
    allProjectIncome,
    countedIncome,
    ledgerBalance,
    customerProjects,
    customerDirectPayments,
    customerOutstanding,
  };
});