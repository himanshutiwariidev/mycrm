import React, { useEffect, useState } from "react";
import { getContractById } from "../services/clientApi";
import DeliverablesTracker from "../components/DeliverablesTracker";
import PaymentManager from "../components/PaymentManager";
import "./ContractDetail.css";

// onlyTab ("deliverables" | "payments") restricts the modal to a single tab — no
// switcher shown — for contexts that already know which one the user wants
// (e.g. clicking a row in the Deliverables-only or Payments-only list elsewhere).
// Leave it unset to show both tabs, as the general-purpose "manage this contract" view.
const ContractDetail = ({ contractId, onClose, onlyTab }) => {
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(onlyTab || "deliverables");

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
