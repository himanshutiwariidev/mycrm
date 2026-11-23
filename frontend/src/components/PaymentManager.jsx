import React, { useState } from "react";
import { Trash2 } from "lucide-react";
import { addPayment, deletePayment } from "../services/clientApi";
import "./PaymentManager.css";

const PAYMENT_METHODS = ["NEFT", "RTGS", "Bank Draft", "UPI", "Cash", "Cheque", "Card Swap", "3 Parts", "P Account", "Other"];

// new Date().toISOString() reports the UTC calendar date, which lags a day behind
// local time (e.g. IST) for several hours after midnight — always build the
// default date input value from local Y/M/D so "today" actually means today.
const toLocalDateInput = (d) => {
  const x = new Date(d);
  const year = x.getFullYear();
  const month = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const round2 = (n) => Math.round(n * 100) / 100;

// Date inputs only accept sensible years — a half-typed year otherwise becomes "0001".
const MIN_DATE = "2000-01-01";
const MAX_DATE = "2100-12-31";
/** The date as a Date, or null when it's missing or nonsense (e.g. year 1). */
const realDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) || d.getFullYear() < 2000 || d.getFullYear() > 2100 ? null : d;
};
const fmtINR = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

/**
 * Tax split of a payment from the entered amount — the same maths as the
 * server (backend/utils/paymentTaxes.js):
 *   GST excluded → GST = amount × g% added on top; included → already inside
 *   TDS = taxable × t%; excluded → added on top; included → deducted
 * Counted toward the contract: the GST part only when the contract's own
 * value includes GST; TDS always counts as received.
 */
function splitPayment(entered, gst, tds, contractHasGst) {
  const a = Number(entered) || 0;
  const g = gst.on ? Number(gst.percent) || 0 : 0;
  const t = tds.on ? Number(tds.percent) || 0 : 0;
  const gstAmount = g > 0 ? round2(gst.mode === "included" ? (a * g) / (100 + g) : (a * g) / 100) : 0;
  const taxable = g > 0 && gst.mode === "included" ? round2(a - gstAmount) : a;
  const invoice = round2(taxable + gstAmount);
  const tdsAmount = t > 0 ? round2((taxable * t) / 100) : 0;
  const settled = t > 0 && tds.mode === "excluded" ? invoice + tdsAmount : invoice;
  const bank = t > 0 && tds.mode === "included" ? invoice - tdsAmount : invoice;
  const counted = round2(settled - (contractHasGst ? 0 : gstAmount));
  return { entered: a, gstPercent: g, tdsPercent: t, taxable, gst: gstAmount, tds: tdsAmount, counted, bank: round2(bank) };
}

/** What reached the bank for a saved payment (older records didn't store it). */
const bankOf = (p) => p.bankAmount ?? round2((p.amount || 0) - (p.tdsAmount || 0));

const MODES = [
  { id: "excluded", label: "Excluded" },
  { id: "included", label: "Included" },
];

