(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.FactoryReports = factory();
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  "use strict";

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    })[char]);
  }

  function number(value) {
    return Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 3 });
  }

  function monthLabel(month) {
    return new Date(`${month}-01T12:00:00`).toLocaleDateString("ar-LY", {
      month: "long",
    });
  }

  function createAnnualReportHtml({ year, rows, companyName, logoUrl, generatedAt }) {
    const totals = rows.reduce(
      (result, row) => ({
        expenses: result.expenses + row.expenses,
        income: result.income + row.income,
        invoices: result.invoices + row.invoices,
        paidInvoices: result.paidInvoices + row.paidInvoices,
        net: result.net + row.net,
      }),
      { expenses: 0, income: 0, invoices: 0, paidInvoices: 0, net: 0 },
    );
    const rowHtml = rows.map((row, index) => `<tr>
      <td>${index + 1}</td><td class="name">${escapeHtml(monthLabel(row.month))}</td>
      <td>${number(row.expenses)}</td><td>${number(row.income)}</td>
      <td>${number(row.invoices)}</td><td>${number(row.paidInvoices)}</td>
      <td class="net">${number(row.net)}</td>
    </tr>`).join("");
    const totalHtml = `<tr class="total"><td colspan="2" class="name">إجمالي السنة</td>
      <td>${number(totals.expenses)}</td><td>${number(totals.income)}</td>
      <td>${number(totals.invoices)}</td><td>${number(totals.paidInvoices)}</td>
      <td class="net">${number(totals.net)}</td></tr>`;

    return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>التقرير المالي السنوي ${escapeHtml(year)}</title><style>
      @page{size:A4 landscape;margin:10mm}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      body{margin:0;background:#eef2f1;color:#17212b;font-family:Cairo,Arial,Tahoma,sans-serif;font-size:12px}
      .page{width:277mm;margin:0 auto;background:#fff;padding:9mm 12mm 11mm}.topline{height:5mm;margin:-9mm -12mm 7mm;background:linear-gradient(90deg,#0b3e42,#125b5f,#d8a84e)}
      .header{display:flex;align-items:center;justify-content:space-between;gap:16px;border-bottom:1px solid #dce6e7;padding-bottom:10px}.identity{display:flex;align-items:center;gap:12px}.logo{width:52px;height:52px;border-radius:12px;object-fit:cover}.company{font-size:19px;font-weight:800;color:#0b3e42}.subtitle,.meta{font-size:11px;color:#64727d}.title{font-size:21px;font-weight:800;color:#0b3e42;margin:16px 0 3px}.period{font-size:12px;color:#64727d;margin-bottom:12px}
      .cards{display:grid;grid-template-columns:repeat(5,1fr);gap:7px;margin-bottom:14px}.card{border:1px solid #dce6e7;border-radius:10px;padding:8px 10px;background:#f8fbfa}.card .label{display:block;color:#64727d;font-size:10px;margin-bottom:3px}.card strong{font-size:15px;color:#0b3e42}.card.net{background:#125b5f}.card.net .label,.card.net strong{color:#fff}
      table{width:100%;border-collapse:collapse;border:1px solid #dce6e7;overflow:hidden}th{background:#0b3e42;color:#fff;padding:8px 6px;font-size:11px}td{padding:8px 6px;border-top:1px solid #dce6e7;text-align:center}td.name{text-align:right;font-weight:700}tbody tr:nth-child(even) td{background:#f8fbfa}.net{font-weight:800;color:#0b5b58}.total td{background:#e6f1ef!important;font-weight:800;color:#0b3e42;border-top:2px solid #125b5f}.footer{margin-top:18px;text-align:center;color:#64727d;font-size:10px}@media print{body{background:#fff}.page{width:auto;margin:0;padding:0}.topline{margin:0 0 7mm}}
      </style></head><body><main class="page"><div class="topline"></div><header class="header"><div class="identity"><img class="logo" src="${escapeHtml(logoUrl)}" alt="الشعار" /><div><div class="company">${escapeHtml(companyName)}</div><div class="subtitle">التقرير المالي السنوي</div></div></div><div class="meta">السنة: <strong>${escapeHtml(year)}</strong><br/>تاريخ الطباعة: <strong>${escapeHtml(generatedAt)}</strong></div></header>
      <h1 class="title">ملخص الحركة المالية للسنة ${escapeHtml(year)}</h1><div class="period">المصاريف والواردات والفواتير والمدفوعات وصافي الحركة النقدية لكل شهر</div>
      <section class="cards"><div class="card"><span class="label">مجموع المصاريف</span><strong>${number(totals.expenses)}</strong></div><div class="card"><span class="label">مجموع الواردات</span><strong>${number(totals.income)}</strong></div><div class="card"><span class="label">مجموع قيم الفواتير</span><strong>${number(totals.invoices)}</strong></div><div class="card"><span class="label">مجموع الفواتير المدفوعة</span><strong>${number(totals.paidInvoices)}</strong></div><div class="card net"><span class="label">مجموع صافي الحركة</span><strong>${number(totals.net)}</strong></div></section>
      <table><thead><tr><th>#</th><th>الشهر</th><th>المصاريف</th><th>الواردات</th><th>قيمة الفواتير</th><th>الفواتير المدفوعة</th><th>صافي الحركة النقدية</th></tr></thead><tbody>${rowHtml}${totalHtml}</tbody></table><div class="footer">تم إنشاء التقرير آليًا من نظام حسابات شركة الشرق الكبرى للطلاء الخارجي.</div></main></body></html>`;
  }

  return { createAnnualReportHtml };
});
