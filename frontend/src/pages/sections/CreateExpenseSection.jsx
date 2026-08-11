import React from "react";
import { Calendar, CreditCard, IndianRupee, Layers, Plus, Receipt } from "lucide-react";
import { FieldIcon, FormField, T, baseInp, baseInpNoIcon } from "./shared";

const CATEGORIES = ["Salary", "Rent", "Utilities", "Marketing", "Software & Tools", "Office Supplies", "Travel", "Professional Fees", "Other"];
const PAYMENT_METHODS = ["NEFT", "RTGS", "Bank Draft", "UPI", "Cash", "Cheque", "Card Swap", "Other"];

export default function CreateExpenseSection({ expenseForm, setExpenseForm, handleCreateExpense }) {
  return (
    <div className="fade-up" style={{ maxWidth: 620 }}>
      <div style={{ marginBottom: 26 }}>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 20, color: T.textPrimary }}>Record New Expense</h2>
        <p style={{ fontSize: 13, color: T.textMuted, marginTop: 4 }}>Fill in the details below to log a business expense</p>
      </div>
      <div style={{ background: T.card, border: `1.5px solid ${T.border}`, borderRadius: 18, padding: "30px", boxShadow: "0 2px 8px rgba(0,0,0,.05)" }}>
        <form onSubmit={handleCreateExpense}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <FormField label="Expense Title" span2>
              <div style={{ position: "relative" }}><FieldIcon icon={Receipt} /><input className="inp" style={baseInp} type="text" placeholder="e.g. Office Rent - August" value={expenseForm.title} onChange={e => setExpenseForm({ ...expenseForm, title: e.target.value })} required /></div>
            </FormField>
            <FormField label="Amount">
              <div style={{ position: "relative" }}><FieldIcon icon={IndianRupee} /><input className="inp" style={baseInp} type="number" min="0" step="0.01" placeholder="0.00" value={expenseForm.amount} onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })} required /></div>
            </FormField>
            <FormField label="Category">
              <div style={{ position: "relative" }}><FieldIcon icon={Layers} /><select className="inp" style={{ ...baseInp, appearance: "none" }} value={expenseForm.category} onChange={e => setExpenseForm({ ...expenseForm, category: e.target.value })}>{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
            </FormField>
            <FormField label="Expense Date">
              <div style={{ position: "relative" }}><FieldIcon icon={Calendar} /><input className="inp" style={baseInp} type="date" value={expenseForm.expenseDate} onChange={e => setExpenseForm({ ...expenseForm, expenseDate: e.target.value })} /></div>
            </FormField>
            <FormField label="Payment Method">
              <div style={{ position: "relative" }}><FieldIcon icon={CreditCard} /><select className="inp" style={{ ...baseInp, appearance: "none" }} value={expenseForm.paymentMethod} onChange={e => setExpenseForm({ ...expenseForm, paymentMethod: e.target.value })}>{PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
            </FormField>
            <FormField label="Notes" span2>
              <textarea className="inp" style={{ ...baseInpNoIcon, minHeight: 96 }} placeholder="Optional notes…" value={expenseForm.notes} onChange={e => setExpenseForm({ ...expenseForm, notes: e.target.value })} />
            </FormField>
          </div>
          <button className="pri-btn" type="submit" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", background: "linear-gradient(135deg, #f7931e, #e8590c)", color: "#fff", borderRadius: 11, padding: "13px", fontSize: 14, fontWeight: 700, fontFamily: "'Syne', sans-serif", letterSpacing: ".03em" }}>
            <Plus size={16} strokeWidth={2.5} /> Record Expense
          </button>
        </form>
      </div>
    </div>
  );
}
