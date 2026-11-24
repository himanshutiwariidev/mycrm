import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Mail, Wallet, RefreshCw, FileBarChart2, Send, AlertTriangle, CheckCircle2 } from "lucide-react";
import API from "../services/api";
import { listClientReports } from "../services/clientReportApi";
import { getCategoryMeta } from "../features/contract-builder/config/serviceCategories";
import { monthLabel } from "../utils/taskPeriods";
import PaymentReminderDialog from "./PaymentReminderDialog";
import "./PaymentReminderDialog.css";
import "./EmailClientPanel.css";

const fmtINR = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "");
const toDateInput = (d) => {
  if (!d) return "";
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return "";
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};
const contractLabel = (c) => `${c.projectName}${c.contractNumber ? ` · ${c.contractNumber}` : ""}`;
const serviceLabel = (id) => getCategoryMeta(id)?.label || id;

const KINDS = [
  { id: "payment", label: "Payment reminder", Icon: Wallet },
  { id: "renewal", label: "Renewal reminder", Icon: RefreshCw },
  { id: "report", label: "Monthly report", Icon: FileBarChart2 },
];

/** Renewal reminder: pick a contract, check the date/amount, send. */
function RenewalForm({ contracts, onSent, disabled }) {
  // Soonest renewal first; contracts without an end date last.
  const sorted = useMemo(() => [...contracts].sort((a, b) => (a.validUntil ? new Date(a.validUntil) : Infinity) - (b.validUntil ? new Date(b.validUntil) : Infinity)), [contracts]);
  const [contractId, setContractId] = useState(sorted[0]?._id || "");
  const contract = sorted.find((c) => c._id === contractId);
  const [form, setForm] = useState({ renewalDate: "", amount: "", message: "" });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  // Prefill from the chosen contract (only when a different contract is picked,
  // not when the same one is refreshed after sending).
  useEffect(() => {
    setForm({ renewalDate: toDateInput(contract?.validUntil), amount: contract ? String(contract.projectAmount || "") : "", message: "" });
    setError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractId]);

  if (!sorted.length) return <p className="ecp-empty">No contracts yet — add one to send a renewal reminder.</p>;
  const last = contract?.renewalReminders?.[contract.renewalReminders.length - 1];
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const send = async () => {
    setSending(true);
    setError("");
    try {
      const { data } = await API.post(`/clients/contracts/${contractId}/renewal-reminder`, {
        renewalDate: form.renewalDate || undefined,
        amount: form.amount === "" ? undefined : Number(form.amount),
        message: form.message.trim() || undefined,
      });
      toast.success(data.message);
      setForm((f) => ({ ...f, message: "" }));
      onSent?.();
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't send the renewal reminder");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="ecp-form">
      <label className="prd-field">
        <span>Contract</span>
        <select value={contractId} onChange={(e) => setContractId(e.target.value)} data-renewal-contract>
          {sorted.map((c) => <option key={c._id} value={c._id}>{contractLabel(c)}{c.validUntil ? ` — ends ${fmtDate(c.validUntil)}` : ""}</option>)}
        </select>
        <small>{last ? `Last renewal reminder: ${fmtDate(last.sentAt)}${last.byName ? ` by ${last.byName}` : ""}` : "No renewal reminder sent for this contract yet"}</small>
      </label>
      <div className="prd-grid">
        <label className="prd-field">
          <span>Renewal date</span>
          <input type="date" min="2000-01-01" max="2100-12-31" value={form.renewalDate} onChange={set("renewalDate")} data-renewal-date />
        </label>
        <label className="prd-field">
          <span>Renewal amount</span>
          <div className="prd-money"><b>₹</b><input type="number" min="0" step="0.01" value={form.amount} onChange={set("amount")} data-renewal-amount /></div>
        </label>
      </div>
      <label className="prd-field">
        <span>Message (optional)</span>
        <textarea rows={2} maxLength={2000} value={form.message} onChange={set("message")} placeholder="e.g. Renew before the 10th and get the same pricing for another year." />
      </label>
      {error && <div className="prd-error" role="alert">{error}</div>}
      <div className="ecp-actions">
        <button type="button" className="prd-btn prd-btn-primary" onClick={send} disabled={sending || disabled || !contractId} data-renewal-send>
          <Send size={14} /> {sending ? "Sending…" : "Send renewal reminder"}
        </button>
      </div>
    </div>
  );
}

/** Monthly report: pick one of the client's reports, send it (file attached, or the link). */
function ReportForm({ clientId, onSent, disabled }) {
  const [reports, setReports] = useState(null);
  const [reportId, setReportId] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    listClientReports(clientId)
      .then(({ data }) => {
        if (!alive) return;
        const list = (data.reports || []).sort((a, b) => b.period.localeCompare(a.period) || new Date(b.createdAt) - new Date(a.createdAt));
        setReports(list);
        setReportId(list[0]?._id || "");
      })
      .catch(() => alive && setReports([]));
    return () => { alive = false; };
  }, [clientId]);

  if (reports === null) return <p className="ecp-empty">Loading reports…</p>;
  if (!reports.length) return <p className="ecp-empty">No monthly reports uploaded yet — add them in Monthly Reports first.</p>;
  const report = reports.find((r) => r._id === reportId);

  const send = async () => {
    setSending(true);
    setError("");
    try {
      const { data } = await API.post(`/client-reports/${reportId}/share`, { message: message.trim() || undefined });
      toast.success(data.message);
      setMessage("");
      onSent?.();
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't email the report");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="ecp-form">
      <label className="prd-field">
        <span>Report</span>
        <select value={reportId} onChange={(e) => setReportId(e.target.value)} data-report-select>
          {reports.map((r) => (
            <option key={r._id} value={r._id}>
              {serviceLabel(r.categoryId)} — {monthLabel(r.period, true)} · {r.kind === "link" ? "link" : r.originalname || "file"}
            </option>
          ))}
        </select>
        <small>{report?.kind === "link" ? "The email carries a button to open the link." : "The file is attached to the email."}</small>
      </label>
      <label className="prd-field">
        <span>Message (optional)</span>
        <textarea rows={2} maxLength={2000} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="e.g. Organic traffic is up 18% this month — highlights on page 2." />
      </label>
      {error && <div className="prd-error" role="alert">{error}</div>}
      <div className="ecp-actions">
        <button type="button" className="prd-btn prd-btn-primary" onClick={send} disabled={sending || disabled || !reportId} data-report-send>
          <Send size={14} /> {sending ? "Sending…" : "Email the report"}
        </button>
      </div>
    </div>
  );
}

