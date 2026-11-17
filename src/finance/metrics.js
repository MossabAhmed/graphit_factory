(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("../domain/suppliers.js"));
  else root.FactoryFinance = factory(root.FactoryDomain && root.FactoryDomain.suppliers);
})(typeof globalThis !== "undefined" ? globalThis : window, function (suppliersDomain) {
  "use strict";

  function monthOf(value) {
    return String(value || "").slice(0, 7);
  }

  function amount(value) {
    const number = Number(value || 0);
    return Number.isFinite(number) ? number : 0;
  }

  function sum(rows) {
    return rows.reduce((total, row) => total + amount(row.amount), 0);
  }

  const paidInvoicesForMonth = (invoices, suppliers, month) =>
    suppliersDomain.paidInvoicesForMonth(invoices || [], suppliers || [], month);

  function buildAnnualRows({ year, invoices = [], expenses = [], income = [], suppliers = [] }) {
    const normalizedYear = String(year || new Date().getFullYear()).slice(0, 4);
    return Array.from({ length: 12 }, (_, index) => {
      const month = `${normalizedYear}-${String(index + 1).padStart(2, "0")}`;
      const monthExpenses = expenses.filter((row) => monthOf(row.date) === month);
      const monthIncome = income.filter(
        (row) => monthOf(row.date) === month && row.includeInIncome !== false,
      );
      const monthInvoices = invoices.filter((row) => monthOf(row.date) === month);
      const expensesTotal = sum(monthExpenses);
      const incomeTotal = sum(monthIncome);
      const invoicesTotal = sum(monthInvoices);
      const paidInvoicesTotal = paidInvoicesForMonth(invoices, suppliers, month);
      return {
        month,
        expenses: expensesTotal,
        income: incomeTotal,
        invoices: invoicesTotal,
        paidInvoices: paidInvoicesTotal,
        net: incomeTotal - expensesTotal - paidInvoicesTotal,
      };
    });
  }

  function totals(rows) {
    return rows.reduce(
      (total, row) => ({
        expenses: total.expenses + row.expenses,
        income: total.income + row.income,
        invoices: total.invoices + row.invoices,
        paidInvoices: total.paidInvoices + row.paidInvoices,
        net: total.net + row.net,
      }),
      { expenses: 0, income: 0, invoices: 0, paidInvoices: 0, net: 0 },
    );
  }

  return { monthOf, paidInvoicesForMonth, buildAnnualRows, totals };
});
