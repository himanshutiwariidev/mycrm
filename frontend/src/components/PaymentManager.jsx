import React, { useState } from "react";
import { Trash2 } from "lucide-react";
import { addPayment, deletePayment } from "../services/clientApi";
import "./PaymentManager.css";

const PAYMENT_METHODS = ["UPI", "Cash", "Cheque", "Bank Transfer", "Card", "Other"];

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

const PaymentManager = ({ contract, onUpdated }) => {
  const [form, setForm] = useState({
    amount: "",
    paymentDate: toLocalDateInput(new Date()),
    method: "UPI",
    notes: "",
    nextDueDate: contract?.nextDueDate ? contract.nextDueDate.slice(0, 10) : "",
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
      if (!payload.nextDueDate) delete payload.nextDueDate;
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
  const receivedAmount = contract?.receivedAmount || 0;
  const dueAmount = contract?.dueAmount ?? projectAmount;
  const isOverdue = Boolean(
    contract?.nextDueDate && dueAmount > 0 && new Date(contract.nextDueDate) < new Date()
  );

  return (
    <div className="payment-manager">
      <div className="payment-summary-card">
        <div className="summary-item">
          <span className="summary-label">Total Payment</span>
          <span className="summary-value">₹{projectAmount.toLocaleString("en-IN")}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Received Payment</span>
          <span className="summary-value" style={{ color: "#22c55e" }}>₹{receivedAmount.toLocaleString("en-IN")}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Due Payment</span>
          <span className="summary-value" style={{ color: "#f59e0b" }}>₹{dueAmount.toLocaleString("en-IN")}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Due Date</span>
          <span className="summary-value">
            {contract?.nextDueDate ? new Date(contract.nextDueDate).toLocaleDateString("en-IN") : "N/A"}
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
        {isOverdue && <span className="overdue-badge">Payment Overdue</span>}
      </div>

      <form className="add-payment-form" onSubmit={handleSubmit}>
        <h4>Update Received Payment</h4>
        {error && <div className="error-message">{error}</div>}
        <div className="form-row">
          <div className="form-field">
            <label>Amount Received</label>
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
          <div className="form-field">
            <label>Next Due Date (optional)</label>
            <input
              type="date"
              name="nextDueDate"
              value={form.nextDueDate}
              onChange={handleChange}
            />
          </div>
        </div>
        <button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Add Payment"}
        </button>
        <p className="form-hint">Due payment is calculated automatically as Total Payment − Received Payment.</p>
      </form>

      <div className="payment-history">
        <h4>Payment History</h4>
        {!contract?.payments?.length ? (
          <div className="empty-state">No payments recorded yet.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Notes</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {contract.payments.map((payment) => (
                <tr key={payment._id}>
                  <td>{new Date(payment.paymentDate).toLocaleDateString("en-IN")}</td>
                  <td>₹{Number(payment.amount).toLocaleString("en-IN")}</td>
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
        )}
      </div>
    </div>
  );
};

export default PaymentManager;
