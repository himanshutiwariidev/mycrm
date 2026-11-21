import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, Pencil, Trash2, Download, FileText, Wallet, Package,
  CreditCard, History, Plus, X, User, CheckCircle2, ChevronDown, ChevronRight,
  Activity, Inbox, IndianRupee, Eye,
  UserPlus, Send, RefreshCw, Edit3, ShieldCheck, FilePlus,
  MessageSquare, TrendingUp, Phone, Mail, FileBarChart2,
} from "lucide-react";
import {
  getClientById, updateClient, deleteClient, getClientActivity,
  deleteContract,
  getClientRemarks, addClientRemark,
  updateDeliverable,
} from "../services/clientApi";
import ClientForm from "../components/ClientForm";
import ContractDetail from "./ContractDetail";
import DeliverableDetailPanel from "../components/DeliverableDetailPanel";
import { getLeafConfig } from "../features/contract-builder/utils/configLookup";
import { findMatchingSelection } from "../features/contract-builder/utils/deliverableTracking";
import { getCategoryMeta } from "../features/contract-builder/config/serviceCategories";
import { resolveDeliverableVisual, resolveCategoryVisual } from "../config/serviceVisuals";
import { unitNoun, formatDeliverableAmount } from "../config/deliverableUnits";
import { ProofButton, ProofDialog, proofsForContractDeliverable, useDeliverableProofs } from "../components/DeliverableProofs";
import { clientCategoryLabel } from "../config/clientCategories";
import PackageStars from "../components/PackageStars";
import ClientMonthlyReports from "../components/ClientMonthlyReports";
import "./ClientDetailPage.css";

const initials = (name = "") =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";

const fmtDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const fmtDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

const fmtINR = (value) => `₹${(value || 0).toLocaleString("en-IN")}`;

const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "converted", label: "Converted" },
  { value: "cold", label: "Cold" },
  { value: "ni", label: "Not Interested" },
];

// Anything saved on a client that's NOT in this set automatically surfaces under
// "Custom Information" below — so newly added onboarding fields show up with no code changes.
const KNOWN_CLIENT_FIELDS = new Set([
  "_id", "__v", "clientName", "email", "phone", "companyName", "gstNo", "tanNo",
  "salesPerson", "leadSource", "clientType", "businessCategory", "projectType", "projectName",
  "address", "city", "state", "country", "zipCode", "contactPerson", "designation",
  "status", "activeStatus", "totalProjects", "totalAmount", "notes", "onboardedAt",
  "createdAt", "updatedAt", "hasLoginAccess",
  "assignedUser", "assignedBy", "assignedDate", "remarks", "workProgress", "piAttachments",
]);

const TABS = [
  { id: "overview", label: "Overview", Icon: User },
  { id: "contracts", label: "Contracts", Icon: FileText },
  { id: "remarks", label: "Remarks History", Icon: MessageSquare },
  { id: "deliverables", label: "Deliverables", Icon: Package },
  { id: "payments", label: "Payments", Icon: CreditCard },
  { id: "reports", label: "Monthly Reports", Icon: FileBarChart2 },
  { id: "activity", label: "Activity Timeline", Icon: History },
];

const ACTIVITY_META = {
  client_created: { Icon: UserPlus, color: "#16a34a" },
  client_updated: { Icon: Edit3, color: "#2563eb" },
  status_changed: { Icon: RefreshCw, color: "#f7931e" },
  contract_created: { Icon: FileText, color: "#2563eb" },
  contract_updated: { Icon: Edit3, color: "#2563eb" },
  contract_sent: { Icon: Send, color: "#16a34a" },
  deliverable_added: { Icon: Package, color: "#f7931e" },
  deliverable_updated: { Icon: Package, color: "#2563eb" },
  payment_added: { Icon: IndianRupee, color: "#16a34a" },
  reminder_created: { Icon: Wallet, color: "#f7931e" },
  reminder_sent: { Icon: Send, color: "#16a34a" },
  portal_enabled: { Icon: ShieldCheck, color: "#7c3aed" },
  invoice_generated: { Icon: FilePlus, color: "#2563eb" },
};

function Skeleton({ height = 16, width = "100%", radius = 8, style = {} }) {
  return (
    <div
      style={{
        height, width, borderRadius: radius,
        background: "linear-gradient(90deg,#eef0f4 25%,#f6f7fa 37%,#eef0f4 63%)",
        backgroundSize: "400% 100%", animation: "shimmer 1.4s ease infinite", ...style,
      }}
    />
  );
}

function EmptyState({ message }) {
  return (
    <div className="cd-empty">
      <Inbox size={28} strokeWidth={1.6} />
      {message}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="detail-section">
      <h3>{title}</h3>
      <div className="detail-grid">{children}</div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div className="detail-field">
      <span className="detail-label">{label}</span>
      <span className="detail-value">{value || value === 0 ? value : "—"}</span>
    </div>
  );
}

