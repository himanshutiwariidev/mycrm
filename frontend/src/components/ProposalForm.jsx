import React, { useState, useEffect } from "react";
import { createProposal, sendProposal, updateProposal } from "../services/clientApi";
import "./ProposalForm.css";

const ProposalForm = ({ clientId, proposal, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    clientId: clientId || "",
    projectName: "",
    projectDescription: "",
    projectScope: "",
    timeline: "",
    projectAmount: "",
    currency: "INR",
    paymentTerms: "",
    validUntil: "",
    /* notes: "", */
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showSendOption, setShowSendOption] = useState(false);

  useEffect(() => {
    if (proposal) {
      setFormData(proposal);
      setShowSendOption(proposal.proposalStatus === "draft");
    }
  }, [proposal]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (proposal?._id) {
        await updateProposal(proposal._id, formData);
        alert("Proposal updated successfully");
      } else {
        const response = await createProposal(formData);
        if (response.data.emailError) {
          alert(`Proposal created successfully, but failed to send email: ${response.data.emailError}`);
        } else {
          alert("Proposal created and sent successfully to client's email");
        }
      }
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save proposal");
    } finally {
      setLoading(false);
    }
  };

  const handleSendProposal = async () => {
    if (!proposal?._id) {
      setError("Please save the proposal first");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await sendProposal(proposal._id);
      alert("Proposal sent successfully to client's email");
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send proposal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="proposal-form-container">
      <h2>{proposal?._id ? "Edit Proposal" : "Create Project Proposal"}</h2>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit} className="proposal-form">
        <div className="form-row">
          <div className="form-group">
            <label>Project Name *</label>
            <input
              type="text"
              name="projectName"
              value={formData.projectName}
              onChange={handleChange}
              required
              placeholder="Enter project name"
            />
          </div>
          <div className="form-group">
            <label>Project Amount *</label>
            <div className="amount-group">
              <input
                type="number"
                name="projectAmount"
                value={formData.projectAmount}
                onChange={handleChange}
                required
                placeholder="Enter amount"
                step="0.01"
              />
              <select
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                className="currency-select"
              >
                <option value="INR">INR</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          </div>
        </div>

        <div className="form-group">
          <label>Project Description *</label>
          <textarea
            name="projectDescription"
            value={formData.projectDescription}
            onChange={handleChange}
            required
            placeholder="Describe the project in detail"
            rows="5"
          />
        </div>

        <div className="form-group">
          <label>Project Scope</label>
          <textarea
            name="projectScope"
            value={formData.projectScope}
            onChange={handleChange}
            placeholder="Define the scope of work"
            rows="3"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Timeline</label>
            <input
              type="text"
              name="timeline"
              value={formData.timeline}
              onChange={handleChange}
              placeholder="e.g., 2-4 weeks, 1 month"
            />
          </div>
          <div className="form-group">
            <label>Valid Until</label>
            <input
              type="date"
              name="validUntil"
              value={formData.validUntil}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="form-group">
          <label>Payment Terms</label>
          <textarea
            name="paymentTerms"
            value={formData.paymentTerms}
            onChange={handleChange}
            placeholder="e.g., 50% upfront, 50% on completion"
            rows="3"
          />
        </div>

       {/*  <div className="form-group">
          <label>Additional Notes</label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Any additional information"
            rows="3"
          />
        </div> */}

        <div className="form-actions">
          <button type="submit" disabled={loading} className="btn-submit">
            {loading ? "Saving..." : proposal?._id ? "Update Proposal" : "Create Proposal"}
          </button>

          {showSendOption && proposal?.proposalStatus === "draft" && (
            <button
              type="button"
              onClick={handleSendProposal}
              disabled={loading}
              className="btn-send"
            >
              {loading ? "Sending..." : "Save & Send to Client"}
            </button>
          )}

          <button type="button" onClick={onCancel} className="btn-cancel">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProposalForm;
