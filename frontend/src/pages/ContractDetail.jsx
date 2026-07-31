import React, { useEffect, useState } from "react";
import { getContractById } from "../services/clientApi";
import DeliverablesTracker from "../components/DeliverablesTracker";
import PaymentManager from "../components/PaymentManager";
import "./ContractDetail.css";

const fmtDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const fmtINR = (value, currency = "INR") => `${(value || 0).toLocaleString("en-IN")} ${currency}`;

const DetailField = ({ label, value }) => (
  <div>
    <p style={{ margin: "0 0 2px 0", fontSize: 12, color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.3 }}>{label}</p>
    <p style={{ margin: 0, fontSize: 14, color: "#1f2937" }}>{value ?? "—"}</p>
  </div>
);

// onlyTab ("deliverables" | "payments") restricts the modal to a single tab — no
// switcher shown — for contexts that already know which one the user wants
// (e.g. clicking a row in the Deliverables-only or Payments-only list elsewhere).
// defaultTab sets which tab is active on open without restricting the switcher —
// used to open straight to "details" from the Contracts table's eye icon while
// still letting the admin jump to Deliverables/Payments from the same modal.
// Leave both unset to show all tabs, defaulting to Deliverables.
const ContractDetail = ({ contractId, onClose, onlyTab, defaultTab }) => {
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(onlyTab || defaultTab || "deliverables");

  const loadContract = async () => {
    setLoading(true);
    try {
      const response = await getContractById(contractId);
      setContract(response.data);
    } catch (error) {
      console.error("Error loading contract:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContract();
  }, [contractId]);

  if (loading) {
    return <div className="loading">Loading contract...</div>;
  }

  if (!contract) {
    return <div className="empty-state">Contract not found.</div>;
  }

  return (
    <div className="contract-detail">
      <div className="contract-detail-header">
        <div>
          <h2>{contract.projectName}</h2>
          <p>{contract.clientId?.clientName} · {contract.contractNumber}</p>
        </div>
        <button type="button" className="btn-cancel" onClick={onClose}>Close</button>
      </div>

      {!onlyTab && (
        <div className="contract-detail-tabs">
          <button
            type="button"
            className={`contract-detail-tab ${activeTab === "details" ? "active" : ""}`}
            onClick={() => setActiveTab("details")}
          >
            🧾 Details
          </button>
          <button
            type="button"
            className={`contract-detail-tab ${activeTab === "deliverables" ? "active" : ""}`}
            onClick={() => setActiveTab("deliverables")}
          >
            📦 Deliverables
          </button>
          <button
            type="button"
            className={`contract-detail-tab ${activeTab === "payments" ? "active" : ""}`}
            onClick={() => setActiveTab("payments")}
          >
            💳 Payments
          </button>
        </div>
      )}

      {(onlyTab || activeTab) === "details" && (
        <div className="contract-detail-section">
          <h3>Contract Details</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px 24px", marginBottom: 20 }}>
            <DetailField label="Contract Number" value={contract.contractNumber} />
            <DetailField label="Status" value={contract.contractStatus} />
            <DetailField label="Timeline" value={contract.timeline} />
            <DetailField label="Contract Start Date" value={fmtDate(contract.contractStartDate)} />
            <DetailField label="Contract End Date" value={fmtDate(contract.validUntil)} />
            <DetailField label="Created" value={fmtDate(contract.createdAt)} />
          </div>

          <h3>Financials</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px 24px", marginBottom: 20 }}>
            <DetailField label="Project Amount" value={fmtINR(contract.projectAmount, contract.currency)} />
            <DetailField label="Pre-Tax Amount" value={fmtINR(contract.preTaxAmount, contract.currency)} />
            <DetailField label="Received Amount" value={fmtINR(contract.receivedAmount, contract.currency)} />
            <DetailField label="Balance Amount" value={fmtINR(contract.dueAmount ?? contract.projectAmount, contract.currency)} />
            <DetailField label="Due Date" value={fmtDate(contract.nextDueDate)} />
            <DetailField
              label="GST"
              value={contract.gstEnabled ? `${contract.gstPercent}% (${fmtINR(contract.gstAmount, contract.currency)})` : "Not applied"}
            />
            <DetailField
              label="TDS"
              value={contract.tdsEnabled ? `${contract.tdsPercent}% (${fmtINR(contract.tdsAmount, contract.currency)})` : "Not applied"}
            />
          </div>

          {(contract.projectDescription || contract.projectScope || contract.paymentTerms || contract.notes) && (
            <>
              <h3>Notes & Scope</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14 }}>
                {contract.projectDescription && <DetailField label="Project Description" value={contract.projectDescription} />}
                {contract.projectScope && <DetailField label="Project Scope" value={contract.projectScope} />}
                {contract.paymentTerms && <DetailField label="Payment Terms" value={contract.paymentTerms} />}
                {contract.notes && <DetailField label="Notes" value={contract.notes} />}
              </div>
            </>
          )}

          {contract.deliverables?.length > 0 && (
            <>
              <h3 style={{ marginTop: 20 }}>Deliverables</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {contract.deliverables.map((d, i) => (
                  <div key={d._id || i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "#f9fafb", borderRadius: 6, fontSize: 13.5 }}>
                    <span>{d.title}</span>
                    <span style={{ color: "#6b7280" }}>
                      {d.delivered || 0}/{d.quantity} {d.frequency && d.frequency !== "one-time" ? `per ${d.frequency}` : ""} · {d.status || "Pending"}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {(onlyTab || activeTab) === "deliverables" && (
        <div className="contract-detail-section">
          <h3>Scope of Work</h3>
          <DeliverablesTracker contract={contract} onUpdated={setContract} />
        </div>
      )}

      {(onlyTab || activeTab) === "payments" && (
        <div className="contract-detail-section">
          <h3>Payments</h3>
          <PaymentManager contract={contract} onUpdated={setContract} />
        </div>
      )}
    </div>
  );
};

export default ContractDetail;