function TaxToggle({ id, label, on, onToggle, percent, onPercent, mode, onMode, modeHelp, amountLabel }) {
  return (
    <div className={`tax-toggle ${on ? "is-on" : ""}`} data-tax={id}>
      <div className="tax-toggle-head">
        <label htmlFor={id}>{label}</label>
        <button
          id={id}
          type="button"
          role="switch"
          aria-checked={on}
          aria-label={`${label} ${on ? "on" : "off"}`}
          className="tax-switch"
          onClick={() => onToggle(!on)}
        >
          <span />
        </button>
      </div>
      {on && (
        <>
          <div className="tax-toggle-body">
            <div className="tax-percent">
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={percent}
                onChange={(e) => onPercent(e.target.value)}
                aria-label={`${label} percent`}
                required
              />
              <span>%</span>
            </div>
            <div className="tax-mode" role="radiogroup" aria-label={`${label} included or excluded`}>
              {MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  role="radio"
                  aria-checked={mode === m.id}
                  title={modeHelp[m.id]}
                  className={mode === m.id ? "is-active" : ""}
                  onClick={() => onMode(m.id)}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <div className="tax-amount">{amountLabel}</div>
        </>
      )}
    </div>
  );
}

const PaymentManager = ({ contract, onUpdated }) => {
  const [form, setForm] = useState({
    amount: "",
    paymentDate: toLocalDateInput(new Date()),
    method: "UPI",
    notes: "",
    // Prefill only an upcoming due date — a passed (or broken) one has to be re-picked.
    nextDueDate: (() => {
      const d = realDate(contract?.nextDueDate);
      const key = d ? toLocalDateInput(d) : "";
      return key && key >= toLocalDateInput(new Date()) ? key : "";
    })(),
    // Start from the contract's own GST / TDS settings.
    // "excluded" = the tax is added on top of the amount; "included" = it's already inside.
    gstEnabled: !!contract?.gstEnabled,
    gstPercent: String(contract?.gstPercent || 18),
    gstMode: "excluded",
    tdsEnabled: !!contract?.tdsEnabled,
    tdsPercent: String(contract?.tdsPercent || 2),
    tdsMode: "excluded",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const payload = { ...form };
      // A payment that settles the contract has no next due date (the server clears it too).
      if (!payload.nextDueDate || settlesDue) delete payload.nextDueDate;
      if (!payload.gstEnabled) { delete payload.gstPercent; delete payload.gstMode; }
      if (!payload.tdsEnabled) { delete payload.tdsPercent; delete payload.tdsMode; }
      const response = await addPayment(contract._id, payload);
      onUpdated(response.data.contract);
      setForm((prev) => ({ ...prev, amount: "", notes: "" }));
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add payment");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (paymentId, amount) => {
    if (!window.confirm(`Delete this ₹${Number(amount).toLocaleString("en-IN")} payment? This cannot be undone.`)) return;
    setDeletingId(paymentId);
    setError("");
    try {
      const response = await deletePayment(contract._id, paymentId);
      onUpdated(response.data.contract);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete payment");
    } finally {
      setDeletingId(null);
    }
  };

  const projectAmount = contract?.projectAmount || 0;
  const receivedAmount = round2(contract?.receivedAmount || 0);
  const dueAmount = contract?.dueAmount ?? projectAmount;
  const nextDue = realDate(contract?.nextDueDate);
  const isOverdue = Boolean(nextDue && dueAmount > 0 && nextDue < new Date());
  const contractHasGst = !!contract?.gstEnabled;
  const split = splitPayment(
    form.amount,
    { on: form.gstEnabled, percent: form.gstPercent, mode: form.gstMode },
    { on: form.tdsEnabled, percent: form.tdsPercent, mode: form.tdsMode },
    contractHasGst,
  );
  const hasAmount = split.entered > 0;
  // What's still due once this payment is added.
  const dueBefore = Math.max(0, round2(dueAmount));
  const dueAfter = round2(dueBefore - (hasAmount ? split.counted : 0));
  const settlesDue = dueBefore <= 0 || (hasAmount && dueAfter <= 0);
  const gstOn = form.gstEnabled && split.gstPercent > 0;
  const tdsOn = form.tdsEnabled && split.tdsPercent > 0;
  const setField = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));
  const payments = contract?.payments || [];
  const paymentsWithTax = payments.some((p) => p.gstAmount || p.tdsAmount);
  const gstCollected = round2(payments.reduce((sum, p) => sum + (p.gstAmount || 0), 0));
  const inBank = round2(payments.reduce((sum, p) => sum + bankOf(p), 0));
  const overpaid = round2(-dueAmount);

  return (
    <div className="payment-manager">
      <div className="payment-summary-card">
        <div className="summary-item">
          <span className="summary-label">Total Payment</span>
          <span className="summary-value">₹{projectAmount.toLocaleString("en-IN")}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Received Payment</span>
          <span className="summary-value" style={{ color: "#22c55e" }}>{fmtINR(receivedAmount)}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Due Payment</span>
          <span className="summary-value" style={{ color: overpaid > 0 ? "#16a34a" : "#f59e0b" }}>{fmtINR(Math.max(0, dueAmount))}</span>
          {overpaid > 0 && <span className="summary-sub">{fmtINR(overpaid)} received extra</span>}
        </div>
        <div className="summary-item">
          <span className="summary-label">Due Date</span>
          <span className="summary-value" style={dueBefore <= 0 ? { color: "#16a34a" } : undefined}>
            {dueBefore <= 0 ? "No dues" : nextDue ? nextDue.toLocaleDateString("en-IN") : "N/A"}
          </span>
        </div>
        {contract?.gstEnabled && (
          <div className="summary-item">
            <span className="summary-label">GST ({contract.gstPercent}%)</span>
            <span className="summary-value">₹{Number(contract.gstAmount || 0).toLocaleString("en-IN")}</span>
          </div>
        )}
        {contract?.tdsEnabled && (
          <div className="summary-item">
            <span className="summary-label">TDS ({contract.tdsPercent}%) — records only</span>
            <span className="summary-value">₹{Number(contract.tdsAmount || 0).toLocaleString("en-IN")}</span>
          </div>
        )}
        {paymentsWithTax && (
          <div className="summary-item" data-summary="bank">
            <span className="summary-label">Received in bank</span>
            <span className="summary-value">{fmtINR(inBank)}</span>
          </div>
        )}
        {gstCollected > 0 && (
          <div className="summary-item" data-summary="gst-collected">
            <span className="summary-label">GST collected</span>
            <span className="summary-value">{fmtINR(gstCollected)}</span>
            {!contractHasGst && <span className="summary-sub">not counted — contract value is without GST</span>}
          </div>
        )}
        {isOverdue && <span className="overdue-badge">Payment Overdue</span>}
      </div>

      <form className="add-payment-form" onSubmit={handleSubmit}>
        <h4>Update Received Payment</h4>
        {error && <div className="error-message">{error}</div>}
        <div className="form-row">
          <div className="form-field">
            <label>Amount</label>
            <input
              type="number"
              name="amount"
              placeholder="e.g. 10000"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-field">
            <label>Payment Date</label>
            <input
              type="date"
              name="paymentDate"
              min={MIN_DATE}
              max={MAX_DATE}
              value={form.paymentDate}
              onChange={handleChange}
            />
          </div>
          <div className="form-field">
            <label>Payment Type</label>
            <select name="method" value={form.method} onChange={handleChange}>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="form-row tax-row">
          <TaxToggle
            id="payment-gst"
            label="GST"
            on={form.gstEnabled}
            onToggle={(v) => setField("gstEnabled", v)}
            percent={form.gstPercent}
            onPercent={(v) => setField("gstPercent", v)}
            mode={form.gstMode}
            onMode={(v) => setField("gstMode", v)}
            modeHelp={{ excluded: "The amount is before GST — GST is added on top", included: "The amount already includes GST" }}
            amountLabel={!hasAmount ? "Enter the amount to see the GST"
              : form.gstMode === "included" ? `${fmtINR(split.gst)} GST is inside ${fmtINR(split.entered)}`
                : `+ ${fmtINR(split.gst)} GST added on top`}
          />
          <TaxToggle
            id="payment-tds"
            label="TDS"
            on={form.tdsEnabled}
            onToggle={(v) => setField("tdsEnabled", v)}
            percent={form.tdsPercent}
            onPercent={(v) => setField("tdsPercent", v)}
            mode={form.tdsMode}
            onMode={(v) => setField("tdsMode", v)}
            modeHelp={{ excluded: "The amount is after TDS — TDS is added on top", included: "The amount includes TDS — it's deducted from it" }}
            amountLabel={!hasAmount ? "Enter the amount to see the TDS"
              : form.tdsMode === "included" ? `− ${fmtINR(split.tds)} TDS deducted (on ${fmtINR(split.taxable)})`
                : `+ ${fmtINR(split.tds)} TDS added on top (on ${fmtINR(split.taxable)})`}
          />
        </div>
        {hasAmount && (gstOn || tdsOn) && (
          <div className="tax-breakup" data-tax-breakup>
            <div><span>Taxable value</span><b>{fmtINR(split.taxable)}</b></div>
            {gstOn && (
              <div><span>GST {split.gstPercent}% {form.gstMode === "included" ? "(included)" : "(added)"}</span><b>{form.gstMode === "included" ? "" : "+ "}{fmtINR(split.gst)}</b></div>
            )}
            {tdsOn && (
              <div><span>TDS {split.tdsPercent}% {form.tdsMode === "included" ? "(deducted)" : "(added)"}</span><b>{form.tdsMode === "included" ? "− " : "+ "}{fmtINR(split.tds)}</b></div>
            )}
            {(tdsOn || (gstOn && form.gstMode === "excluded")) && <div><span>Received in bank</span><b>{fmtINR(split.bank)}</b></div>}
            <div className="tax-breakup-total"><span>Counted toward contract</span><b>{fmtINR(split.counted)}</b></div>
            {gstOn && !contractHasGst && (
              <p className="tax-breakup-note">This contract&apos;s value is without GST, so only the taxable value counts toward it — the {fmtINR(split.gst)} GST is recorded separately.</p>
            )}
          </div>
        )}
        <div className="form-row">
          <div className="form-field" style={{ flex: 2 }}>
            <label>Notes (optional)</label>
            <input
              type="text"
              name="notes"
              placeholder="e.g. Advance payment"
              value={form.notes}
              onChange={handleChange}
            />
          </div>
          {settlesDue ? (
            <div className="form-field">
              <label>Next Due Date</label>
              <div className="due-cleared" data-due-cleared>
                {dueBefore <= 0
                  ? "No dues left on this contract — no next due date needed."
                  : dueAfter < 0
                    ? `This payment clears the due (${fmtINR(-dueAfter)} more than what was due) — no next due date needed.`
                    : "This payment clears the due — no next due date needed."}
              </div>
            </div>
          ) : (
            <div className="form-field">
              <label>Next Due Date (optional)</label>
              <input
                type="date"
                name="nextDueDate"
                min={form.paymentDate || MIN_DATE}
                max={MAX_DATE}
                value={form.nextDueDate}
                onChange={handleChange}
              />
              {hasAmount && <span className="due-left" data-due-left>{fmtINR(dueAfter)} will still be due</span>}
            </div>
          )}
        </div>
        <button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Add Payment"}
        </button>
        <p className="form-hint">
          Excluded adds the tax on top of the amount; Included means it&apos;s already inside the amount. TDS counts as received. GST counts toward the due only when the contract&apos;s value includes GST. Due payment = Total Payment − Received Payment.
        </p>
      </form>

      <div className="payment-history">
        <h4>Payment History</h4>
        {!contract?.payments?.length ? (
          <div className="empty-state">No payments recorded yet.</div>
        ) : (
          <div className="payment-history-scroll">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>{paymentsWithTax ? "Received" : "Amount"}</th>
                {paymentsWithTax && <th>GST</th>}
                {paymentsWithTax && <th>TDS</th>}
                {paymentsWithTax && <th>Counted</th>}
                <th>Method</th>
                <th>Notes</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {contract.payments.map((payment) => (
                <tr key={payment._id}>
                  <td>{new Date(payment.paymentDate).toLocaleDateString("en-IN")}</td>
                  <td>
                    {fmtINR(paymentsWithTax ? bankOf(payment) : payment.amount)}
                  </td>
                  {paymentsWithTax && (
                    <td>{payment.gstAmount > 0 ? <>{fmtINR(payment.gstAmount)}<span className="pay-sub">{payment.gstPercent}%{payment.gstMode ? ` · ${payment.gstMode === "included" ? "included" : "added"}` : ""}</span></> : "—"}</td>
                  )}
                  {paymentsWithTax && (
                    <td>{payment.tdsAmount > 0 ? <>{fmtINR(payment.tdsAmount)}<span className="pay-sub">{payment.tdsPercent}%{payment.tdsMode ? ` · ${payment.tdsMode === "included" ? "deducted" : "added"}` : ""}</span></> : "—"}</td>
                  )}
                  {paymentsWithTax && (
                    <td className="pay-counted">{fmtINR(payment.amount)}</td>
                  )}
                  <td>{payment.method}</td>
                  <td>{payment.notes || "—"}</td>
                  <td>
                    <button
                      type="button"
                      title="Delete payment"
                      disabled={deletingId === payment._id}
                      onClick={() => handleDelete(payment._id, payment.amount)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "none",
                        border: "none",
                        color: "#dc2626",
                        cursor: deletingId === payment._id ? "not-allowed" : "pointer",
                        opacity: deletingId === payment._id ? 0.5 : 1,
                        padding: 4,
                      }}
                    >
                      <Trash2 size={14} strokeWidth={2.1} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentManager;
