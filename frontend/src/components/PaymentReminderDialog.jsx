import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Mail, Send, X, RotateCw, AlertTriangle, CheckCircle2 } from "lucide-react";
import { getClientById, createPaymentReminder, sendPaymentReminder } from "../services/clientApi";
import "./PaymentReminderDialog.css";

const TYPES = [
  { value: "first-reminder", label: "First reminder", hint: "Friendly — a payment is due" },
  { value: "second-reminder", label: "Second reminder", hint: "We haven't received it yet" },
  { value: "final-reminder", label: "Final reminder", hint: "Overdue — please clear it now" },
  { value: "custom", label: "Custom", hint: "Just your message" },
];
const TYPE_LABEL = Object.fromEntries(TYPES.map((t) => [t.value, t.label]));

const fmtINR = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "");
const toDateInput = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};
/** A real, upcoming-or-recent due date to prefill (a passed one is still the date it was due). */
const realDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) || d.getFullYear() < 2000 || d.getFullYear() > 2100 ? null : d;
};

/**
 * Email a payment reminder for a contract to the client. Prefilled from the
 * contract (what's still due, its due date); the type steps up with each
 * reminder already sent. Earlier reminders for the contract can be resent.
 */
export default function PaymentReminderDialog({ clientId, contract, onClose, onSent }) {
  const [client, setClient] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(() => {
    const due = realDate(contract?.nextDueDate);
    return {
      amountDue: contract?.dueAmount > 0 ? String(Math.round(contract.dueAmount * 100) / 100) : "",
      dueDate: due ? toDateInput(due) : "",
      reminderType: "first-reminder",
      customMessage: "",
    };
  });
  const [sending, setSending] = useState(false);
  const [resendingId, setResendingId] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    getClientById(clientId)
      .then(({ data }) => {
        if (!alive) return;
        setClient(data.client);
        const mine = (data.reminders || []).filter((r) => String(r.contractId || "") === String(contract?._id || ""));
        setHistory(mine);
        const sent = mine.filter((r) => r.sentAt).length;
        // Step the tone up with each reminder already sent for this contract.
        setForm((f) => ({ ...f, reminderType: sent >= 2 ? "final-reminder" : sent === 1 ? "second-reminder" : "first-reminder" }));
      })
      .catch(() => alive && setError("Couldn't load the client"))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [clientId, contract?._id]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const gstPercent = contract?.gstEnabled ? Number(contract.gstPercent) || 0 : 0;
  const amount = Number(form.amountDue) || 0;
  const noEmail = client && !client.email;

  const send = async () => {
    if (!(amount > 0)) { setError("Enter the amount due"); return; }
    if (form.reminderType === "custom" && !form.customMessage.trim()) { setError("Write the message for a custom reminder"); return; }
    setSending(true);
    setError("");
    try {
      const { data } = await createPaymentReminder({
        clientId,
        contractId: contract?._id,
        amountDue: amount,
        currency: contract?.currency || "INR",
        dueDate: form.dueDate || undefined,
        reminderType: form.reminderType,
        customMessage: form.customMessage.trim() || undefined,
      });
      if (data.emailError) {
        // Saved, but the email didn't go — keep the dialog open so it can be resent.
        setHistory((h) => [data.reminder, ...h]);
        setError(`Saved, but the email couldn't be sent: ${data.emailError}`);
        return;
      }
      toast.success(`Payment reminder emailed to ${client.email}`);
      onSent?.(data.reminder);
      onClose?.();
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't send the reminder");
    } finally {
      setSending(false);
    }
  };

  const resend = async (r) => {
    setResendingId(r._id);
    setError("");
    try {
      const { data } = await sendPaymentReminder(r._id);
      setHistory((h) => h.map((x) => (x._id === r._id ? data.reminder : x)));
      toast.success(`Reminder resent to ${client.email}`);
      onSent?.(data.reminder);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't resend the reminder");
    } finally {
      setResendingId(null);
    }
  };

  return (
    <div className="prd-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="prd" role="dialog" aria-modal="true" aria-label="Send payment reminder" data-reminder-dialog>
        <header className="prd-head">
          <span className="prd-icon"><Mail size={18} /></span>
          <div className="prd-titles">
            <h3>Send payment reminder</h3>
            <p>{contract ? `${contract.projectName}${contract.contractNumber ? ` · ${contract.contractNumber}` : ""}` : "Payment due"}</p>
          </div>
          <button type="button" className="prd-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </header>

        <div className="prd-body">
          <div className={`prd-to${noEmail ? " is-missing" : ""}`} data-reminder-to>
            <span>To</span>
            {loading ? <em>Loading…</em> : noEmail ? (
              <strong><AlertTriangle size={14} /> {client.clientName} has no email address — add it with Edit client first.</strong>
            ) : (
              <strong>{client?.clientName} &lt;{client?.email}&gt;</strong>
            )}
          </div>

          <div className="prd-grid">
            <label className="prd-field">
              <span>Amount due *</span>
              <div className="prd-money">
                <b>₹</b>
                <input type="number" min="0" step="0.01" value={form.amountDue} onChange={set("amountDue")} data-reminder-amount />
              </div>
              {gstPercent > 0 && amount > 0 && (
                <small>incl. {gstPercent}% GST · {fmtINR(Math.round((amount / (1 + gstPercent / 100)) * 100) / 100)} + GST</small>
              )}
            </label>
            <label className="prd-field">
              <span>Pay by</span>
              <input type="date" min="2000-01-01" max="2100-12-31" value={form.dueDate} onChange={set("dueDate")} />
              <small>{form.dueDate ? "" : "Left empty, the email says \"On demand\""}</small>
            </label>
          </div>

          <div className="prd-field">
            <span>Reminder</span>
            <div className="prd-types" role="radiogroup" aria-label="Reminder type">
              {TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  role="radio"
                  aria-checked={form.reminderType === t.value}
                  className={form.reminderType === t.value ? "is-active" : ""}
                  onClick={() => setForm((f) => ({ ...f, reminderType: t.value }))}
                  title={t.hint}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <small>{TYPES.find((t) => t.value === form.reminderType)?.hint}</small>
          </div>

          <label className="prd-field">
            <span>Message {form.reminderType === "custom" ? "*" : "(optional)"}</span>
            <textarea
              rows={3}
              maxLength={2000}
              value={form.customMessage}
              onChange={set("customMessage")}
              placeholder="e.g. Kindly transfer the balance to the account below and share the UTR."
            />
          </label>

          {history.length > 0 && (
            <div className="prd-history" data-reminder-history>
              <div className="prd-history-title">Sent earlier for this contract</div>
              {history.map((r) => (
                <div key={r._id} className="prd-history-row">
                  {r.sentAt ? <CheckCircle2 size={15} color="#16a34a" /> : <AlertTriangle size={15} color="#d97706" />}
                  <div className="prd-history-main">
                    <strong>{fmtINR(r.amountDue)}</strong> · {TYPE_LABEL[r.reminderType] || r.reminderType}
                    <div>
                      {r.sentAt ? `Sent ${fmtDate(r.sentAt)}${r.reminderCount > 1 ? ` · ${r.reminderCount} times` : ""}` : "Not sent — the email failed"}
                      {r.dueDate ? ` · pay by ${fmtDate(r.dueDate)}` : ""}
                    </div>
                  </div>
                  <button type="button" className="prd-btn prd-btn-ghost" onClick={() => resend(r)} disabled={!!resendingId || noEmail}>
                    <RotateCw size={13} className={resendingId === r._id ? "prd-spin" : undefined} /> {r.sentAt ? "Resend" : "Send"}
                  </button>
                </div>
              ))}
            </div>
          )}

          {error && <div className="prd-error" role="alert">{error}</div>}
        </div>

        <footer className="prd-foot">
          <button type="button" className="prd-btn prd-btn-ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="prd-btn prd-btn-primary" onClick={send} disabled={sending || loading || noEmail} data-reminder-send>
            <Send size={14} /> {sending ? "Sending…" : "Send email"}
          </button>
        </footer>
      </div>
    </div>
  );
}