/** One label → value row in the compact profile card (hidden when empty). */
function KV({ label, value, href, cap = false }) {
  if (value === undefined || value === null || value === "" || value === "—") return null;
  return (
    <div className="cdx-kv">
      <span className="cdx-kv-label">{label}</span>
      {href ? <a className="cdx-kv-value" href={href}>{value}</a> : <span className={`cdx-kv-value${cap ? " cdx-cap" : ""}`}>{value}</span>}
    </div>
  );
}

/** A section card on the single-page layout (one per former tab). */
function Block({ id, Icon, title, count, subtitle, actions, children, className = "" }) {
  return (
    <section id={`cd-${id}`} className={`cdx-card ${className}`}>
      <header className="cdx-card-head">
        <div className="cdx-card-title">
          <span className="cdx-card-icon"><Icon size={15} strokeWidth={2.2} /></span>
          <h2>{title}</h2>
          {count !== undefined && <span className="cdx-count">{count}</span>}
          {subtitle && <span className="cdx-sub">{subtitle}</span>}
        </div>
        {actions && <div className="cdx-card-actions">{actions}</div>}
      </header>
      {children}
    </section>
  );
}

const SECTION_IDS = new Set(TABS.map((t) => t.id).filter((id) => id !== "overview"));
const scrollToSection = (id) =>
  document.getElementById(`cd-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });

export default function ClientDetailPage() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [client, setClient] = useState(null);
  const [contracts, setContracts] = useState([]);
  // Proof of work (screenshots / live links) the team attached to this client's deliverables.
  const { proofs, remove: removeProof } = useDeliverableProofs({ clientIds: clientId ? [clientId] : [] });
  const [proofItem, setProofItem] = useState(null); // contract deliverable whose proof is open
  const [activity, setActivity] = useState([]);
  const [remarks, setRemarks] = useState([]);
  const [loading, setLoading] = useState(true);
  // Everything is on one page now; ?tab=deliverables (etc., e.g. from the
  // Sales Dashboard) scrolls to that section once the data has loaded.
  const requestedSection = searchParams.get("tab");
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [showRenewPicker, setShowRenewPicker] = useState(false);
  const [formType, setFormType] = useState(null);
  const [manageContractId, setManageContractId] = useState(null);
  const [manageContractTab, setManageContractTab] = useState(null);
  const [manageContractDefaultTab, setManageContractDefaultTab] = useState(null);
  const [paymentContractId, setPaymentContractId] = useState(null);
  const [expandedDeliverableKey, setExpandedDeliverableKey] = useState(null);
  const [deliverableStatusSaving, setDeliverableStatusSaving] = useState(null);

  const [remarkText, setRemarkText] = useState("");
  const [remarkSaving, setRemarkSaving] = useState(false);

  const userRole = localStorage.getItem("role");
  // "Back to Clients" returns to the Clients section inside each role's own
  // dashboard (with its sidebar/tabs) — never the bare /clients page.
  const backPath = { admin: "/admin?tab=clients", sales: "/sales?view=clients", user: "/dashboard?tab=clients" }[userRole] || "/clients";
  const userId = localStorage.getItem("userId");
  const isAdmin = userRole === "admin";

  const loadAll = async () => {
    setLoading(true);
    try {
      const [clientRes, activityRes, remarksRes] = await Promise.all([
        getClientById(clientId),
        getClientActivity(clientId).catch(() => ({ data: { activity: [] } })),
        getClientRemarks(clientId).catch(() => ({ data: { remarks: [] } })),
      ]);
      setClient(clientRes.data.client);
      setContracts(clientRes.data.contracts || []);
      setActivity(activityRes.data.activity || []);
      setRemarks(remarksRes.data.remarks || []);
    } catch (error) {
      console.error("Error loading client:", error);
      setClient(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, [clientId]);

  useEffect(() => {
    if (!loading && SECTION_IDS.has(requestedSection)) {
      const t = setTimeout(() => scrollToSection(requestedSection), 150);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [loading, requestedSection]);

  const canManageRemarks = isAdmin
    || (client?.salesPerson?._id && String(client.salesPerson._id) === userId)
    || (client?.assignedUser?._id && String(client.assignedUser._id) === userId);

  const handleAddRemark = async () => {
    if (!remarkText.trim()) return;
    setRemarkSaving(true);
    try {
      await addClientRemark(clientId, remarkText.trim());
      setRemarkText("");
      await loadAll();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to add remark");
    } finally {
      setRemarkSaving(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    setStatusSaving(true);
    try {
      await updateClient(clientId, { status: newStatus });
      await loadAll();
    } catch {
      alert("Failed to update status");
    } finally {
      setStatusSaving(false);
    }
  };

  const handleActiveStatusToggle = async () => {
    setStatusSaving(true);
    try {
      await updateClient(clientId, { activeStatus: client.activeStatus === "active" ? "inactive" : "active" });
      await loadAll();
    } catch {
      alert("Failed to update status");
    } finally {
      setStatusSaving(false);
    }
  };

  const handleDeleteClient = async () => {
    if (!window.confirm("Are you sure you want to delete this client and all related data?")) return;
    try {
      await deleteClient(clientId);
      navigate(backPath);
    } catch {
      alert("Error deleting client");
    }
  };

  const handleDeleteContract = async (id) => {
    if (!window.confirm("Are you sure you want to delete this contract?")) return;
    try {
      await deleteContract(id);
      loadAll();
    } catch {
      alert("Error deleting contract");
    }
  };

  const handleDeliverableStatusChange = async (contractId, deliverableId, status) => {
    setDeliverableStatusSaving(deliverableId);
    try {
      await updateDeliverable(contractId, deliverableId, { status });
      loadAll();
    } catch {
      alert("Error updating deliverable status");
    } finally {
      setDeliverableStatusSaving(null);
    }
  };

  const latestContract = contracts[0]; // backend sorts contracts desc by createdAt

  const handleFormSuccess = () => {
    setShowForm(false);
    loadAll();
  };

  if (loading) {
    return (
      <div className="client-detail-page">
        <style>{`@keyframes shimmer { 0% { background-position: 100% 0; } 100% { background-position: 0 0; } }`}</style>
        <Skeleton height={150} radius={18} />
        <div style={{ marginTop: 18 }}><Skeleton height={40} radius={12} /></div>
        <div style={{ marginTop: 18 }}><Skeleton height={320} radius={18} /></div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="client-detail-page">
        <button className="cd-back" onClick={() => navigate(backPath)}>
          <ArrowLeft size={15} strokeWidth={2.2} /> Back to Clients
        </button>
        <EmptyState message="Client not found" />
      </div>
    );
  }

  const allDeliverables = contracts.flatMap((p) =>
    (p.deliverables || []).map((d) => ({ ...d, _contractId: p._id, _contractName: p.projectName, _contract: p }))
  );
  // One row per service category per contract (e.g. "Social Media" covering
  // AI Creative/AI Reels/Graphic Creatives), not one row per deliverable —
  // expanding a row reveals the individual items underneath.
  const groupedDeliverables = Object.values(
    allDeliverables.reduce((groups, d) => {
      const categoryId = d.categoryId || "general";
      const categoryLabel = getCategoryMeta(d.categoryId)?.label || d.categoryId || "General";
      const key = `${d._contractId}-${categoryId}`;
      if (!groups[key]) {
        groups[key] = { key, categoryId, categoryLabel, _contractId: d._contractId, _contractName: d._contractName, _contract: d._contract, items: [] };
      }
      groups[key].items.push(d);
      return groups;
    }, {})
  );
  const allPayments = contracts
    .flatMap((p) => (p.payments || []).map((pay) => ({ ...pay, _contractId: p._id, _contractName: p.projectName })))
    .sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));

  const totalProjectValue = contracts.reduce((sum, p) => sum + (p.projectAmount || 0), 0);
  const totalReceived = contracts.reduce((sum, p) => sum + (p.receivedAmount || 0), 0);
  const totalDue = contracts.reduce((sum, p) => sum + (p.dueAmount || 0), 0);
  // TDS is admin record-keeping only — it never rolls into projectAmount/dueAmount above.
  const totalTds = contracts.reduce((sum, p) => sum + (p.tdsEnabled ? (p.tdsAmount || 0) : 0), 0);
  const now = new Date();
  const overdueCount = contracts.filter((p) => p.nextDueDate && p.dueAmount > 0 && new Date(p.nextDueDate) < now).length;
  const effectivePaymentContractId = paymentContractId || latestContract?._id || null;

  const customFields = Object.entries(client).filter(
    ([key, value]) => !KNOWN_CLIENT_FIELDS.has(key) && value !== null && value !== undefined && value !== ""
  );

  const statusLabel = STATUS_OPTIONS.find((o) => o.value === client.status)?.label || client.status;
  const addressLine = [client.address, client.city, client.state, client.country, client.zipCode].filter(Boolean).join(", ");
  const salesName = client.salesPerson?.name || client.salesPersonName;
  // Profile fields that are still empty — one line instead of a dozen "—" cells.
  const emptyCount = [
    client.email, client.contactPerson, client.designation, client.clientType, client.gstNo, client.tanNo,
    client.leadSource, salesName, addressLine,
  ].filter((v) => !v).length;
  const visibleActivity = showAllActivity ? activity : activity.slice(0, 8);
  const sectionNav = [
    { id: "contracts", label: "Contracts", count: contracts.length },
    { id: "deliverables", label: "Deliverables", count: groupedDeliverables.length },
    { id: "reports", label: "Monthly Reports" },
    { id: "payments", label: "Payments", count: allPayments.length },
    { id: "remarks", label: "Remarks", count: remarks.length },
    { id: "activity", label: "Activity", count: activity.length },
  ];
  const piBaseUrl = import.meta.env.VITE_API_BASE_URL
    ? import.meta.env.VITE_API_BASE_URL.replace("/api", "")
    : "http://localhost:4050";

  return (
    <div className="client-detail-page cdx-page">
      <style>{`@keyframes shimmer { 0% { background-position: 100% 0; } 100% { background-position: 0 0; } }`}</style>

      <button className="cd-back" onClick={() => navigate(backPath)}>
        <ArrowLeft size={15} strokeWidth={2.2} /> Back to Clients
      </button>

      <div className="cdx-layout">
        {/* ═══ Left: compact client profile ═══ */}
        <aside className="cdx-profile">
          <div className="cdx-profile-top">
            <div className="cd-avatar cdx-avatar">{initials(client.clientName)}</div>
            <div className="cdx-profile-names">
              <h1>{client.companyName || client.clientName}</h1>
              {client.companyName && <p><User size={12} strokeWidth={2} /> {client.clientName}</p>}
            </div>
            <div className="cdx-profile-actions">
              <button className="btn-small" title="Edit Client" onClick={() => { setFormType("client"); setShowForm(true); }}>
                <Pencil size={14} strokeWidth={2.1} />
              </button>
              <button className="btn-small" title="Delete Client" onClick={handleDeleteClient}>
                <Trash2 size={14} strokeWidth={2.1} />
              </button>
            </div>
          </div>

          <div className="cdx-status-row">
            <select
              className={`status status-select ${client.status}`}
              value={client.status}
              disabled={statusSaving}
              onChange={(e) => handleStatusChange(e.target.value)}
              title="Update lead status"
            >
              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <button
              className={`cd-active-toggle ${client.activeStatus}`}
              disabled={statusSaving}
              onClick={handleActiveStatusToggle}
              title="Toggle whether this client is active or a past (dead) client"
            >
              <Activity size={13} strokeWidth={2.2} /> {client.activeStatus === "active" ? "Active" : "Dead"}
            </button>
            {client.hasLoginAccess && (
              <span className="login-access-badge">
                <CheckCircle2 size={13} strokeWidth={2.4} /> Portal
              </span>
            )}
          </div>

          <div className="cdx-group">
            <div className="cdx-group-title">Contact</div>
            <KV label="Phone" value={client.phone} href={client.phone ? `tel:${client.phone}` : undefined} />
            <KV label="Email" value={client.email} href={client.email ? `mailto:${client.email}` : undefined} />
            <KV label="Contact Person" value={client.contactPerson} />
            <KV label="Designation" value={client.designation} />
          </div>

          <div className="cdx-group">
            <div className="cdx-group-title">Business &amp; Lead</div>
            <KV label="Client Type" value={client.clientType} cap />
            <KV label="Category" value={clientCategoryLabel(client.businessCategory)} />
            <KV label="Deals In" value={client.projectType} cap />
            <KV label="GST No." value={client.gstNo} />
            <KV label="TAN No." value={client.tanNo} />
            <KV label="Lead Source" value={client.leadSource} cap />
            <KV label="Sales Person" value={salesName || "Unassigned"} />
            <KV label="Lead Status" value={statusLabel} />
          </div>

          {(addressLine || client.projectName || client.totalAmount > 0) && (
            <div className="cdx-group">
              <div className="cdx-group-title">Address &amp; Project</div>
              <KV label="Address" value={addressLine} />
              <KV label="Project" value={client.projectName} />
              {client.totalAmount > 0 && <KV label="Total Amount" value={fmtINR(client.totalAmount)} />}
            </div>
          )}

          <div className="cdx-group">
            <div className="cdx-group-title">Record</div>
            <KV label="Portal" value={client.hasLoginAccess ? `Enabled · ${client.email}` : "Not enabled"} />
            {client.hasLoginAccess && <KV label="Account Created" value={fmtDate(client.onboardedAt)} />}
            <KV label="Created" value={fmtDate(client.createdAt)} />
            <KV label="Updated" value={fmtDate(client.updatedAt)} />
          </div>

          {client.notes && (
            <div className="cdx-group">
              <div className="cdx-group-title">Notes</div>
              <p className="cdx-notes">{client.notes}</p>
            </div>
          )}

          {customFields.length > 0 && (
            <div className="cdx-group">
              <div className="cdx-group-title">Custom Information</div>
              {customFields.map(([key, value]) => (
                <KV key={key} label={key} value={typeof value === "object" ? JSON.stringify(value) : String(value)} />
              ))}
            </div>
          )}

          {emptyCount > 0 && (
            <button type="button" className="cdx-empty-hint" onClick={() => { setFormType("client"); setShowForm(true); }}>
              {emptyCount} detail{emptyCount === 1 ? "" : "s"} not filled — <strong>Edit to add</strong>
            </button>
          )}
        </aside>

        {/* ═══ Right: everything else, one page ═══ */}
        <main className="cdx-main">
          <div className="cdx-kpis">
            <div className="cdx-kpi"><span>Contracts</span><strong>{contracts.length}</strong></div>
            <div className="cdx-kpi"><span>Total Value</span><strong>{fmtINR(totalProjectValue)}</strong></div>
            <div className="cdx-kpi green"><span>Received</span><strong>{fmtINR(totalReceived)}</strong></div>
            <div className="cdx-kpi amber"><span>Due</span><strong>{fmtINR(totalDue)}</strong></div>
            <div className={`cdx-kpi ${overdueCount ? "red" : ""}`}><span>Overdue</span><strong>{overdueCount}</strong></div>
            {totalTds > 0 && <div className="cdx-kpi"><span>TDS (records)</span><strong>{fmtINR(totalTds)}</strong></div>}
          </div>

          <nav className="cdx-nav" aria-label="Jump to section">
            {sectionNav.map((n) => (
              <button key={n.id} type="button" onClick={() => scrollToSection(n.id)}>
                {n.label} <span>{n.count}</span>
              </button>
            ))}
          </nav>

          {/* ── Contracts ── */}
          <Block
            id="contracts"
            Icon={FileText}
            title="Contracts"
            count={contracts.length}
            actions={
              <>
                {contracts.length > 0 && (
                  <button className="btn-secondary cdx-btn" onClick={() => setShowRenewPicker(true)}>
                    <RefreshCw size={13} strokeWidth={2.4} /> Renew
                  </button>
                )}
                <button className="btn-primary cdx-btn" onClick={() => navigate(`/clients/${clientId}/contracts/new`)}>
                  <Plus size={13} strokeWidth={2.4} /> New Contract
                </button>
              </>
            }
          >
            {contracts.length === 0 ? (
              <EmptyState message="No contracts yet" />
            ) : (
              <div className="table-container cdx-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Contract</th>
                      <th>Period</th>
                      <th>Amount</th>
                      <th>Received</th>
                      <th>Balance</th>
                      <th>Due Date</th>
                      <th>PI</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contracts.map((contract) => {
                      const piUrl = contract.piAttachment?.filename ? `${piBaseUrl}/uploads/${contract.piAttachment.filename}` : null;
                      const overdue = contract.nextDueDate && contract.dueAmount > 0 && new Date(contract.nextDueDate) < now;
                      return (
                        <tr key={contract._id}>
                          <td className="cdx-muted">{contract.contractNumber}</td>
                          <td className="cdx-strong">
                            {contract.projectName}
                            <PackageStars packageType={contract.packageType} style={{ marginLeft: 7 }} />
                          </td>
                          <td className="cdx-nowrap">{fmtDate(contract.contractStartDate)} → {fmtDate(contract.validUntil)}</td>
                          <td className="cdx-nowrap">{fmtINR(contract.projectAmount)}</td>
                          <td className="cdx-nowrap">{fmtINR(contract.receivedAmount || 0)}</td>
                          <td className="cdx-nowrap cdx-strong">{fmtINR(contract.dueAmount ?? contract.projectAmount)}</td>
                          <td className="cdx-nowrap">
                            {contract.nextDueDate
                              ? <span style={overdue ? { color: "#dc2626", fontWeight: 600 } : undefined}>{fmtDate(contract.nextDueDate)}</span>
                              : <span className="cd-pi-none">—</span>}
                          </td>
                          <td>
                            {piUrl ? (
                              <a href={piUrl} target="_blank" rel="noopener noreferrer" download={contract.piAttachment.originalname} className="btn-small" title={`Download ${contract.piAttachment.originalname}`}>
                                <Download size={14} strokeWidth={2.1} />
                              </a>
                            ) : (
                              <span className="cd-pi-none">—</span>
                            )}
                          </td>
                          <td>
                            <div className="action-buttons">
                              <button className="btn-small" title="View Full Details" onClick={() => { setManageContractId(contract._id); setManageContractTab(null); setManageContractDefaultTab("details"); }}>
                                <Eye size={14} strokeWidth={2.1} />
                              </button>
                              <button className="btn-small" title="Edit" onClick={() => navigate(`/clients/${clientId}/contracts/${contract._id}/edit`)}>
                                <Pencil size={14} strokeWidth={2.1} />
                              </button>
                              <button className="btn-small" title="Delete" onClick={() => handleDeleteContract(contract._id)}>
                                <Trash2 size={14} strokeWidth={2.1} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Block>

          {/* ── Deliverables ── */}
          <Block id="deliverables" Icon={Package} title="Deliverables" count={groupedDeliverables.length} subtitle="Click a row for item details">
            {groupedDeliverables.length === 0 ? (
              <EmptyState message="No deliverables defined yet" />
            ) : (
            <div className="table-container cdx-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th></th>
                    <th>Service</th>
                    <th>Contract</th>
                    <th>Items</th>
                    <th>Progress</th>
                    <th>Status</th>
                    <th>Manage</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedDeliverables.map((group) => {
                    const isExpanded = expandedDeliverableKey === group.key;
                    const quantityItems = group.items.filter((d) => d.trackingMode !== "status");
                    const totalDelivered = quantityItems.reduce((sum, d) => sum + (d.delivered || 0), 0);
                    const totalDue = quantityItems.reduce((sum, d) => sum + (d.due ?? d.quantity ?? 0), 0);
                    const statuses = new Set(group.items.map((d) => d.status || "Pending"));
                    const groupStatus = statuses.size === 1 ? [...statuses][0] : "Mixed";

                    return (
                      <React.Fragment key={group.key}>
                        <tr
                          className="data-row"
                          style={{ cursor: "pointer" }}
                          onClick={() => setExpandedDeliverableKey(isExpanded ? null : group.key)}
                        >
                          <td style={{ width: 24 }}>
                            {isExpanded ? <ChevronDown size={15} strokeWidth={2} /> : <ChevronRight size={15} strokeWidth={2} />}
                          </td>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              {(() => {
                                const cv = resolveCategoryVisual(group.categoryId);
                                const CvIcon = cv.Icon;
                                return (
                                  <div style={{ width: 24, height: 24, borderRadius: 7, background: `${cv.bg}22`, display: "grid", placeItems: "center", flexShrink: 0 }}>
                                    <CvIcon size={13} color={cv.bg} />
                                  </div>
                                );
                              })()}
                              {group.categoryLabel}
                            </div>
                          </td>
                          <td>{group._contractName}</td>
                          <td>{group.items.length} item{group.items.length !== 1 ? "s" : ""}</td>
                          <td>
                            {quantityItems.length > 0 ? (
                              <span>{totalDelivered}/{totalDue}</span>
                            ) : (
                              <span className="cd-pi-none">—</span>
                            )}
                          </td>
                          <td>
                            <span className={`status ${groupStatus.toLowerCase().replace(" ", "-")}`}>{groupStatus}</span>
                          </td>
                          <td>
                            <button
                              className="btn-small"
                              title="Manage Deliverables & Payments"
                              onClick={(e) => { e.stopPropagation(); setManageContractId(group._contractId); setManageContractTab("deliverables"); }}
                            >
                              <Package size={15} strokeWidth={2.1} />
                            </button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={7} style={{ padding: 0 }}>
                              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                  <tr>
                                    {["", "Item", "Platform", "Quantity", "Progress", "Status", "Proof"].map((h) => (
                                      <th key={h} style={{ textAlign: "left", padding: "8px 14px", fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.4, background: "#f8f9fc" }}>{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {group.items.map((d) => {
                                    const isQuantityMode = d.trackingMode !== "status";
                                    const prefix = `${group.categoryLabel} — `;
                                    const itemLabel = d.title?.startsWith(prefix) ? d.title.slice(prefix.length) : d.title;
                                    const visual = resolveDeliverableVisual(d.title, d.categoryId || group.categoryId);
                                    const VisualIcon = visual.Icon;
                                    const amount = formatDeliverableAmount(d);
                                    const noun = unitNoun(d.unit);
                                    return (
                                      <tr key={d._id} style={{ borderTop: "1px solid #f0f1f6" }}>
                                        <td style={{ padding: "8px 14px 8px 46px" }}>
                                          <div style={{ width: 22, height: 22, borderRadius: 6, background: `${visual.bg}`.startsWith("linear") ? visual.bg : `${visual.bg}22`, display: "grid", placeItems: "center" }}>
                                            <VisualIcon size={11} color={visual.bg.startsWith("linear") ? "#fff" : visual.bg} />
                                          </div>
                                        </td>
                                        <td style={{ padding: "8px 14px", fontSize: 13, color: "#0f172a" }}>{itemLabel}</td>
                                        <td style={{ padding: "8px 14px" }}>
                                          <div style={{ width: 22, height: 22, borderRadius: "50%", background: visual.bg, display: "grid", placeItems: "center" }}>
                                            <VisualIcon size={11} color="#fff" />
                                          </div>
                                        </td>
                                        <td style={{ padding: "8px 14px", fontSize: 13, color: "#64748b" }}>
                                          {amount}
                                        </td>
                                        <td style={{ padding: "8px 14px", fontSize: 13, color: "#64748b" }}>
                                          {isQuantityMode ? `${d.delivered || 0}/${d.due ?? d.quantity}${noun ? ` ${noun}` : ""}` : <span className="cd-pi-none">—</span>}
                                        </td>
                                        <td style={{ padding: "8px 14px" }}>
                                          {isQuantityMode ? (
                                            <span className={`status ${(d.status || "pending").toLowerCase().replace(" ", "-")}`}>{d.status || "Pending"}</span>
                                          ) : (
                                            <select
                                              value={d.status || "Pending"}
                                              disabled={deliverableStatusSaving === d._id}
                                              onChange={(e) => handleDeliverableStatusChange(d._contractId, d._id, e.target.value)}
                                            >
                                              <option value="Pending">Pending</option>
                                              <option value="In Progress">In Progress</option>
                                              <option value="Completed">Completed</option>
                                            </select>
                                          )}
                                        </td>
                                        <td style={{ padding: "8px 14px" }} onClick={(e) => e.stopPropagation()}>
                                          <ProofButton proofs={proofsForContractDeliverable(proofs, d._id)} onClick={() => setProofItem({ ...d, _label: `${group.categoryLabel} · ${itemLabel}` })} />
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            )}
          </Block>

          {/* ── Monthly reports (per contract service, per month) ── */}
          <Block id="reports" Icon={FileBarChart2} title="Monthly Reports" subtitle="Each service's report for the month — PDF, Word, Excel, CSV or Google Sheet">
            <ClientMonthlyReports clientId={clientId} />
          </Block>

          <div className="cdx-row">
            {/* ── Payments ── */}
            <Block
              id="payments"
              className="cdx-card--fixed"
              Icon={CreditCard}
              title="Payments"
              count={allPayments.length}
              actions={
                <>
                  {contracts.length > 1 && (
                    <select
                      className="cdx-select"
                      value={effectivePaymentContractId || ""}
                      onChange={(e) => setPaymentContractId(e.target.value)}
                      title="Choose which contract this payment update applies to"
                    >
                      {contracts.map((c) => (
                        <option key={c._id} value={c._id}>{c.projectName} ({c.contractNumber})</option>
                      ))}
                    </select>
                  )}
                  <button
                    className="btn-primary cdx-btn"
                    disabled={!effectivePaymentContractId}
                    title={!effectivePaymentContractId ? "Create a contract first" : ""}
                    onClick={() => { if (effectivePaymentContractId) { setManageContractId(effectivePaymentContractId); setManageContractTab("payments"); } }}
                  >
                    <Plus size={13} strokeWidth={2.4} /> Add Payment
                  </button>
                </>
              }
            >
              {allPayments.length === 0 ? (
                <div className="cdx-fill cdx-fill-center"><EmptyState message="No payments recorded yet" /></div>
              ) : (
            <div className="table-container cdx-scroll cdx-fill">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Contract</th>
                    <th>Amount</th>
                    <th>Mode</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {allPayments.map((p) => (
                    <tr key={p._id} className="data-row" onClick={() => { setManageContractId(p._contractId); setManageContractTab("payments"); }} style={{ cursor: "pointer" }}>
                      <td>{fmtDate(p.paymentDate)}</td>
                      <td>{p._contractName}</td>
                      <td>{fmtINR(p.amount)}</td>
                      <td>{p.method || "—"}</td>
                      <td>{p.notes || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
              )}
            </Block>

            {/* ── Remarks ── */}
            <Block id="remarks" className="cdx-card--fixed" Icon={MessageSquare} title="Remarks" count={remarks.length} subtitle="Admin, sales person & assigned user">
              {canManageRemarks && (
                <div className="cd-remark-composer">
                  <textarea
                    rows={3}
                    placeholder="Add a remark..."
                    value={remarkText}
                    onChange={(e) => setRemarkText(e.target.value)}
                  />
                  <button className="btn-primary" disabled={!remarkText.trim() || remarkSaving} onClick={handleAddRemark}>
                    {remarkSaving ? "Posting..." : "Post Remark"}
                  </button>
                </div>
              )}

              {remarks.length === 0 ? (
                <div className="cdx-fill cdx-fill-center"><EmptyState message="No remarks yet" /></div>
              ) : (
                <div className="cd-remark-feed cdx-fill">
                  {remarks.map((r) => (
                    <div key={r._id} className="cd-remark-card">
                      <div className="cd-remark-card-header">
                        <span className="cd-remark-name">{r.user?.name || "Unknown"}</span>
                        <span className="cd-remark-role">{r.role}</span>
                        <span className="cd-remark-time">{fmtDateTime(r.createdAt)}</span>
                      </div>
                      <p className="cd-remark-message">{r.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </Block>
          </div>

          {/* ── Activity ── */}
          <Block id="activity" Icon={History} title="Activity Timeline" count={activity.length}>
            {activity.length === 0 ? (
              <EmptyState message="No activity recorded yet" />
            ) : (
              <>
                <div className="cd-timeline cdx-timeline">
                  {visibleActivity.map((entry) => {
                    const meta = ACTIVITY_META[entry.type] || { Icon: Activity, color: "#94a3b8" };
                    return (
                      <div key={entry._id} className="cd-timeline-row">
                        <div className="cd-timeline-icon" style={{ background: `${meta.color}1a`, color: meta.color }}>
                          <meta.Icon size={14} strokeWidth={2.2} />
                        </div>
                        <div>
                          <div className="cd-timeline-message">{entry.message}</div>
                          <div className="cd-timeline-time">{fmtDateTime(entry.createdAt)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {activity.length > 8 && (
                  <button type="button" className="cdx-more" onClick={() => setShowAllActivity((v) => !v)}>
                    {showAllActivity ? "Show less" : `Show all ${activity.length}`}
                  </button>
                )}
              </>
            )}
          </Block>
        </main>
      </div>

      {/* ── modals ── */}
      {showForm && (
        <div className="modal-overlay" onClick={() => { if (formType !== "client") setShowForm(false); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setShowForm(false)}>
              <X size={18} strokeWidth={2} />
            </button>
            {formType === "client" && (
              <ClientForm client={client} onSuccess={handleFormSuccess} onCancel={() => setShowForm(false)} />
            )}
          </div>
        </div>
      )}

      {showRenewPicker && (
        <div className="modal-overlay" onClick={() => setShowRenewPicker(false)}>
          <div className="modal-content" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setShowRenewPicker(false)}>
              <X size={18} strokeWidth={2} />
            </button>
            <h2 style={{ margin: "0 0 4px", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 17, color: "#0f172a" }}>
              Renew Contract
            </h2>
            <p style={{ margin: "0 0 18px", fontSize: 13, color: "#64748b" }}>
              Pick which contract to renew — its services and pricing carry over into a new contract, and this one gets marked as renewed.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 360, overflowY: "auto" }}>
              {contracts.map((contract) => (
                <div
                  key={contract._id}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                    padding: "12px 14px", border: "1px solid #e8eaf0", borderRadius: 10,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13.5, color: "#0f172a" }}>{contract.projectName}</div>
                    <div style={{ fontSize: 11.5, color: "#94a3b8", marginTop: 2 }}>
                      {contract.contractNumber} · Ends {fmtDate(contract.validUntil)}
                      {contract.renewalStatus === "Completed" && " · Already renewed"}
                    </div>
                  </div>
                  <button
                    className="btn-primary"
                    style={{ flexShrink: 0, padding: "7px 14px", fontSize: 12.5 }}
                    onClick={() => navigate(`/clients/${clientId}/contracts/new?renewFrom=${contract._id}`)}
                  >
                    Renew
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {proofItem && (
        <ProofDialog
          title={proofItem._label}
          subtitle={`${proofItem._contractName ? `${proofItem._contractName} · ` : ""}${proofItem.trackingMode === "status" ? proofItem.status || "Pending" : `${proofItem.delivered || 0}/${proofItem.due ?? proofItem.quantity ?? 0} delivered`}`}
          proofs={proofsForContractDeliverable(proofs, proofItem._id)}
          onRemoved={removeProof}
          onClose={() => setProofItem(null)}
        />
      )}

      {manageContractId && (
        <div className="modal-overlay" onClick={() => { setManageContractId(null); setManageContractTab(null); setManageContractDefaultTab(null); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => { setManageContractId(null); setManageContractTab(null); setManageContractDefaultTab(null); }}>
              <X size={18} strokeWidth={2} />
            </button>
            <ContractDetail
              contractId={manageContractId}
              onlyTab={manageContractTab}
              defaultTab={manageContractDefaultTab}
              onClose={() => { setManageContractId(null); setManageContractTab(null); setManageContractDefaultTab(null); loadAll(); }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