/**
 * Client page → "Email client": payment reminders, renewal reminders and
 * monthly reports, all sent to the client's email from one place.
 */
export default function EmailClientPanel({ client, contracts, onSent }) {
  const [kind, setKind] = useState("payment");
  const [reminderFor, setReminderFor] = useState(null);
  const dueContracts = contracts.filter((c) => (c.dueAmount ?? 0) > 0);
  const [paymentContractId, setPaymentContractId] = useState(dueContracts[0]?._id || "");
  const noEmail = !client.email;

  return (
    <div className="ecp" data-email-panel>
      <div className={`prd-to${noEmail ? " is-missing" : ""}`}>
        <span>To</span>
        {noEmail
          ? <strong><AlertTriangle size={14} /> {client.clientName} has no email address — add it with Edit client first.</strong>
          : <strong className="ecp-to-line"><Mail size={13} /> {client.clientName} &lt;{client.email}&gt;</strong>}
      </div>

      <div className="prd-types ecp-kinds" role="tablist">
        {KINDS.map((k) => (
          <button key={k.id} type="button" role="tab" aria-selected={kind === k.id} className={kind === k.id ? "is-active" : ""} onClick={() => setKind(k.id)} data-email-kind={k.id}>
            <k.Icon size={13} />{k.label}
          </button>
        ))}
      </div>

      {kind === "payment" && (
        dueContracts.length ? (
          <div className="ecp-form">
            <label className="prd-field">
              <span>Contract with a balance due</span>
              <select value={paymentContractId} onChange={(e) => setPaymentContractId(e.target.value)} data-payment-contract>
                {dueContracts.map((c) => <option key={c._id} value={c._id}>{contractLabel(c)} — {fmtINR(c.dueAmount)} due</option>)}
              </select>
              <small>You&apos;ll see the amount, pay-by date and earlier reminders before sending.</small>
            </label>
            <div className="ecp-actions">
              <button type="button" className="prd-btn prd-btn-primary" disabled={noEmail || !paymentContractId} onClick={() => setReminderFor(dueContracts.find((c) => c._id === paymentContractId))} data-payment-open>
                <Send size={14} /> Write payment reminder
              </button>
            </div>
          </div>
        ) : (
          <p className="ecp-empty ecp-to-line"><CheckCircle2 size={14} color="#16a34a" /> Nothing is due on this client&apos;s contracts.</p>
        )
      )}
      {kind === "renewal" && <RenewalForm contracts={contracts} onSent={onSent} disabled={noEmail} />}
      {kind === "report" && <ReportForm clientId={client._id} onSent={onSent} disabled={noEmail} />}

      {reminderFor && (
        <PaymentReminderDialog clientId={client._id} contract={reminderFor} onClose={() => setReminderFor(null)} onSent={onSent} />
      )}
    </div>
  );
}
