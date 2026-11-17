/* رقم الفاتورة المتسلسل الثابت للمشاريع: invoiceSerial + 550، بسبع خانات (0000551 ...). */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else {
    root.FactoryDomain = root.FactoryDomain || {};
    root.FactoryDomain.invoiceNumber = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  "use strict";

  const INVOICE_OFFSET = 550;

  const serialOf = (project) => {
    const n = Number(project && project.invoiceSerial);
    return Number.isInteger(n) && n > 0 ? n : 0;
  };

  /** رقم الفاتورة المعروض. المشروع بلا رقم تسلسلي يرجع نصًا فارغًا. */
  const formatInvoiceNumber = (serial) => {
    const n = Number(serial);
    return Number.isInteger(n) && n > 0 ? String(n + INVOICE_OFFSET).padStart(7, "0") : "";
  };

  /** الرقم التسلسلي التالي = أعلى رقم موجود + 1. */
  const nextInvoiceSerial = (projects = []) =>
    projects.reduce((max, p) => Math.max(max, serialOf(p)), 0) + 1;

  /**
   * يرجع المشاريع التي ينقصها رقم فقط، بعد إسناد أرقام لها بترتيب (dateCreated ثم id)
   * تبدأ بعد أعلى رقم موجود. لا يغيّر أي مشروع له رقم، وتشغيله ثانيةً على النتيجة يرجع مصفوفة فارغة.
   */
  const assignMissingSerials = (projects = []) => {
    const missing = projects
      .filter((p) => !serialOf(p))
      .slice()
      .sort(
        (a, b) =>
          String(a.dateCreated || "").localeCompare(String(b.dateCreated || "")) ||
          String(a.id).localeCompare(String(b.id)),
      );
    let next = nextInvoiceSerial(projects);
    return missing.map((p) => ({ ...p, invoiceSerial: next++ }));
  };

  /** الأرقام المتسلسلة المكررة بين أكثر من مشروع. */
  const findDuplicateSerials = (projects = []) => {
    const seen = new Map();
    projects.forEach((p) => {
      const s = serialOf(p);
      if (s) seen.set(s, (seen.get(s) || 0) + 1);
    });
    return Array.from(seen.entries())
      .filter(([, count]) => count > 1)
      .map(([serial]) => serial);
  };

  return { INVOICE_OFFSET, formatInvoiceNumber, nextInvoiceSerial, assignMissingSerials, findDuplicateSerials };
});
