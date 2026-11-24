import React, { useEffect, useRef, useState } from "react";
import { Trash2, Mail, Ban, Undo2, MoreHorizontal } from "lucide-react";
import { addPayment, deletePayment, writeOffBadDebt, undoBadDebt } from "../services/clientApi";
import "./PaymentManager.css";
import PaymentReminderDialog from "./PaymentReminderDialog";

const PAYMENT_METHODS = ["NEFT", "RTGS", "Bank Draft", "UPI", "Cash", "Cheque", "Card Swap", "P Account", "Other"];

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
 * value includes GST; TDS always counts as received. With GST off on a
 * contract that has GST, the payment was received without GST (e.g. cash):
 * it comes off the amount before GST, so the GST on it isn't charged and it
 * counts as amount + GST% (₹6,000 cash on ₹1,01,000 + 18% → ₹7,080 counted).
 */
function splitPayment(entered, gst, tds, contractHasGst, contractGstPercent) {
  const a = Number(entered) || 0;
  const g = gst.on ? Number(gst.percent) || 0 : 0;
  const t = tds.on ? Number(tds.percent) || 0 : 0;
  const gstAmount = g > 0 ? round2(gst.mode === "included" ? (a * g) / (100 + g) : (a * g) / 100) : 0;
  const taxable = g > 0 && gst.mode === "included" ? round2(a - gstAmount) : a;
  const invoice = round2(taxable + gstAmount);
  const tdsAmount = t > 0 ? round2((taxable * t) / 100) : 0;
  const settled = t > 0 && tds.mode === "excluded" ? invoice + tdsAmount : invoice;
  const bank = t > 0 && tds.mode === "included" ? invoice - tdsAmount : invoice;
  const contractGst = contractHasGst ? Number(contractGstPercent) || 0 : 0;
  const gstNotCharged = !gst.on && contractGst > 0 ? round2((settled * contractGst) / 100) : 0;
  const counted = round2(settled - (contractHasGst ? 0 : gstAmount) + gstNotCharged);
  return { entered: a, gstPercent: g, tdsPercent: t, taxable, gst: gstAmount, tds: tdsAmount, gstNotCharged, counted, bank: round2(bank) };
}

/** What reached the bank for a saved payment (older records didn't store it). */
const bankOf = (p) => p.bankAmount ?? round2((p.amount || 0) - (p.tdsAmount || 0));

const MODES = [
  { id: "excluded", label: "Excluded" },
  { id: "included", label: "Included" },
];

function TaxToggle({ id, label, on, onToggle, percent, onPercent, mode, onMode, modeHelp, amountLabel, offNote }) {
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
      {!on && offNote && <div className="tax-amount tax-off-note">{offNote}</div>}
    </div>
  );
}

