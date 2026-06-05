import React, { useState, useEffect } from "react";
import {
  getAllClients,
  deleteClient,
  getAllProposals,
  deleteProposal,
  getAllReminders,
  deletePaymentReminder,
} from "../services/clientApi";
import ClientForm from "../components/ClientForm";
import ProposalForm from "../components/ProposalForm";
import PaymentReminderForm from "../components/PaymentReminderForm";
import "./ClientsPage.css";

const ClientsPage = () => {
  const [activeTab, setActiveTab] = useState("clients");
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [selectedReminder, setSelectedReminder] = useState(null);

  const [clients, setClients] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (activeTab === "clients") {
      loadClients();
    } else if (activeTab === "proposals") {
      loadProposals();
    } else if (activeTab === "reminders") {
      loadReminders();
    }
  }, [activeTab]);

  const loadClients = async () => {
    setLoading(true);
    try {
      const response = await getAllClients();
      setClients(response.data.clients || []);
    } catch (error) {
      console.error("Error loading clients:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadProposals = async () => {
    setLoading(true);
    try {
      const response = await getAllProposals();
      setProposals(response.data.proposals || []);
    } catch (error) {
      console.error("Error loading proposals:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadReminders = async () => {
    setLoading(true);
    try {
      const response = await getAllReminders();
      setReminders(response.data.reminders || []);
    } catch (error) {
      console.error("Error loading reminders:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddClient = () => {
    setSelectedClient(null);
    setFormType("client");
    setShowForm(true);
  };

  const handleEditClient = (client) => {
    setSelectedClient(client);
    setFormType("client");
    setShowForm(true);
  };

  const handleDeleteClient = async (id) => {
    if (window.confirm("Are you sure you want to delete this client and all related data?")) {
      try {
        await deleteClient(id);
        alert("Client deleted successfully");
        loadClients();
      } catch (error) {
        alert("Error deleting client");
      }
    }
  };

  const handleAddProposal = (clientId = null) => {
    setSelectedProposal(null);
    setSelectedClient(clientId ? { _id: clientId } : null);
    setFormType("proposal");
    setShowForm(true);
  };

  const handleEditProposal = (proposal) => {
    setSelectedProposal(proposal);
    setFormType("proposal");
    setShowForm(true);
  };

  const handleDeleteProposal = async (id) => {
    if (window.confirm("Are you sure you want to delete this proposal?")) {
      try {
        await deleteProposal(id);
        alert("Proposal deleted successfully");
        loadProposals();
      } catch (error) {
        alert("Error deleting proposal");
      }
    }
  };

  const handleAddReminder = (clientId = null) => {
    setSelectedReminder(null);
    setSelectedClient(clientId ? { _id: clientId } : null);
    setFormType("reminder");
    setShowForm(true);
  };

  const handleEditReminder = (reminder) => {
    setSelectedReminder(reminder);
    setFormType("reminder");
    setShowForm(true);
  };

  const handleDeleteReminder = async (id) => {
    if (window.confirm("Are you sure you want to delete this reminder?")) {
      try {
        await deletePaymentReminder(id);
        alert("Reminder deleted successfully");
        loadReminders();
      } catch (error) {
        alert("Error deleting reminder");
      }
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    if (formType === "client") {
      loadClients();
    } else if (formType === "proposal") {
      loadProposals();
    } else if (formType === "reminder") {
      loadReminders();
    }
  };

  const filteredClients = clients.filter(
    (client) =>
      client.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredProposals = proposals.filter(
    (proposal) =>
      proposal.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      proposal.clientId?.clientName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredReminders = reminders.filter(
    (reminder) =>
      reminder.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reminder.clientId?.clientName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="clients-page">
      <div className="page-header">
        <h1>Client Management</h1>
        <p>Manage your clients, send proposals, and track payments</p>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setShowForm(false)}>
              ✕
            </button>
            {formType === "client" && (
              <ClientForm
                client={selectedClient}
                onSuccess={handleFormSuccess}
                onCancel={() => setShowForm(false)}
              />
            )}
            {formType === "proposal" && (
              <ProposalForm
                clientId={selectedClient?._id}
                proposal={selectedProposal}
                onSuccess={handleFormSuccess}
                onCancel={() => setShowForm(false)}
              />
            )}
            {formType === "reminder" && (
              <PaymentReminderForm
                clientId={selectedClient?._id}
                reminder={selectedReminder}
                onSuccess={handleFormSuccess}
                onCancel={() => setShowForm(false)}
              />
            )}
          </div>
        </div>
      )}

      <div className="tabs">
        <button
          className={`tab ${activeTab === "clients" ? "active" : ""}`}
          onClick={() => setActiveTab("clients")}
        >
          👥 Clients ({clients.length})
        </button>
        <button
          className={`tab ${activeTab === "proposals" ? "active" : ""}`}
          onClick={() => setActiveTab("proposals")}
        >
          📋 Proposals ({proposals.length})
        </button>
        <button
          className={`tab ${activeTab === "reminders" ? "active" : ""}`}
          onClick={() => setActiveTab("reminders")}
        >
          💰 Payment Reminders ({reminders.length})
        </button>
      </div>

      <div className="tab-content">
        {/* CLIENTS TAB */}
        {activeTab === "clients" && (
          <div className="clients-section">
            <div className="section-header">
              <div className="search-box">
                <input
                  type="text"
                  placeholder="Search clients by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button className="btn-primary" onClick={handleAddClient}>
                ➕ Add New Client
              </button>
            </div>

            {loading ? (
              <div className="loading">Loading clients...</div>
            ) : filteredClients.length === 0 ? (
              <div className="empty-state">
                <p>No clients found. Start by adding a new client!</p>
              </div>
            ) : (
              <div className="clients-grid">
                {filteredClients.map((client) => (
                  <div key={client._id} className="client-card">
                    <div className="card-header">
                      <h3>{client.clientName}</h3>
                      <span className={`status ${client.status}`}>{client.status}</span>
                    </div>
                    <div className="card-body">
                      <p>
                        <strong>Email:</strong> {client.email}
                      </p>
                      <p>
                        <strong>Phone:</strong> {client.phone}
                      </p>
                      {client.companyName && (
                        <p>
                          <strong>Company:</strong> {client.companyName}
                        </p>
                      )}
                      {client.contactPerson && (
                        <p>
                          <strong>Contact Person:</strong> {client.contactPerson}
                        </p>
                      )}
                    </div>
                    <div className="card-footer">
                      <button
                        className="btn-secondary"
                        onClick={() => handleAddProposal(client._id)}
                      >
                        📋 New Proposal
                      </button>
                      <button
                        className="btn-secondary"
                        onClick={() => handleAddReminder(client._id)}
                      >
                        💰 New Reminder
                      </button>
                      <button className="btn-secondary" onClick={() => handleEditClient(client)}>
                        ✏️ Edit
                      </button>
                      <button className="btn-danger" onClick={() => handleDeleteClient(client._id)}>
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PROPOSALS TAB */}
        {activeTab === "proposals" && (
          <div className="proposals-section">
            <div className="section-header">
              <div className="search-box">
                <input
                  type="text"
                  placeholder="Search proposals by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button className="btn-primary" onClick={() => handleAddProposal()}>
                ➕ Create Proposal
              </button>
            </div>

            {loading ? (
              <div className="loading">Loading proposals...</div>
            ) : filteredProposals.length === 0 ? (
              <div className="empty-state">
                <p>No proposals found. Create one to get started!</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Proposal #</th>
                      <th>Project</th>
                      <th>Client</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Valid Until</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProposals.map((proposal) => (
                      <tr key={proposal._id}>
                        <td>{proposal.proposalNumber}</td>
                        <td>{proposal.projectName}</td>
                        <td>{proposal.clientId?.clientName || "N/A"}</td>
                        <td>
                          {proposal.projectAmount} {proposal.currency}
                        </td>
                        <td>
                          <span className={`status ${proposal.proposalStatus}`}>
                            {proposal.proposalStatus}
                          </span>
                        </td>
                        <td>
                          {proposal.validUntil
                            ? new Date(proposal.validUntil).toLocaleDateString("en-IN")
                            : "N/A"}
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button
                              className="btn-small"
                              onClick={() => handleEditProposal(proposal)}
                              title="Edit"
                            >
                              ✏️
                            </button>
                            <button
                              className="btn-small"
                              onClick={() => handleDeleteProposal(proposal._id)}
                              title="Delete"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* REMINDERS TAB */}
        {activeTab === "reminders" && (
          <div className="reminders-section">
            <div className="section-header">
              <div className="search-box">
                <input
                  type="text"
                  placeholder="Search reminders..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button className="btn-primary" onClick={() => handleAddReminder()}>
                ➕ Create Reminder
              </button>
            </div>

            {loading ? (
              <div className="loading">Loading reminders...</div>
            ) : filteredReminders.length === 0 ? (
              <div className="empty-state">
                <p>No payment reminders found. Create one to track payments!</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Reminder #</th>
                      <th>Invoice #</th>
                      <th>Client</th>
                      <th>Amount</th>
                      <th>Due Date</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReminders.map((reminder) => (
                      <tr key={reminder._id}>
                        <td>{reminder.reminderId}</td>
                        <td>{reminder.invoiceNumber}</td>
                        <td>{reminder.clientId?.clientName || "N/A"}</td>
                        <td>
                          {reminder.amountDue} {reminder.currency}
                        </td>
                        <td>
                          {reminder.dueDate
                            ? new Date(reminder.dueDate).toLocaleDateString("en-IN")
                            : "On Demand"}
                        </td>
                        <td>
                          <span className="reminder-type">
                            {reminder.reminderType.replace("-", " ")}
                          </span>
                        </td>
                        <td>
                          <span className={`status ${reminder.reminderStatus}`}>
                            {reminder.reminderStatus}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button
                              className="btn-small"
                              onClick={() => handleEditReminder(reminder)}
                              title="Edit"
                            >
                              ✏️
                            </button>
                            <button
                              className="btn-small"
                              onClick={() => handleDeleteReminder(reminder._id)}
                              title="Delete"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientsPage;
