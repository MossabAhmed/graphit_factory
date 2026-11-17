/* أدوات الأرقام والنصوص الأساسية. بلا اعتماديات، وتعمل في المتصفح وفي Node. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else {
    root.FactoryDomain = root.FactoryDomain || {};
    root.FactoryDomain.money = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  "use strict";

  /** تقريب إلى ثلاث خانات عشرية (الدينار الليبي). */
  const round3 = (value) => Math.round(Number(value || 0) * 1e3) / 1e3;

  /** رقم صالح وأكبر من صفر. */
  const isPositive = (value) => Number.isFinite(Number(value)) && Number(value) > 0;

  /** رقم صالح وغير سالب. */
  const isNonNegative = (value) => Number.isFinite(Number(value)) && Number(value) >= 0;

  /** مجموع بنود لها اسم وقيمة إجمالية صالحة. `nameKey` اسم حقل الاسم في البند. */
  const itemsTotal = (items, nameKey) =>
    (items || [])
      .filter((item) => String(item[nameKey] || "").trim() && isPositive(item.total))
      .reduce((sum, item) => sum + Number(item.total || 0), 0);

  /** إجمالي قبل الخصم، والخصم، والصافي بعد التقريب. */
  const applyDiscount = (gross, discount) => {
    const grossAmount = round3(gross);
    const discountAmount = round3(discount);
    return { grossAmount, discountAmount, netAmount: Math.round((grossAmount - discountAmount) * 1e3) / 1e3 };
  };

  /** الشهر (YYYY-MM) من تاريخ نصي. */
  const monthKey = (value) => (value || "").slice(0, 7);

  /** تطبيع الاسم لمقارنة الأسماء العربية. */
  const normalizeName = (value) =>
    String(value || "")
      .trim()
      .replace(/\s+/g, " ")
      .toLocaleLowerCase("ar");

  return { round3, isPositive, isNonNegative, itemsTotal, applyDiscount, monthKey, normalizeName };
});
