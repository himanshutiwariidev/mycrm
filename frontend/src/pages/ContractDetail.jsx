import React, { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { getContractById } from "../services/clientApi";
import DeliverablesTracker from "../components/DeliverablesTracker";
import PaymentManager from "../components/PaymentManager";
import { getCategoryMeta } from "../features/contract-builder/config/serviceCategories";
import { packageTypeLabel } from "../features/contract-builder/config/packageTypes";
import "./ContractDetail.css";

const fmtDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};
const fmtINR = (value) => `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const DAY = 86400000;
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/** Where the contract is in its term: days left (negative once it has ended). */
function termOf(contract) {
  const start = contract.contractStartDate ? new Date(contract.contractStartDate) : null;
  const end = contract.validUntil ? new Date(contract.validUntil) : null;
  if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return null;
  return { daysLeft: Math.ceil((end - Date.now()) / DAY) };
}

const formatImportLabel = (key) =>
  String(key || "").split(" ").filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

/**
 * The contract as a clean, invoice-style statement: who it's for, the term,
 * what's covered, and the full calculation down to the balance —
 * contract amount + GST − received − GST not charged − bad debt = balance.
 */
function ContractOverview({ contract }) {
  const [showImport, setShowImport] = useState(false);
  const client = contract.clientId || {};
  const hasGst = contract.gstEnabled && Number(contract.gstPercent) > 0;
  const total = contract.projectAmount || 0;
  const base = contract.preTaxAmount ?? (total - (contract.gstAmount || 0));
  const gst = hasGst ? contract.gstAmount || round2(total - base) : 0;
  const payments = [...(contract.payments || [])].sort((a, b) => new Date(a.paymentDate) - new Date(b.paymentDate));
  const gstNotCharged = round2(payments.reduce((sum, p) => sum + (p.gstNotCharged || 0), 0));
  const received = contract.receivedAmount || 0;
  const badDebt = contract.badDebt?.amount > 0 ? contract.badDebt.amount : 0;
  const balance = Math.max(0, contract.dueAmount ?? total);
  const overpaid = Math.max(0, -(contract.dueAmount ?? 0));
  const services = (contract.selectedServices || []).filter((s) => s?.enabled && s.categoryId);
  // Methods actually used for the payments received (in the order first used);
  // before any payment, the method set on the contract.
  const usedMethods = [...new Set((contract.payments || [])
    .slice().sort((a, b) => new Date(a.paymentDate) - new Date(b.paymentDate))
    .map((p) => p.method).filter(Boolean))];
  const methods = usedMethods.length ? usedMethods : [contract.paymentMethod].filter(Boolean);
  const importEntries = Object.entries(contract.importDetails || {}).filter(([, v]) => v !== null && v !== undefined && v !== "");
  const dueDate = contract.nextDueDate ? new Date(contract.nextDueDate) : null;
  const term = termOf(contract);

  return (
    <article className="civ" data-contract-overview>
      {/* ── Document header ── */}
      <header className="civ-head">
        <div className="civ-brand">
          <div className="civ-brand-name">BharatBizMart</div>
          <div className="civ-brand-tag">Empowering Businesses</div>
        </div>
        <dl className="civ-meta">
          <div><dt>Contract no.</dt><dd className="civ-num">{contract.contractNumber || "—"}</dd></div>
          <div><dt>Created</dt><dd>{fmtDate(contract.createdAt)}</dd></div>
          <div><dt>Term</dt><dd>{fmtDate(contract.contractStartDate)} – {fmtDate(contract.validUntil)}</dd></div>
          {contract.timeline && <div><dt>Duration</dt><dd>{contract.timeline}</dd></div>}
          {term && (
            <div data-remaining>
              <dt>{term.daysLeft < 0 ? "Ended" : "Remaining"}</dt>
              <dd>{term.daysLeft < 0 ? `${Math.abs(term.daysLeft)} day${Math.abs(term.daysLeft) === 1 ? "" : "s"} ago` : `${term.daysLeft} day${term.daysLeft === 1 ? "" : "s"}`}</dd>
            </div>
          )}
        </dl>
      </header>

      {/* ── Bill to ── */}
      <section className="civ-parties">
        <div>
          <div className="civ-label">Billed to</div>
          <div className="civ-party-name">{client.companyName || client.clientName || "—"}</div>
          {client.companyName && client.clientName && <div className="civ-party-line">{client.clientName}</div>}
          {[client.address, client.city, client.state].filter(Boolean).length > 0 && (
            <div className="civ-party-line">{[client.address, client.city, client.state].filter(Boolean).join(", ")}</div>
          )}
          {(client.email || client.phone) && <div className="civ-party-line">{[client.phone, client.email].filter(Boolean).join("  |  ")}</div>}
          {client.gstNo && <div className="civ-party-line">GSTIN {client.gstNo}</div>}
        </div>
        <div className="civ-parties-right">
          <div className="civ-label">Payment</div>
          <div className="civ-party-line" data-pay-methods>{methods.length > 1 ? "Methods" : "Method"}: {methods.join(", ") || "—"}</div>
          {contract.paymentTerms && <div className="civ-party-line">Terms: {contract.paymentTerms}</div>}
          {balance > 0 && <div className="civ-party-line">Next due: {dueDate ? fmtDate(dueDate) : "not set"}</div>}
        </div>
      </section>

      {/* ── What's covered ── */}
      <table className="civ-table">
        <thead>
          <tr><th>Description</th><th className="civ-r">Amount</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <div className="civ-item-title">
                {contract.projectName}
                {contract.packageType && <span className="civ-item-tag">{packageTypeLabel(contract.packageType)} package{contract.renewedFromContractId ? " · Renewal" : ""}</span>}
              </div>
              {/* The scope already names each service; the service list is only the fallback. */}
              {contract.projectScope
                ? <div className="civ-item-sub civ-pre">{contract.projectScope}</div>
                : services.length > 0 && <div className="civ-item-sub">{services.map((s) => getCategoryMeta(s.categoryId)?.label || s.categoryId).join(" · ")}</div>}
            </td>
            <td className="civ-r civ-num">{fmtINR(base)}</td>
          </tr>
        </tbody>
      </table>

      {/* ── Calculation ── */}
      <section className="civ-summary">
        <div className="civ-summary-note">
          {contract.projectDescription && <p>{contract.projectDescription}</p>}
          {badDebt > 0 && contract.badDebt?.reason && (
            <p className="civ-muted">Bad debt written off on {fmtDate(contract.badDebt.writtenOffAt)}{contract.badDebt.byName ? ` by ${contract.badDebt.byName}` : ""} — {contract.badDebt.reason}</p>
          )}
        </div>
        <dl className="civ-calc" data-calc>
          <div><dt>Contract amount</dt><dd>{fmtINR(base)}</dd></div>
          {hasGst && <div><dt>GST {contract.gstPercent}%</dt><dd>+ {fmtINR(gst)}</dd></div>}
          <div className="civ-calc-total"><dt>Total</dt><dd>{fmtINR(total)}</dd></div>
          <div><dt>TDS{contract.tdsEnabled ? ` ${contract.tdsPercent}%` : ""}</dt><dd>{contract.tdsEnabled ? `${fmtINR(contract.tdsAmount)} (records only)` : "Not applied"}</dd></div>
          <div><dt>Received{payments.length ? ` (${payments.length} payment${payments.length === 1 ? "" : "s"})` : ""}</dt><dd>− {fmtINR(received)}</dd></div>
          {gstNotCharged > 0 && <div><dt>GST not charged (cash)</dt><dd>− {fmtINR(gstNotCharged)}</dd></div>}
          {badDebt > 0 && <div><dt>Bad debt written off</dt><dd>− {fmtINR(badDebt)}</dd></div>}
          <div className="civ-calc-balance"><dt>Balance due</dt><dd>{fmtINR(balance)}</dd></div>
          {overpaid > 0 && <div className="civ-calc-foot"><dt>Received extra</dt><dd>{fmtINR(overpaid)}</dd></div>}
        </dl>
      </section>

      {/* ── Payment history ── */}
      {payments.length > 0 && (
        <section>
          <div className="civ-label civ-section-label">Payments received</div>
          <table className="civ-table civ-table--boxed">
            <thead>
              <tr><th>Date</th><th>Mode</th><th>Details</th><th className="civ-r">Amount</th></tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p._id}>
                  <td className="civ-nowrap">{fmtDate(p.paymentDate)}</td>
                  <td>{p.method || "—"}</td>
                  <td className="civ-muted">
                    {[
                      p.gstAmount > 0 && `incl. GST ${fmtINR(p.gstAmount)}`,
                      p.gstNotCharged > 0 && "without GST",
                      p.tdsAmount > 0 && `TDS ${fmtINR(p.tdsAmount)}`,
                      p.notes,
                    ].filter(Boolean).join(" - ") || "—"}
                  </td>
                  <td className="civ-r civ-num">{fmtINR(round2((p.amount || 0) - (p.gstNotCharged || 0)))}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr><td colSpan={3}>Total received</td><td className="civ-r civ-num">{fmtINR(received)}</td></tr>
            </tfoot>
          </table>
        </section>
      )}

      {contract.notes && (
        <section>
          <div className="civ-label civ-section-label">Notes</div>
          <p className="civ-text">{contract.notes}</p>
        </section>
      )}

      {importEntries.length > 0 && (
        <section>
          <button type="button" className="civ-collapse" onClick={() => setShowImport((v) => !v)} aria-expanded={showImport}>
            Imported details ({importEntries.length}) <ChevronDown size={15} style={{ transform: showImport ? "rotate(180deg)" : "none" }} />
          </button>
          {showImport && (
            <dl className="civ-import">
              {importEntries.map(([k, v]) => (
                <div key={k}><dt>{formatImportLabel(k)}</dt><dd>{typeof v === "object" ? JSON.stringify(v) : String(v)}</dd></div>
              ))}
            </dl>
          )}
        </section>
      )}
    </article>
  );
}

// The contract popup. `onlyTab` ("deliverables" | "payments") opens straight
// to that manager (from the Deliverables / Payments sections). Without it the
// popup is the contract's overview only — deliverables and payments have
// their own sections on the client page, so there are no tabs here.
const ContractDetail = ({ contractId, onlyTab }) => {
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // The popup mounts fresh for each contract, so loading starts true.
    let alive = true;
    getContractById(contractId)
      .then((response) => { if (alive) setContract(response.data); })
      .catch((error) => console.error("Error loading contract:", error))
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [contractId]);

  if (loading) return <div className="loading">Loading contract...</div>;
  if (!contract) return <div className="empty-state">Contract not found.</div>;

  if (onlyTab === "deliverables" || onlyTab === "payments") {
    return (
      <div className="contract-detail">
        <div className="contract-detail-header">
          <div>
            <h2>{contract.projectName}</h2>
            <p>{contract.clientId?.clientName} · {contract.contractNumber}</p>
          </div>
        </div>
        {onlyTab === "deliverables" ? (
          <div className="contract-detail-section">
            <h3>Scope of Work</h3>
            <DeliverablesTracker contract={contract} onUpdated={setContract} />
          </div>
        ) : (
          <div className="contract-detail-section">
            <h3>Payments</h3>
            <PaymentManager contract={contract} onUpdated={setContract} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="contract-detail">
      <ContractOverview contract={contract} />
    </div>
  );
};

export default ContractDetail;
