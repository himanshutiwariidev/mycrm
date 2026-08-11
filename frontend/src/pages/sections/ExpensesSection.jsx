import React from "react";
import { Calendar, CreditCard, Plus, Receipt, Trash2 } from "lucide-react";
import { IconBtn, T, fmtCurrency, fmtShortDate } from "./shared";

const CATEGORY_COLORS = {
  Salary: { color: "#4f46e5", bg: "#e0e7ff" },
  Rent: { color: "#0891b2", bg: "#d2fdff" },
  Utilities: { color: "#0f766e", bg: "#ccfbf1" },
  Marketing: { color: "#f7931e", bg: "#fff4e6" },
  "Software & Tools": { color: "#2563eb", bg: "#dbeafe" },
  "Office Supplies": { color: "#d97706", bg: "#fef3c7" },
  Travel: { color: "#16a34a", bg: "#dcfce7" },
  "Professional Fees": { color: "#7c3aed", bg: "#ede9fe" },
  Other: { color: T.textMuted, bg: "#f1f5f9" },
};

export default function ExpensesSection({ expenses, setTab, setDeleteExpense }) {
  const totalCount = expenses.length;
  const totalAmount = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  return (
    <div className="fade-up">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 19, color: T.textPrimary }}>Expenses</h2>
          <p style={{ fontSize: 12.5, color: T.textMuted, marginTop: 3 }}>
            {totalCount} expense{totalCount !== 1 ? "s" : ""} total &middot; {fmtCurrency(totalAmount)}
          </p>
        </div>
        <button className="pri-btn" onClick={() => setTab("createExpense")} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", background: "linear-gradient(135deg, #f7931e, #e8590c)", color: "#fff", borderRadius: 10, fontSize: 13, fontWeight: 600 }}>
          <Plus size={15} strokeWidth={2.5} /> New Expense
        </button>
      </div>

      {totalCount === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 0" }}>
          <Receipt size={48} strokeWidth={1} color={T.textMuted} style={{ margin: "0 auto 16px", display: "block" }} />
          <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 17, color: T.textSecondary }}>No expenses yet</p>
          <p style={{ fontSize: 13, color: T.textMuted, marginTop: 6 }}>Record your first business expense to get started</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {expenses.map((expense, i) => {
            const cm = CATEGORY_COLORS[expense.category] || CATEGORY_COLORS.Other;
            return (
              <div key={expense._id} className="card card-in" style={{ background: T.card, border: `1.5px solid ${T.border}`, borderRadius: 14, padding: "18px 20px", animationDelay: `${i * 35}ms`, display: "flex", alignItems: "flex-start", boxShadow: "0 1px 3px rgba(0,0,0,.04)" }}>
                <div style={{ width: 3, borderRadius: 99, background: cm.color, alignSelf: "stretch", marginRight: 16, flexShrink: 0, minHeight: 52 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap", marginBottom: expense.notes ? 5 : 10 }}>
                    <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: 14.5, color: T.textPrimary }}>{expense.title}</h3>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 5, color: cm.color, background: cm.bg, letterSpacing: ".07em", textTransform: "uppercase" }}>{expense.category}</span>
                  </div>
                  {expense.notes && <p style={{ fontSize: 12.5, color: T.textMuted, lineHeight: 1.65, marginBottom: 12 }}>{expense.notes}</p>}
                  <div style={{ display: "flex", gap: 18, flexWrap: "wrap", fontSize: 12, color: T.textMuted, alignItems: "center" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Calendar size={12} strokeWidth={1.8} />{fmtShortDate(expense.expenseDate)}</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 5 }}><CreditCard size={12} strokeWidth={1.8} />{expense.paymentMethod}</span>
                    <span>Recorded by {expense.createdBy?.name || "—"}</span>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 14, flexShrink: 0 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: T.textPrimary, fontFamily: "'Inter', sans-serif", minWidth: 90, textAlign: "right" }}>{fmtCurrency(expense.amount)}</span>
                  <IconBtn icon={Trash2} color={T.red} bg={T.redBg} hoverBg={T.redBorder} onClick={() => setDeleteExpense(expense)} title="Delete expense" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
