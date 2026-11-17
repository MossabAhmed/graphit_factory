/* حسابات الموردين والفواتير المدفوعة. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./money.js"));
  else {
    root.FactoryDomain = root.FactoryDomain || {};
    root.FactoryDomain.suppliers = factory(root.FactoryDomain.money);
  }
})(typeof globalThis !== "undefined" ? globalThis : window, function (money) {
  "use strict";
  const { isPositive, monthKey } = money;

  /** فواتير المورد الآجلة (المرتبطة بقيد دين) مرتبة بالأقدم. */
  const debtInvoices = (supplierId, invoices = []) =>
    invoices
      .filter((i) => i.supplierId === supplierId && i.debtTransactionId && isPositive(i.amount))
      .sort(
        (a, b) => (a.date || "").localeCompare(b.date || "") || String(a.id).localeCompare(String(b.id)),
      );

  /** كشف حساب المورد: المدفوع والمتبقي لكل فاتورة، والمستحق علينا أو لنا. */
  const supplierStatement = (supplier, invoices = []) => {
    const list = debtInvoices(supplier.id, invoices);
    const transactions = supplier.transactions || [];
    const paidByInvoice = new Map();
    transactions
      .filter((t) => t.supplierPayment && Array.isArray(t.allocations))
      .forEach((t) => {
        t.allocations.forEach((a) => {
          const amount = Math.max(0, Number(a.amount || 0));
          if (!amount || !list.some((inv) => inv.id === a.invoiceId)) return;
          paidByInvoice.set(a.invoiceId, (paidByInvoice.get(a.invoiceId) || 0) + amount);
        });
      });
    const rows = list.map((invoice) => {
      const amount = Number(invoice.amount || 0);
      const paid = Math.min(amount, paidByInvoice.get(invoice.id) || 0);
      return { invoice, paid, remaining: Math.max(0, amount - paid) };
    });
    const supplierPaymentsTotal = transactions
      .filter((t) => t.supplierPayment)
      .reduce((s, t) => s + Math.max(0, Number(t.amount || 0)), 0);
    const allocatedTotal = rows.reduce((s, r) => s + r.paid, 0);
    let credits =
      transactions
        .filter((t) => t.type === "credit" && !t.supplierPayment)
        .reduce((s, t) => s + Math.max(0, Number(t.amount || 0)), 0) +
      Math.max(0, supplierPaymentsTotal - allocatedTotal);
    rows.forEach((row) => {
      const extra = Math.min(row.remaining, credits);
      row.paid += extra;
      row.remaining -= extra;
      credits -= extra;
    });
    const invoiceDebt = rows.reduce((s, r) => s + Number(r.remaining || 0), 0);
    const invoicePaid = rows.reduce((s, r) => s + Number(r.paid || 0), 0);
    const debtIds = new Set(list.map((inv) => inv.debtTransactionId));
    const manualBalance = transactions
      .filter((t) => !debtIds.has(t.id) && !t.supplierPayment && t.type === "debit")
      .reduce((s, t) => s + Math.max(0, Number(t.amount || 0)), 0);
    const paymentExcess = credits;
    const net = invoiceDebt + manualBalance - paymentExcess;
    return {
      rows,
      invoiceDebt,
      invoicePaid,
      manualBalance,
      paymentExcess,
      owed: Math.max(0, net),
      credit: Math.max(0, -net),
      totalInvoices: list.reduce((s, inv) => s + Number(inv.amount || 0), 0),
    };
  };

  /** توزيع مبلغ سداد على أقدم الفواتير غير المسددة. */
  const allocatePayment = (supplier, invoices, amount) => {
    const statement = supplierStatement(supplier, invoices);
    let left = Number(amount || 0);
    return statement.rows
      .filter((row) => row.remaining > 0)
      .map((row) => {
        const allocated = Math.min(row.remaining, left);
        left -= allocated;
        return allocated > 0 ? { invoiceId: row.invoice.id, amount: allocated } : null;
      })
      .filter(Boolean);
  };

  /** المدفوع فعليًا في الشهر: فواتير نقدية (بلا دين) + دفعات الموردين. */
  const paidInvoicesForMonth = (invoices = [], suppliers = [], month) => {
    const cashInvoices = (invoices || [])
      .filter((i) => monthKey(i.date) === month && !i.debtTransactionId)
      .reduce((s, i) => s + Number(i.amount || 0), 0);
    const supplierPayments = (suppliers || [])
      .flatMap((s) => s.transactions || [])
      .filter((t) => t.supplierPayment && monthKey(t.date) === month)
      .reduce((s, t) => s + Math.max(0, Number(t.amount || 0)), 0);
    return cashInvoices + supplierPayments;
  };

  return { debtInvoices, supplierStatement, allocatePayment, paidInvoicesForMonth };
});