/** "⋯" menu on the Due box — for rarely used actions (bad debt). */
function DueMenu({ onBadDebt }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", onKey); };
  }, [open]);
  return (
    <div className="pay-menu" ref={ref}>
      <button type="button" className="pay-menu-btn" aria-label="More actions" aria-haspopup="menu" aria-expanded={open} title="More actions" onClick={() => setOpen((o) => !o)} data-due-menu>
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <div className="pay-menu-list" role="menu">
          <button type="button" role="menuitem" onClick={() => { setOpen(false); onBadDebt(); }} data-baddebt-open>
            <Ban size={14} />
            <span>
              Mark as bad debt
              <small>Client won&apos;t pay — write off what&apos;s due</small>
            </span>
          </button>
        </div>
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
  const [reminding, setReminding] = useState(false);
  // Bad debt: null = closed, otherwise the reason being typed.
  const [badDebtReason, setBadDebtReason] = useState(null);
  const [badDebtSaving, setBadDebtSaving] = useState(false);
  const canWriteOff = ["admin", "salesmanager"].includes(localStorage.getItem("role"));
  const contractClientId = contract?.clientId?._id || contract?.clientId;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      // Cash is received without GST; switching back to another method
      // restores the contract's own GST setting.
      if (name === "method" && value === "Cash") next.gstEnabled = false;
      else if (name === "method" && prev.method === "Cash") next.gstEnabled = !!contract?.gstEnabled;
      return next;
    });
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
      // GST off on a contract with GST = received without GST (the GST on it isn't charged).
      if (!payload.gstEnabled && contractGst > 0) payload.withoutGst = true;
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

  const handleWriteOff = async () => {
    setBadDebtSaving(true);
    setError("");
    try {
      const { data } = await writeOffBadDebt(contract._id, { reason: badDebtReason.trim() });
      setBadDebtReason(null);
      onUpdated(data.contract);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't write off the bad debt");
      setBadDebtReason(null);
    } finally {
      setBadDebtSaving(false);
    }
  };

  const handleUndoBadDebt = async () => {
    if (!window.confirm(`Undo the bad debt? ${fmtINR(contract.badDebt.amount)} will be due again.`)) return;
    setBadDebtSaving(true);
    setError("");
    try {
      const { data } = await undoBadDebt(contract._id);
      onUpdated(data.contract);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't undo the bad debt");
    } finally {
      setBadDebtSaving(false);
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
  const contractGst = contractHasGst ? Number(contract?.gstPercent) || 0 : 0;
  const split = splitPayment(
    form.amount,
    { on: form.gstEnabled, percent: form.gstPercent, mode: form.gstMode },
    { on: form.tdsEnabled, percent: form.tdsPercent, mode: form.tdsMode },
    contractHasGst,
    contractGst,
  );
  const hasAmount = split.entered > 0;
  // What's still due once this payment is added.
  const dueBefore = Math.max(0, round2(dueAmount));
  const dueAfter = round2(dueBefore - (hasAmount ? split.counted : 0));
  const settlesDue = dueBefore <= 0 || (hasAmount && dueAfter <= 0);
  const gstOn = form.gstEnabled && split.gstPercent > 0;
  const tdsOn = form.tdsEnabled && split.tdsPercent > 0;
  const noGstOn = split.gstNotCharged > 0;
  // On a contract with GST, what's left is "₹95,000 + GST".
  const beforeGst = (n) => round2(n / (1 + contractGst / 100));
  const dueWithGst = contractGst > 0 && dueAmount > 0;
  const setField = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));
  const payments = contract?.payments || [];
  const paymentsWithTax = payments.some((p) => p.gstAmount || p.tdsAmount || p.gstNotCharged);
  const gstCollected = round2(payments.reduce((sum, p) => sum + (p.gstAmount || 0), 0));
  // GST never charged on payments received without GST — it came off the due
  // without being received (receivedAmount leaves it out), so it's shown apart.
  const gstNotCharged = round2(payments.reduce((sum, p) => sum + (p.gstNotCharged || 0), 0));
  const inBank = round2(payments.reduce((sum, p) => sum + bankOf(p), 0));
  const overpaid = round2(-dueAmount);
  // Settled share of the contract: what was received, plus the GST not charged on cash.
  const pctOf = (v) => (projectAmount > 0 ? Math.min(100, Math.max(0, (v / projectAmount) * 100)) : 0);
  const receivedPct = pctOf(receivedAmount);
  const waivedPct = Math.min(pctOf(gstNotCharged), 100 - receivedPct);
  // Written off as bad debt: off the due, but never received.
  const badDebt = contract?.badDebt?.amount > 0 ? contract.badDebt : null;
  const badDebtPct = badDebt ? Math.max(0, 100 - receivedPct - waivedPct) : 0;
  const settledPct = dueBefore <= 0 ? 100 : Math.min(99, Math.floor(receivedPct + waivedPct));
  // Smaller tax figures under the main three — only the ones that apply.
  const details = [
    contractGst > 0 && { key: "gst", label: `GST ${contract.gstPercent}%`, value: fmtINR(contract.gstAmount), note: "on the contract" },
    gstCollected > 0 && {
      key: "gst-collected", label: "GST collected", value: fmtINR(gstCollected),
      note: contractHasGst ? "inside the payments" : "not counted — contract is without GST",
    },
    gstNotCharged > 0 && { key: "gst-not-charged", label: "GST not charged", value: fmtINR(gstNotCharged), note: "on cash / without-GST payments" },
    badDebt && { key: "bad-debt", label: "Bad debt", value: fmtINR(badDebt.amount), note: "written off — not received, not an expense" },
    contract?.tdsEnabled && { key: "tds", label: `TDS ${contract.tdsPercent}%`, value: fmtINR(contract.tdsAmount), note: "records only" },
    // Only when it differs from "Received" (TDS deducted, or GST on a contract without GST).
    paymentsWithTax && Math.abs(inBank - receivedAmount) >= 0.01 && {
      key: "bank", label: "In bank / cash", value: fmtINR(inBank), note: "money that actually came in",
      title: "Received counts TDS as paid and leaves out GST on a contract without GST; this is the money that actually came in.",
    },
  ].filter(Boolean);

  return (
    <div className="payment-manager">
      <div className="pay-summary" data-summary-card>
        <div className="pay-summary-main">
          <div className="pay-stat">
            <span className="pay-stat-label">Contract value</span>
            {/* On a contract with GST: the value before GST, with the GST-inclusive total below. */}
            <span className="pay-stat-value" data-summary="contract-value">
              {fmtINR(contractGst > 0 ? round2(projectAmount - (contract?.gstAmount || 0)) : projectAmount)}
            </span>
            <span className="pay-stat-sub" data-summary="contract-with-gst">
              {contractGst > 0 ? `${fmtINR(projectAmount)} with ${contractGst}% GST` : "Without GST"}
            </span>
          </div>
          <div className="pay-stat pay-stat--received">
            <span className="pay-stat-label">Received</span>
            <span className="pay-stat-value" data-summary="received">{fmtINR(receivedAmount)}</span>
            <span className="pay-stat-sub">
              {payments.length ? `${payments.length} payment${payments.length === 1 ? "" : "s"}` : "No payments yet"}
            </span>
          </div>
          <div className={`pay-stat pay-stat--due ${badDebt ? "is-baddebt" : dueBefore <= 0 ? "is-clear" : isOverdue ? "is-overdue" : ""}`}>
            <div className="pay-stat-head">
              <span className="pay-stat-label">Due payment</span>
              {/* Rare actions live in a small "⋯" menu, not as a button on every contract. */}
              {canWriteOff && dueBefore > 0 && !badDebt && badDebtReason === null && (
                <DueMenu onBadDebt={() => setBadDebtReason("")} />
              )}
            </div>
            {/* On a contract with GST: the due before GST, with the GST-inclusive figure below. */}
            <span className="pay-stat-value" data-summary="due">
              {fmtINR(dueBefore <= 0 ? 0 : dueWithGst ? beforeGst(dueAmount) : dueAmount)}
            </span>
            {dueWithGst && <span className="pay-stat-sub" data-summary="due-with-gst">{fmtINR(dueAmount)} with GST</span>}
            {overpaid > 0 && <span className="pay-stat-sub">{fmtINR(overpaid)} received extra</span>}
            {badDebt && <span className="pay-stat-sub" data-summary="bad-debt-sub">{fmtINR(badDebt.amount)} written off as bad debt</span>}
            {!badDebt && dueBefore <= 0 && overpaid <= 0 && <span className="pay-stat-sub">Fully paid</span>}
            {dueBefore > 0 && (
              <span className="pay-due-date" data-summary="due-date">
                {nextDue ? `Due on ${nextDue.toLocaleDateString("en-IN")}` : "No due date set"}
                {isOverdue && <span className="pay-overdue-chip">Overdue</span>}
              </span>
            )}
            {dueBefore > 0 && contractClientId && (
              <div className="pay-due-actions">
                <button type="button" className="pay-remind-btn" onClick={() => setReminding(true)} data-pay-remind>
                  <Mail size={13} /> Email payment reminder
                </button>
              </div>
            )}
          </div>
        </div>

        {projectAmount > 0 && (
          <div className="pay-progress" title={`${settledPct}% of the contract settled`}>
            <div className="pay-progress-track">
              <span className="pay-progress-fill" style={{ width: `${receivedPct}%` }} />
              {waivedPct > 0 && <span className="pay-progress-fill is-waived" style={{ width: `${waivedPct}%` }} />}
              {badDebtPct > 0 && <span className="pay-progress-fill is-baddebt" style={{ width: `${badDebtPct}%` }} />}
            </div>
            <span className="pay-progress-text">{badDebt ? `${Math.floor(receivedPct + waivedPct)}% received · rest bad debt` : `${settledPct}% settled`}</span>
          </div>
        )}

        {details.length > 0 && (
          <div className="pay-summary-details">
            {details.map((d) => (
              <div key={d.key} className="pay-detail" data-summary={d.key} title={d.title}>
                <span className="pay-detail-label">{d.label}</span>
                <span className="pay-detail-value">{d.value}</span>
                {d.note && <span className="pay-detail-note">{d.note}</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {badDebtReason !== null && !badDebt && (
        <div className="baddebt-panel" data-baddebt-panel>
          <div className="baddebt-panel-head">
            <Ban size={16} />
            <div>
              <strong>Write off {fmtINR(dueAmount)} as bad debt?</strong>
              <p>Use this when the client won&apos;t pay. The amount stops showing as due, upcoming or overdue. It isn&apos;t counted as received or as an expense, and you can undo it later.</p>
            </div>
          </div>
          <textarea
            rows={2}
            maxLength={1000}
            value={badDebtReason}
            onChange={(e) => setBadDebtReason(e.target.value)}
            placeholder="Reason — e.g. Client closed the business, not reachable since March"
            data-baddebt-reason
            autoFocus
          />
          <div className="baddebt-panel-actions">
            <button type="button" className="pay-remind-btn" onClick={() => setBadDebtReason(null)} disabled={badDebtSaving}>Cancel</button>
            <button type="button" className="baddebt-confirm" onClick={handleWriteOff} disabled={badDebtSaving || !badDebtReason.trim()} data-baddebt-confirm>
              {badDebtSaving ? "Writing off…" : `Write off ${fmtINR(dueAmount)}`}
            </button>
          </div>
        </div>
      )}

      {badDebt && (
        <div className="baddebt-banner" data-baddebt-banner>
          <Ban size={16} />
          <div>
            <strong>{fmtINR(badDebt.amount)} written off as bad debt</strong>
            <p>
              {badDebt.writtenOffAt ? new Date(badDebt.writtenOffAt).toLocaleDateString("en-IN") : ""}
              {badDebt.byName ? ` · by ${badDebt.byName}` : ""}
              {badDebt.reason ? ` — ${badDebt.reason}` : ""}
            </p>
            <p>To record a payment on this contract, undo the bad debt first.</p>
          </div>
          {canWriteOff && (
            <button type="button" className="pay-remind-btn" onClick={handleUndoBadDebt} disabled={badDebtSaving} data-baddebt-undo>
              <Undo2 size={13} /> {badDebtSaving ? "Undoing…" : "Undo bad debt"}
            </button>
          )}
        </div>
      )}

      {badDebt && error && <div className="error-message">{error}</div>}

      {!badDebt && (
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
            offNote={contractGst > 0 ? `Received without GST${form.method === "Cash" ? " (cash)" : ""} — no GST is charged on this part` : undefined}
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
        {hasAmount && (gstOn || tdsOn || noGstOn) && (
          <div className="tax-breakup" data-tax-breakup>
            <div><span>{noGstOn ? "Received without GST" : "Taxable value"}</span><b>{fmtINR(split.taxable)}</b></div>
            {gstOn && (
              <div><span>GST {split.gstPercent}% {form.gstMode === "included" ? "(included)" : "(added)"}</span><b>{form.gstMode === "included" ? "" : "+ "}{fmtINR(split.gst)}</b></div>
            )}
            {tdsOn && (
              <div><span>TDS {split.tdsPercent}% {form.tdsMode === "included" ? "(deducted)" : "(added)"}</span><b>{form.tdsMode === "included" ? "− " : "+ "}{fmtINR(split.tds)}</b></div>
            )}
            {(tdsOn || (gstOn && form.gstMode === "excluded")) && <div><span>{form.method === "Cash" ? "Received in cash" : "Received in bank"}</span><b>{fmtINR(split.bank)}</b></div>}
            {noGstOn && (
              <div data-gst-not-charged><span>GST {contractGst}% not charged on it</span><b>+ {fmtINR(split.gstNotCharged)}</b></div>
            )}
            <div className="tax-breakup-total"><span>Counted toward contract</span><b>{fmtINR(split.counted)}</b></div>
            {gstOn && !contractHasGst && (
              <p className="tax-breakup-note">This contract&apos;s value is without GST, so only the taxable value counts toward it — the {fmtINR(split.gst)} GST is recorded separately.</p>
            )}
            {noGstOn && (
              <p className="tax-breakup-note">This contract&apos;s value includes GST. A payment without GST comes off the amount before GST, so the {fmtINR(split.gstNotCharged)} GST on it is never charged — {fmtINR(split.counted)} comes off the due.</p>
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
              {hasAmount && (
                <span className="due-left" data-due-left>
                  {fmtINR(dueAfter)} will still be due{contractGst > 0 ? ` (${fmtINR(beforeGst(dueAfter))} + GST)` : ""}
                </span>
              )}
            </div>
          )}
        </div>
        <button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Add Payment"}
        </button>
        <p className="form-hint">
          Excluded adds the tax on top of the amount; Included means it&apos;s already inside the amount. TDS counts as received. GST counts toward the due only when the contract&apos;s value includes GST. On a contract with GST, keep GST off for a payment received without GST (cash) — it comes off the amount before GST. Due payment = Total Payment − Received Payment − GST not charged.
        </p>
      </form>
      )}

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
                    <td>
                      {payment.gstAmount > 0 ? <>{fmtINR(payment.gstAmount)}<span className="pay-sub">{payment.gstPercent}%{payment.gstMode ? ` · ${payment.gstMode === "included" ? "included" : "added"}` : ""}</span></>
                        : payment.gstNotCharged > 0 ? <>Without GST<span className="pay-sub">{fmtINR(payment.gstNotCharged)} not charged</span></>
                          : "—"}
                    </td>
                  )}
                  {paymentsWithTax && (
                    <td>{payment.tdsAmount > 0 ? <>{fmtINR(payment.tdsAmount)}<span className="pay-sub">{payment.tdsPercent}%{payment.tdsMode ? ` · ${payment.tdsMode === "included" ? "deducted" : "added"}` : ""}</span></> : "—"}</td>
                  )}
                  {paymentsWithTax && (
                    // A cash payment without GST shows the cash itself — the GST not charged on it is shown under GST.
                    <td className="pay-counted">{fmtINR(round2((payment.amount || 0) - (payment.gstNotCharged || 0)))}</td>
                  )}
                  <td>{payment.method}</td>
                  <td>{payment.notes || "—"}</td>
                  <td>
                    <button
                      type="button"
                      title="Delete payment"
                      disabled={deletingId === payment._id}
                      onClick={() => handleDelete(payment._id, bankOf(payment))}
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
      {reminding && (
        <PaymentReminderDialog clientId={contractClientId} contract={contract} onClose={() => setReminding(false)} />
      )}
    </div>
  );
};

export default PaymentManager;
