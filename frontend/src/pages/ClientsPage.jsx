import React, { useRef, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Users, FileText, Wallet, Plus, Search,
  Package, Pencil, Trash2, X, CheckCircle2, UserCheck, BellRing,
  Inbox, Activity, XCircle, Calendar, ChevronRight, ChevronLeft,
  TrendingUp, TrendingDown, LayoutGrid, List, Download, Upload,
  BarChart3, MoreHorizontal, Mail, Phone, User, Trophy, Zap,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import {
  getAllClients,
  getAllContracts,
  importClients,
  deleteContract,
  getAllReminders,
  deletePaymentReminder,
  bulkDeleteClients,
} from "../services/clientApi";
import ClientForm from "../components/ClientForm";
import PaymentReminderForm from "../components/PaymentReminderForm";
import ContractDetail from "./ContractDetail";
import DateRangePicker, { computeRangeForPreset } from "../components/DateRangePicker";
import "./ClientsPage.css";

const initials = (name = "") =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";

const fmtDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const CLIENT_TYPE_OPTIONS = ["pvt ltd", "ltd", "llp", "huf", "proprietor", "other"];

// Rotating accent per client card — a deterministic hash of the client's id
// so the same client always gets the same color, without every card in the
// grid looking identical.
const CARD_ACCENTS = ["#f7931e", "#2563eb", "#7c3aed", "#16a34a", "#db2777", "#0891b2"];
function accentFor(id = "") {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return CARD_ACCENTS[Math.abs(hash) % CARD_ACCENTS.length];
}

// Purely decorative trend swoosh — not tied to real per-day figures (we
// don't have that granularity client-side), so it carries no axis, labels,
// or numbers that could be mistaken for actual data.
function Sparkline({ id, color }) {
  return (
    <svg className="kpi-sparkline" viewBox="0 0 100 36" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={`spark-fill-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.32" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M0,30 C10,32 16,14 26,18 C36,22 40,8 52,12 C64,16 68,26 80,20 C88,16 92,6 100,10 L100,36 L0,36 Z" fill={`url(#spark-fill-${id})`} />
      <path d="M0,30 C10,32 16,14 26,18 C36,22 40,8 52,12 C64,16 68,26 80,20 C88,16 92,6 100,10" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

const STATUS_DONUT_META = {
  converted: { label: "Converted", color: "#16a34a" },
  open: { label: "Open", color: "#2563eb" },
  cold: { label: "Cold", color: "#7c3aed" },
  ni: { label: "Ni", color: "#db2777" },
};

const clientDate = (c) => new Date(c.onboardedAt || c.createdAt);

// "From last month" trend — counts clients (optionally matching a status predicate)
// onboarded in the current calendar month vs the previous one, using the same
// onboardedAt/createdAt field already used by the date-range filter on this page.
const monthOverMonthTrend = (clients, predicate = () => true) => {
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const thisMonthCount = clients.filter((c) => predicate(c) && clientDate(c) >= thisMonthStart).length;
  const lastMonthCount = clients.filter((c) => predicate(c) && clientDate(c) >= lastMonthStart && clientDate(c) < thisMonthStart).length;

  if (lastMonthCount === 0) return thisMonthCount > 0 ? { percent: 100, up: true } : { percent: 0, up: true };
  const percent = Math.round(((thisMonthCount - lastMonthCount) / lastMonthCount) * 100);
  return { percent: Math.abs(percent), up: percent >= 0 };
};

const exportClientsToCsv = (clients) => {
  const headers = ["Client Name", "Company", "Email", "Phone", "Status", "Sales Person", "Onboarded"];
  const rows = clients.map((c) => [
    c.clientName, c.companyName || "", c.email, c.phone, c.status,
    c.salesPerson?.name || c.salesPersonName || "", c.onboardedAt || c.createdAt || "",
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `clients-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

// `embedded`: rendered as the "Clients" tab inside AdminDashboard's own
// sidebar/topbar shell, instead of as its own standalone routed page — so
// it skips the page's own padding/background and "Back to Dashboard" link
// (redundant when the dashboard sidebar is already on screen).
const ClientsPage = ({ embedded = false } = {}) => {
  const navigate = useNavigate();
  const importInputRef = useRef(null);
  const [activeTab, setActiveTab] = useState("clients");
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedReminder, setSelectedReminder] = useState(null);
  const [manageContractId, setManageContractId] = useState(null);

  const [clients, setClients] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [statusFilter, setStatusFilter] = useState("all");
  const [clientTypeFilter, setClientTypeFilter] = useState("all");
  const [salesPersonFilter, setSalesPersonFilter] = useState("all");
  const [dateFilterActive, setDateFilterActive] = useState(false);
  const [dateRange, setDateRange] = useState({ ...computeRangeForPreset("thisMonth"), presetKey: "thisMonth" });
  const [viewMode, setViewMode] = useState("grid");
  const [showAllSalesPersons, setShowAllSalesPersons] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [selectedClientIds, setSelectedClientIds] = useState(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [clientsPage, setClientsPage] = useState(1);
  const CLIENTS_PAGE_SIZE = 24;
  const [donutRange, setDonutRange] = useState("month");
  const [openKpiMenu, setOpenKpiMenu] = useState(null);

  useEffect(() => {
    if (activeTab === "clients") {
      loadClients();
    } else if (activeTab === "contracts") {
      loadContracts();
    } else if (activeTab === "reminders") {
      loadReminders();
    }
  }, [activeTab]);

  // Any filter/search change re-slices the result set, so a page number
  // that made sense before may now be out of range (or just confusing) —
  // jump back to page 1 whenever the filters themselves change.
  useEffect(() => {
    setClientsPage(1);
  }, [searchTerm, statusFilter, clientTypeFilter, salesPersonFilter, dateFilterActive, dateRange]);

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

  const loadContracts = async () => {
    setLoading(true);
    try {
      const response = await getAllContracts();
      setContracts(response.data.contracts || []);
    } catch (error) {
      console.error("Error loading contracts:", error);
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

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);
    try {
      const response = await importClients(file);
      setImportResult({ ok: true, ...response.data.summary });
      await Promise.all([loadClients(), loadContracts()]);
    } catch (error) {
      setImportResult({
        ok: false,
        message: error.response?.data?.message || "Import failed",
      });
    } finally {
      setImporting(false);
      event.target.value = "";
    }
  };


  const handleAddContract = () => {
    setActiveTab("clients");
    alert("Select a client to create a contract for.");
  };

  const handleEditContract = (contract) => {
    const contractClientId = contract.clientId?._id || contract.clientId;
    navigate(`/clients/${contractClientId}/contracts/${contract._id}/edit`);
  };

  const handleDeleteContract = async (id) => {
    if (window.confirm("Are you sure you want to delete this contract?")) {
      try {
        await deleteContract(id);
        alert("Contract deleted successfully");
        loadContracts();
      } catch (error) {
        alert("Error deleting contract");
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

  const toggleClientSelected = (id) => {
    setSelectedClientIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // "Select all" is scoped to the current page, not every filtered result —
  // with lists running into the hundreds, a single checkbox silently
  // queuing all of them for deletion would be an easy way to nuke far more
  // than intended.
  const toggleSelectAllVisible = () => {
    setSelectedClientIds((prev) => {
      const allVisibleSelected = paginatedClients.length > 0 && paginatedClients.every((c) => prev.has(c._id));
      if (allVisibleSelected) return new Set();
      return new Set(paginatedClients.map((c) => c._id));
    });
  };

  // Explicit opt-in (a separate click after the page is fully selected) to
  // select every client matching the current filters, not just this page.
  const selectAllFilteredClients = () => {
    setSelectedClientIds(new Set(filteredClients.map((c) => c._id)));
  };

  const handleBulkDeleteClients = async () => {
    const count = selectedClientIds.size;
    if (count === 0) return;
    if (!window.confirm(`Delete ${count} selected client${count === 1 ? "" : "s"}? This also removes their contracts, reminders, and activity history. This cannot be undone.`)) {
      return;
    }
    setBulkDeleting(true);
    try {
      // The backend caps a single request at 200 ids (so a bulk-select-all
      // UI can't fire one unbounded, slow, all-or-nothing delete) — chunk
      // larger selections into sequential batches instead of raising that cap.
      const allIds = Array.from(selectedClientIds);
      const BATCH_SIZE = 200;
      let deletedCount = 0;
      const failedIds = [];
      for (let i = 0; i < allIds.length; i += BATCH_SIZE) {
        const batch = allIds.slice(i, i + BATCH_SIZE);
        const { data } = await bulkDeleteClients(batch);
        deletedCount += data.deletedCount || 0;
        if (data.failedIds?.length) failedIds.push(...data.failedIds);
      }
      alert(`${deletedCount} client${deletedCount === 1 ? "" : "s"} deleted${failedIds.length ? `, ${failedIds.length} failed` : ""}`);
      setSelectedClientIds(new Set());
      await loadClients();
    } catch (error) {
      alert(error.response?.data?.message || "Error deleting clients");
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    if (formType === "client") {
      loadClients();
    } else if (formType === "reminder") {
      loadReminders();
    }
  };

  // Sales person can be a real User (keyed by _id) or a free-text name typed
  // for someone not added as a User yet (keyed by "name:<name>" so it can't
  // collide with an ObjectId) — both need to show up as filterable options.
  const salesPersonOptions = Array.from(
    new Map(
      clients
        .map((c) => (c.salesPerson ? [c.salesPerson._id, c.salesPerson.name] : c.salesPersonName ? [`name:${c.salesPersonName}`, c.salesPersonName] : null))
        .filter(Boolean)
    ).entries()
  );

  const filteredClients = clients.filter((client) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch = !q
      || client.clientName.toLowerCase().includes(q)
      || client.email.toLowerCase().includes(q)
      || (client.companyName || "").toLowerCase().includes(q)
      || (client.phone || "").toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || client.status === statusFilter;
    const matchesClientType = clientTypeFilter === "all" || client.clientType === clientTypeFilter;
    const matchesSalesPerson = salesPersonFilter === "all"
      || client.salesPerson?._id === salesPersonFilter
      || `name:${client.salesPersonName}` === salesPersonFilter;
    const matchesDate = !dateFilterActive || (() => {
      const onboarded = new Date(client.onboardedAt || client.createdAt);
      return onboarded >= dateRange.start && onboarded <= dateRange.end;
    })();
    return matchesSearch && matchesStatus && matchesClientType && matchesSalesPerson && matchesDate;
  });

  // Rendering all matching clients at once (this list can run into the
  // hundreds) made the page one long unbroken scroll — page it instead.
  const clientsTotalPages = Math.max(1, Math.ceil(filteredClients.length / CLIENTS_PAGE_SIZE));
  const paginatedClients = filteredClients.slice(
    (clientsPage - 1) * CLIENTS_PAGE_SIZE,
    clientsPage * CLIENTS_PAGE_SIZE
  );
  const allPageSelected = paginatedClients.length > 0 && paginatedClients.every((c) => selectedClientIds.has(c._id));
  const allFilteredSelected = filteredClients.length > 0 && filteredClients.every((c) => selectedClientIds.has(c._id));

  const openLeadsCount = clients.filter((c) => c.status === "open").length;
  const convertedClientsCount = clients.filter((c) => c.status === "converted").length;
  const activeClientsCount = clients.filter((c) => c.status === "converted" && c.activeStatus === "active").length;
  const closedLeadsCount = clients.filter((c) =>  c.status === "ni").length;
  const coldLeadsCount = clients.filter((c)=> c.status ==="cold").length;
  const pendingRemindersCount = reminders.filter((r) => r.reminderStatus !== "paid").length;
  const portalAccessCount = clients.filter((c) => c.hasLoginAccess).length;

  const totalTrend = monthOverMonthTrend(clients);
  const openTrend = monthOverMonthTrend(clients, (c) => c.status === "open");
  const convertedTrend = monthOverMonthTrend(clients, (c) => c.status === "converted");
  const coldTrend = monthOverMonthTrend(clients, (c) => c.status === "cold");

  // "This Month" / "This Year" / "All Time" narrows the donut to clients
  // onboarded in that window — a real filter, not a decorative label.
  const donutScopedClients = clients.filter((c) => {
    if (donutRange === "all") return true;
    const d = clientDate(c);
    const now = new Date();
    if (donutRange === "year") return d.getFullYear() === now.getFullYear();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });
  const statusBreakdown = Object.keys(STATUS_DONUT_META)
    .map((key) => ({
      key,
      ...STATUS_DONUT_META[key],
      count: donutScopedClients.filter((c) => c.status === key).length,
    }))
    .filter((s) => s.count > 0);
  const statusBreakdownTotal = statusBreakdown.reduce((sum, s) => sum + s.count, 0);

  const salesPersonLeaderboard = Array.from(
    clients.reduce((map, c) => {
      const key = c.salesPerson?._id || (c.salesPersonName ? `name:${c.salesPersonName}` : null);
      const name = c.salesPerson?.name || c.salesPersonName;
      if (!key || !name) return map;
      map.set(key, { name, count: (map.get(key)?.count || 0) + 1 });
      return map;
    }, new Map())
  )
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.count - a.count);
  const salesPersonLeaderboardTotal = salesPersonLeaderboard.reduce((sum, sp) => sum + sp.count, 0);
  const visibleSalesPersons = showAllSalesPersons ? salesPersonLeaderboard : salesPersonLeaderboard.slice(0, 3);
  const LEADERBOARD_BAR_COLORS = ["#16a34a", "#2563eb", "#7c3aed", "#db2777", "#0891b2", "#f7931e"];

  const filteredContracts = contracts.filter(
    (contract) =>
      contract.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.clientId?.clientName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredReminders = reminders.filter(
    (reminder) =>
      reminder.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reminder.clientId?.clientName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={embedded ? "clients-page clients-page-embedded" : "clients-page"}>
      <div className="page-header">
        {!embedded && (
          <Link to="/admin" className="back-link">
            <ArrowLeft size={15} strokeWidth={2.2} /> Back to Dashboard
          </Link>
        )}
        <div className="page-header-row">
          <div>
            <div className="page-eyebrow">Client Management</div>
            <h1>Clients Overview</h1>
            <p>Manage your clients, send contracts, and track payments — all in one place.</p>
          </div>
        </div>
      </div>

      <div className="overview-layout">
        <div className="overview-main">
          <div className="kpi-grid kpi-trend-grid">
            {[
              { key: "orange", Icon: Users, label: "Total Clients", value: clients.length, trend: totalTrend },
              { key: "blue", Icon: Inbox, label: "Open Leads", value: openLeadsCount, trend: openTrend },
              { key: "green", Icon: UserCheck, label: "Converted Clients", value: convertedClientsCount, trend: convertedTrend },
              { key: "pink", Icon: Activity, label: "Cold Clients", value: coldLeadsCount, trend: coldTrend },
            ].map(({ key, Icon, label, value, trend }) => (
              <div key={key} className={`kpi-card kpi-${key}`}>
                <div className="kpi-card-top">
                  <div className="kpi-icon"><Icon size={19} strokeWidth={2} /></div>
                  <div className="kpi-menu-wrap">
                    <button
                      type="button"
                      className="kpi-menu-btn"
                      onClick={() => setOpenKpiMenu((m) => (m === key ? null : key))}
                    >
                      <MoreHorizontal size={15} strokeWidth={2.2} />
                    </button>
                    {openKpiMenu === key && (
                      <div className="kpi-menu-dropdown" onMouseLeave={() => setOpenKpiMenu(null)}>
                        <button type="button" onClick={() => { exportClientsToCsv(clients); setOpenKpiMenu(null); }}>
                          <Download size={13} strokeWidth={2.2} /> Export list
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="kpi-value">{value}</div>
                <div className="kpi-label">{label}</div>
                <div className={`kpi-trend ${trend.up ? "trend-up" : "trend-down"}`}>
                  {trend.up ? <TrendingUp size={12} strokeWidth={2.4} /> : <TrendingDown size={12} strokeWidth={2.4} />}
                  {trend.percent}% from last month
                </div>
                <Sparkline id={key} color={{ orange: "#f7931e", blue: "#2563eb", green: "#16a34a", pink: "#db2777" }[key]} />
              </div>
            ))}
          </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setShowForm(false)}>
              <X size={18} strokeWidth={2} />
            </button>
            {formType === "client" && (
              <ClientForm
                client={selectedClient}
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

      {manageContractId && (
        <div className="modal-overlay" onClick={() => setManageContractId(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setManageContractId(null)}>
              <X size={18} strokeWidth={2} />
            </button>
            <ContractDetail contractId={manageContractId} onClose={() => setManageContractId(null)} />
          </div>
        </div>
      )}

      <div className="status-pills">
        {[
          { key: "all", label: "All Clients", count: clients.length },
          { key: "converted", label: "Converted", count: convertedClientsCount },
          { key: "open", label: "Open Leads", count: openLeadsCount },
          { key: "cold", label: "Cold Clients", count: coldLeadsCount },
        ].map((p) => (
          <button
            key={p.key}
            className={`status-pill ${statusFilter === p.key ? "active" : ""}`}
            onClick={() => setStatusFilter(p.key)}
          >
            {p.label} <span className="status-pill-count">{p.count}</span>
          </button>
        ))}
      </div>

      <div className="tab-content">
        {/* CLIENTS TAB */}
        {activeTab === "clients" && (
          <div className="clients-section">
            <div className="section-header">
              <div className="search-box">
                <Search size={15} strokeWidth={2.2} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search clients by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button className="btn-primary" onClick={handleAddClient}>
                <Plus size={15} strokeWidth={2.4} /> Add New Client
              </button>
              <input
                ref={importInputRef}
                type="file"
                accept=".csv,.xls,.xlsx,.numbers"
                onChange={handleImportFile}
                style={{ display: "none" }}
              />
              <button className="btn-secondary import-clients-btn" onClick={() => importInputRef.current?.click()} disabled={importing}>
                <Upload size={15} strokeWidth={2.4} /> {importing ? "Importing..." : "Import"}
              </button>
            </div>

            {importResult && (
              <div className={`import-result ${importResult.ok ? "success" : "error"}`}>
                {importResult.ok ? (
                  <>
                    <div className="import-result-title">Import completed</div>
                    <div className="import-result-grid">
                      <span>Total rows: <strong>{importResult.totalRows}</strong></span>
                      <span>Clients created: <strong>{importResult.clientsCreated}</strong></span>
                      <span>Existing used: <strong>{importResult.existingClientsUsed}</strong></span>
                      <span>Contracts created: <strong>{importResult.contractsCreated}</strong></span>
                      <span>Skipped: <strong>{importResult.skippedRows}</strong></span>
                    </div>
                    {importResult.errors?.length > 0 && (
                      <div className="import-errors">
                        {importResult.errors.slice(0, 5).map((error) => (
                          <div key={`${error.row}-${error.message}`}>Row {error.row}: {error.message}</div>
                        ))}
                        {importResult.errors.length > 5 && <div>+{importResult.errors.length - 5} more rows skipped</div>}
                      </div>
                    )}
                  </>
                ) : (
                  <div>{importResult.message}</div>
                )}
              </div>
            )}

            <div className="filter-bar">
              <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">All Status</option>
                <option value="open">Open</option>
                <option value="converted">Converted</option>
                <option value="cold">Cold</option>
                <option value="ni">Not Interested</option>
              </select>
              <select className="filter-select" value={clientTypeFilter} onChange={(e) => setClientTypeFilter(e.target.value)}>
                <option value="all">All Client Types</option>
                {CLIENT_TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <select className="filter-select" value={salesPersonFilter} onChange={(e) => setSalesPersonFilter(e.target.value)}>
                <option value="all">All Sales Persons</option>
                {salesPersonOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
              </select>
              <div className="filter-date">
                <DateRangePicker value={dateRange} onChange={(range) => { setDateRange(range); setDateFilterActive(true); }} />
                {dateFilterActive && (
                  <button className="filter-date-clear" onClick={() => setDateFilterActive(false)}>
                    <X size={12} strokeWidth={2.4} /> Clear date
                  </button>
                )}
              </div>
              <div className="view-toggle">
                <button
                  className={`view-toggle-btn ${viewMode === "grid" ? "active" : ""}`}
                  title="Grid view"
                  onClick={() => setViewMode("grid")}
                >
                  <LayoutGrid size={15} strokeWidth={2.2} />
                </button>
                <button
                  className={`view-toggle-btn ${viewMode === "list" ? "active" : ""}`}
                  title="List view"
                  onClick={() => setViewMode("list")}
                >
                  <List size={15} strokeWidth={2.2} />
                </button>
              </div>
            </div>

            {paginatedClients.length > 0 && (
              <label className="select-all-row">
                <input
                  type="checkbox"
                  checked={paginatedClients.length > 0 && paginatedClients.every((c) => selectedClientIds.has(c._id))}
                  onChange={toggleSelectAllVisible}
                />
                Select all {paginatedClients.length} on this page
                {allPageSelected && filteredClients.length > paginatedClients.length && (
                  allFilteredSelected ? (
                    <button type="button" className="select-all-expand" onClick={() => setSelectedClientIds(new Set())}>
                      All {filteredClients.length} selected — Clear
                    </button>
                  ) : (
                    <button type="button" className="select-all-expand" onClick={selectAllFilteredClients}>
                      Select all {filteredClients.length} matching clients
                    </button>
                  )
                )}
              </label>
            )}

            {selectedClientIds.size > 0 && (
              <div className="bulk-action-bar">
                <span className="bulk-action-bar-count">
                  <CheckCircle2 size={16} strokeWidth={2.2} />
                  {selectedClientIds.size} client{selectedClientIds.size === 1 ? "" : "s"} selected
                </span>
                <div className="bulk-action-bar-actions">
                  <button className="bulk-action-bar-clear" onClick={() => setSelectedClientIds(new Set())}>
                    Clear selection
                  </button>
                  <button className="btn-danger" onClick={handleBulkDeleteClients} disabled={bulkDeleting}>
                    <Trash2 size={14} strokeWidth={2.2} /> {bulkDeleting ? "Deleting..." : "Delete Selected"}
                  </button>
                </div>
              </div>
            )}

            {loading ? (
              <div className="loading">Loading clients...</div>
            ) : filteredClients.length === 0 ? (
              <div className="empty-state">
                <p>No clients found. Start by adding a new client!</p>
              </div>
            ) : viewMode === "grid" ? (
              <div className="clients-grid">
                {paginatedClients.map((client) => (
                  <div
                    key={client._id}
                    className="client-card client-card-clickable"
                    style={{ "--card-accent": accentFor(client._id) }}
                    onClick={() => navigate(`/clients/${client._id}`)}
                  >
                    <div className="card-header">
                      <div className="client-identity">
                        <div className="client-avatar">{initials(client.clientName)}</div>
                        <div>
                          <h3>{client.companyName || client.clientName}</h3>
                          {client.companyName && <div className="client-company">{client.clientName}</div>}
                          {client.clientType && <div className="client-type">{client.clientType.replace(/\b\w/g, (c) => c.toUpperCase())}</div>}
                        </div>
                      </div>
                      <div className="card-header-actions">
                        <span className={`status ${client.status}`}><i className="status-dot" />{client.status}</span>
                        <input
                          type="checkbox"
                          className="client-select-checkbox"
                          checked={selectedClientIds.has(client._id)}
                          onClick={(e) => e.stopPropagation()}
                          onChange={() => toggleClientSelected(client._id)}
                        />
                      </div>
                    </div>
                    <div className="card-body">
                      {client.contactPerson && (
                        <p><User size={13} strokeWidth={2} /> {client.contactPerson}</p>
                      )}
                      <p><Mail size={13} strokeWidth={2} /> {client.email}</p>
                      <p><Phone size={13} strokeWidth={2} /> {client.phone}</p>
                      {client.hasLoginAccess && (
                        <p className="login-access-badge">
                          <CheckCircle2 size={13} strokeWidth={2.4} /> Portal access enabled
                        </p>
                      )}
                    </div>
                    <div className="card-footer card-footer-meta">
                      <span className="last-updated"><Calendar size={12} strokeWidth={2} /> Updated {fmtDate(client.updatedAt)}</span>
                      <span className="card-arrow">
                        View details <ChevronRight size={13} strokeWidth={2.4} />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th className="checkbox-col">
                        <input
                          type="checkbox"
                          className="list-select-checkbox"
                          checked={paginatedClients.length > 0 && paginatedClients.every((c) => selectedClientIds.has(c._id))}
                          onChange={toggleSelectAllVisible}
                        />
                      </th>
                      <th>Client</th>
                      <th>Contact</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Status</th>
                      <th>Portal</th>
                      <th>Updated</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedClients.map((client) => (
                      <tr key={client._id} className="data-row" onClick={() => navigate(`/clients/${client._id}`)} style={{ cursor: "pointer" }}>
                        <td className="checkbox-col" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="list-select-checkbox"
                            checked={selectedClientIds.has(client._id)}
                            onChange={() => toggleClientSelected(client._id)}
                          />
                        </td>
                        <td>
                          <div className="client-identity">
                            <div className="client-avatar" style={{ width: 32, height: 32, fontSize: 12 }}>{initials(client.clientName)}</div>
                            <div>
                              <div style={{ fontWeight: 700, color: "#0f172a" }}>{client.companyName || client.clientName}</div>
                              {client.companyName && <div className="client-company">{client.clientName}</div>}
                            </div>
                          </div>
                        </td>
                        <td>{client.contactPerson || "—"}</td>
                        <td>{client.email}</td>
                        <td>{client.phone}</td>
                        <td><span className={`status ${client.status}`}>{client.status}</span></td>
                        <td>{client.hasLoginAccess ? <CheckCircle2 size={15} strokeWidth={2.2} color="#16a34a" /> : "—"}</td>
                        <td>{fmtDate(client.updatedAt)}</td>
                        <td><span className="card-arrow">View details <ChevronRight size={13} strokeWidth={2.4} /></span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!loading && filteredClients.length > CLIENTS_PAGE_SIZE && (
              <div className="clients-pagination">
                <span className="clients-pagination-summary">
                  Showing {(clientsPage - 1) * CLIENTS_PAGE_SIZE + 1}–{Math.min(clientsPage * CLIENTS_PAGE_SIZE, filteredClients.length)} of {filteredClients.length}
                </span>
                <div className="clients-pagination-controls">
                  <button
                    className="pagination-btn"
                    disabled={clientsPage === 1}
                    onClick={() => setClientsPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft size={14} strokeWidth={2.4} /> Previous
                  </button>
                  <span className="clients-pagination-page">Page {clientsPage} of {clientsTotalPages}</span>
                  <button
                    className="pagination-btn"
                    disabled={clientsPage === clientsTotalPages}
                    onClick={() => setClientsPage((p) => Math.min(clientsTotalPages, p + 1))}
                  >
                    Next <ChevronRight size={14} strokeWidth={2.4} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* CONTRACTS TAB */}
        {activeTab === "contracts" && (
          <div className="contracts-section">
            <div className="section-header">
              <div className="search-box">
                <Search size={15} strokeWidth={2.2} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search contracts by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button className="btn-primary" onClick={() => handleAddContract()}>
                <Plus size={15} strokeWidth={2.4} />Add New Contract
              </button>
            </div>

            {loading ? (
              <div className="loading">Loading contracts...</div>
            ) : filteredContracts.length === 0 ? (
              <div className="empty-state">
                <p>No contracts found. Create one to get started!</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Contract #</th>
                      <th>Project</th>
                      <th>Client</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Valid Until</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredContracts.map((contract) => (
                      <tr key={contract._id}>
                        <td>{contract.contractNumber}</td>
                        <td>{contract.projectName}</td>
                        <td>{contract.clientId?.clientName || "N/A"}</td>
                        <td>
                          {contract.projectAmount} {contract.currency}
                        </td>
                        <td>
                          <span className={`status ${contract.contractStatus}`}>
                            {contract.contractStatus}
                          </span>
                        </td>
                        <td>
                          {contract.validUntil
                            ? new Date(contract.validUntil).toLocaleDateString("en-IN")
                            : "N/A"}
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button
                              className="btn-small"
                              onClick={() => setManageContractId(contract._id)}
                              title="Manage Deliverables & Payments"
                            >
                              <Package size={15} strokeWidth={2.1} />
                            </button>
                            <button
                              className="btn-small"
                              onClick={() => handleEditContract(contract)}
                              title="Edit"
                            >
                              <Pencil size={15} strokeWidth={2.1} />
                            </button>
                            <button
                              className="btn-small"
                              onClick={() => handleDeleteContract(contract._id)}
                              title="Delete"
                            >
                              <Trash2 size={15} strokeWidth={2.1} />
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
                <Search size={15} strokeWidth={2.2} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search reminders..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button className="btn-primary" onClick={() => handleAddReminder()}>
                <Plus size={15} strokeWidth={2.4} /> Create Reminder
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
                              <Pencil size={15} strokeWidth={2.1} />
                            </button>
                            <button
                              className="btn-small"
                              onClick={() => handleDeleteReminder(reminder._id)}
                              title="Delete"
                            >
                              <Trash2 size={15} strokeWidth={2.1} />
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

        <aside className="overview-sidebar">
          <div className="sidebar-panel">
            <div className="sidebar-panel-header">
              <h3 className="sidebar-panel-title">Clients by Status</h3>
              <select className="donut-range-select" value={donutRange} onChange={(e) => setDonutRange(e.target.value)}>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
                <option value="all">All Time</option>
              </select>
            </div>
            {statusBreakdownTotal === 0 ? (
              <div className="empty-state" style={{ padding: "28px 14px" }}>
                <p>No client data yet</p>
              </div>
            ) : (
              <div className="donut-wrap">
                <div className="donut-chart">
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie
                        data={statusBreakdown}
                        dataKey="count"
                        nameKey="label"
                        innerRadius={48}
                        outerRadius={72}
                        paddingAngle={2}
                        startAngle={90}
                        endAngle={-270}
                      >
                        {statusBreakdown.map((s) => <Cell key={s.key} fill={s.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="donut-center">
                    <span className="donut-center-value">{statusBreakdownTotal}</span>
                    <span className="donut-center-label">Total</span>
                  </div>
                </div>
                <div className="donut-legend">
                  {statusBreakdown.map((s) => (
                    <div key={s.key} className="donut-legend-row">
                      <span className="donut-legend-dot" style={{ background: s.color }} />
                      <span className="donut-legend-label">{s.label}</span>
                      <span className="donut-legend-count">
                        {s.count} ({Math.round((s.count / statusBreakdownTotal) * 100)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="sidebar-panel">
            <h3 className="sidebar-panel-title">Quick Actions</h3>
            <div className="quick-actions-list">
              <button className="quick-action-btn" onClick={handleAddClient}>
                <span className="quick-action-icon quick-action-orange"><Users size={16} strokeWidth={2.1} /></span>
                Add New Client
              </button>
              <button className="quick-action-btn" onClick={() => importInputRef.current?.click()} disabled={importing}>
                <span className="quick-action-icon quick-action-green"><Upload size={16} strokeWidth={2.1} /></span>
                {importing ? "Importing..." : "Import Clients"}
              </button>
              <button className="quick-action-btn" onClick={() => exportClientsToCsv(clients)}>
                <span className="quick-action-icon quick-action-green"><Download size={16} strokeWidth={2.1} /></span>
                Export Clients
              </button>
              <button className="quick-action-btn" onClick={() => alert("Client Reports is coming soon")}>
                <span className="quick-action-icon quick-action-blue"><BarChart3 size={16} strokeWidth={2.1} /></span>
                Client Reports
              </button>
            </div>
          </div>

          <div className="sidebar-panel">
            <h3 className="sidebar-panel-title">Top Sales Persons</h3>
            {salesPersonLeaderboard.length === 0 ? (
              <div className="empty-state" style={{ padding: "28px 14px" }}>
                <p>No sales persons assigned yet</p>
              </div>
            ) : (
              <>
                <div className="leaderboard-list">
                  {visibleSalesPersons.map((sp, i) => (
                    <div key={sp.id} className="leaderboard-row">
                      <span className="leaderboard-rank">{i + 1}</span>
                      <div>
                        <div className="leaderboard-name">{sp.name}</div>
                        <div className="leaderboard-count">{sp.count} Client{sp.count !== 1 ? "s" : ""}</div>
                      </div>
                    </div>
                  ))}
                </div>
                {salesPersonLeaderboard.length > 3 && (
                  <button className="sidebar-view-all" onClick={() => setShowAllSalesPersons((v) => !v)}>
                    {showAllSalesPersons ? "Show less" : "View All"} <ChevronRight size={13} strokeWidth={2.4} />
                  </button>
                )}
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default ClientsPage;
