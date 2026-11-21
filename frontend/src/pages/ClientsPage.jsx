import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowRight, ArrowUpRight, BarChart3, Calendar, CheckCircle2, ChevronLeft, ChevronRight, Download,
  FileText, Inbox, LayoutGrid, List, Mail, MapPin, Phone, PieChart as PieIcon, Plus, Search,
  Snowflake, Trash2, Trophy, Upload, UserCheck, Users, X,
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { getAllClients, importClients, bulkDeleteClients } from "../services/clientApi";
import ClientForm from "../components/ClientForm";
import ContractClientPicker from "../components/ContractClientPicker";
import DateRangePicker, { computeRangeForPreset } from "../components/DateRangePicker";
import { CLIENT_CATEGORIES, clientCategoryLabel } from "../config/clientCategories";
// ClientsPage.css also styles shared classes other pages use (.btn-primary,
// .data-table, .modal-overlay, .status …) — keep importing it.
import "./ClientsPage.css";
import "./ClientsOverview.css";

const PAGE_SIZE = 24;
const VIEW_STORAGE_KEY = "crm_clients_view";
const MONTHS_SHOWN = 6;

// One palette for every status, used by the KPI cards, donut, bar chart and chips.
const STATUS_META = {
  open: { label: "Open Leads", short: "Open", color: "#2563eb", bg: "#e8efff" },
  converted: { label: "Converted", short: "Converted", color: "#16a34a", bg: "#dcfce7" },
  cold: { label: "Cold", short: "Cold", color: "#7c3aed", bg: "#f1ebff" },
  ni: { label: "Not Interested", short: "Not Interested", color: "#e11d48", bg: "#ffe4e9" },
};
const STATUS_KEYS = Object.keys(STATUS_META);

const CLIENT_TYPE_OPTIONS = ["pvt ltd", "ltd", "llp", "huf", "proprietor", "other"];
const TYPE_LABELS = { "pvt ltd": "Pvt Ltd", ltd: "Ltd", llp: "LLP", huf: "HUF", proprietor: "Proprietor", other: "Other" };
const titleCase = (v = "") => v.replace(/\b\w/g, (c) => c.toUpperCase());

const initials = (name = "") =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";

const fmtDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

const plural = (n, word) => `${n.toLocaleString("en-IN")} ${word}${n === 1 ? "" : "s"}`;

// Deterministic avatar colour per client, so the same client always looks the same.
const AVATAR_COLORS = ["#ea580c", "#2563eb", "#7c3aed", "#16a34a", "#db2777", "#0891b2"];
function accentFor(id = "") {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

const clientDate = (c) => new Date(c.onboardedAt || c.createdAt);
const salesKey = (c) => c.salesPerson?._id || (c.salesPersonName ? `name:${c.salesPersonName}` : null);
const salesName = (c) => c.salesPerson?.name || c.salesPersonName || "";

/** Month buckets (oldest → current) for the trend charts. */
function lastMonths(now, count = MONTHS_SHOWN) {
  return Array.from({ length: count }, (_, i) => {
    const start = new Date(now.getFullYear(), now.getMonth() - (count - 1 - i), 1);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    return { start, end, label: start.toLocaleDateString("en-IN", { month: "short" }) };
  });
}

const exportClientsToCsv = (rows) => {
  const headers = ["Client Name", "Company", "Email", "Phone", "Status", "Client Type", "Category", "Lead Source", "Sales Person", "City", "Onboarded"];
  const data = rows.map((c) => [
    c.clientName, c.companyName || "", c.email || "", c.phone || "", STATUS_META[c.status]?.label || c.status || "",
    TYPE_LABELS[c.clientType] || c.clientType || "", clientCategoryLabel(c.businessCategory), c.leadSource || "", salesName(c), c.city || "",
    c.onboardedAt || c.createdAt ? clientDate(c).toISOString().slice(0, 10) : "",
  ]);
  const csv = [headers, ...data]
    .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `clients-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

// ── Small building blocks ───────────────────────────────────────────────────
function CardTitle({ Icon, color, bg, children, sub }) {
  return (
    <div className="cl-card-title">
      <span className="cl-icon-box" style={{ background: bg }}><Icon size={15} color={color} strokeWidth={2.2} /></span>
      <span className="cl-card-title-text">
        {children}
        {sub && <small>{sub}</small>}
      </span>
    </div>
  );
}

function StatusChip({ status }) {
  const meta = STATUS_META[status] || { short: status || "—", color: "#64748b", bg: "#f1f5f9" };
  return (
    <span className="cl-status" style={{ color: meta.color, background: meta.bg }}>
      <i style={{ background: meta.color }} />{meta.short}
    </span>
  );
}

function Avatar({ client, size = 34 }) {
  const color = accentFor(client._id);
  return (
    <span className="cl-avatar" style={{ width: size, height: size, color, background: `${color}17`, fontSize: size * 0.36 }}>
      {initials(client.companyName || client.clientName)}
    </span>
  );
}

/** Client type on top, lead source under it; either one alone if the other is blank. */
function TypeSource({ client }) {
  const type = TYPE_LABELS[client.clientType] || (client.clientType ? titleCase(client.clientType) : "");
  const source = client.leadSource ? titleCase(client.leadSource) : "";
  if (!type && !source) return <span className="cl-muted">—</span>;
  return (
    <div className="cl-stack">
      <span>{type || source}</span>
      {type && source && <span className="cl-muted">{source}</span>}
    </div>
  );
}

function Sparkline({ data, color, id }) {
  if (!data.some((d) => d.value)) return null;
  return (
    <div className="cl-spark" aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 5, left: 3, bottom: 1 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <Area
            type="monotone" dataKey="value" stroke={color} strokeWidth={2.4} strokeLinejoin="round"
            fill={`url(#${id})`} dot={{ r: 2.6, fill: color, stroke: color, strokeWidth: 0 }} activeDot={false}
            baseValue={0} isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function KpiHero({ tone, Icon, iconColor, iconBg, label, value, added, trend, sparkColor, active, onClick }) {
  return (
    <button type="button" className={`cl-hero cl-hero-${tone}${active ? " is-active" : ""}`} onClick={onClick} aria-pressed={active}>
      <span className="cl-hero-icon" style={{ background: iconBg }}><Icon size={22} color={iconColor} strokeWidth={2.2} /></span>
      <span className="cl-hero-body">
        <span className="cl-hero-label">{label}</span>
        <span className="cl-hero-main">
          <span className="cl-hero-figures">
            <span className="cl-hero-value">{value.toLocaleString("en-IN")}</span>
            <span className={`cl-hero-meta${added ? " is-up" : ""}`}>
              {added > 0 && <ArrowUpRight size={13} strokeWidth={2.4} />}
              <b>+{added}</b> this month
            </span>
          </span>
          <Sparkline data={trend} color={sparkColor} id={`clSpark-${tone}`} />
        </span>
      </span>
    </button>
  );
}

function MonthTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((sum, p) => sum + (p.value || 0), 0);
  return (
    <div className="cl-tooltip">
      <div className="cl-tooltip-title">{label} · {plural(total, "client")}</div>
      {[...payload].reverse().map((p) => (
        <div key={p.dataKey} className="cl-tooltip-row">
          <i style={{ background: p.color }} />{STATUS_META[p.dataKey]?.label}<b>{p.value}</b>
        </div>
      ))}
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────
// `embedded`: rendered inside AdminDashboard's shell (which already supplies
// padding/background). Sales and staff dashboards render it without.
const ClientsPage = ({ embedded = false } = {}) => {
  const navigate = useNavigate();
  const importInputRef = useRef(null);
  const directoryRef = useRef(null);
  const [now] = useState(() => new Date());
  const [isSalesView] = useState(() => localStorage.getItem("role") === "sales");

  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showContractPicker, setShowContractPicker] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [clientTypeFilter, setClientTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [salesPersonFilter, setSalesPersonFilter] = useState("all");
  const [dateRange, setDateRange] = useState(() => ({ ...computeRangeForPreset("thisMonth"), presetKey: "all" }));
  const [viewMode, setViewMode] = useState(() => {
    try { return localStorage.getItem(VIEW_STORAGE_KEY) === "grid" ? "grid" : "list"; } catch { return "list"; }
  });
  const [donutRange, setDonutRange] = useState("all");
  const [showAllSalesPersons, setShowAllSalesPersons] = useState(false);
  const [selectedClientIds, setSelectedClientIds] = useState(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // The page number belongs to one set of filters: change any filter and the
  // list starts again from page 1.
  const filterKey = [searchTerm, statusFilter, clientTypeFilter, categoryFilter, salesPersonFilter, dateRange.presetKey, +dateRange.start, +dateRange.end].join("|");
  const [pageState, setPageState] = useState({ key: filterKey, page: 1 });
  const page = pageState.key === filterKey ? pageState.page : 1;
  const setPage = (p) => setPageState({ key: filterKey, page: p });

  const dateFilterActive = dateRange.presetKey !== "all";

  const loadClients = async () => {
    setLoading(true);
    try {
      const response = await getAllClients();
      setClients(response.data.clients || []);
    } catch (error) {
      console.error("Error loading clients:", error);
      toast.error(error.response?.data?.message || "Couldn't load clients");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadClients(); }, []);

  const changeView = (mode) => {
    setViewMode(mode);
    try { localStorage.setItem(VIEW_STORAGE_KEY, mode); } catch { /* per-browser convenience only */ }
  };

  const scrollToDirectory = () =>
    requestAnimationFrame(() => directoryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));

  const filterByStatus = (status) => { setStatusFilter(status); scrollToDirectory(); };
  const filterBySalesPerson = (id) => { setSalesPersonFilter(id); scrollToDirectory(); };

  const handleAddClient = () => setShowForm(true);
  const handleAddContract = () => setShowContractPicker(true);

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const response = await importClients(file);
      setImportResult({ ok: true, ...response.data.summary });
      await loadClients();
    } catch (error) {
      setImportResult({ ok: false, message: error.response?.data?.message || "Import failed" });
    } finally {
      setImporting(false);
      event.target.value = "";
    }
  };

  const handleFormSuccess = (savedClient, intent) => {
    setShowForm(false);
    // "Save & create contract" — continue straight into the contract builder.
    if (intent === "contract" && savedClient?._id) {
      navigate(`/clients/${savedClient._id}/contracts/new`);
      return;
    }
    loadClients();
  };

  // ── Derived data ──────────────────────────────────────────────────────────
  const counts = useMemo(() => {
    const c = { all: clients.length };
    STATUS_KEYS.forEach((k) => { c[k] = clients.filter((cl) => cl.status === k).length; });
    return c;
  }, [clients]);

  const months = useMemo(() => lastMonths(now), [now]);
  const thisMonthStart = months[months.length - 1].start;

  // KPI cards: running total at the end of each month (ends at the big number),
  // so the last rise of the sparkline is exactly the "+N this month" beside it.
  const kpi = useMemo(() => {
    const build = (pred) => ({
      value: clients.filter(pred).length,
      added: clients.filter((c) => pred(c) && clientDate(c) >= thisMonthStart).length,
      trend: months.map((m) => ({ value: clients.filter((c) => pred(c) && clientDate(c) < m.end).length })),
    });
    return {
      total: build(() => true),
      open: build((c) => c.status === "open"),
      converted: build((c) => c.status === "converted"),
      lost: build((c) => c.status === "cold" || c.status === "ni"),
    };
  }, [clients, months, thisMonthStart]);

  const monthlyAdds = useMemo(() => months.map((m) => {
    const row = { label: m.label };
    STATUS_KEYS.forEach((k) => {
      row[k] = clients.filter((c) => c.status === k && clientDate(c) >= m.start && clientDate(c) < m.end).length;
    });
    return row;
  }), [clients, months]);
  const addedInWindow = monthlyAdds.reduce((sum, r) => sum + STATUS_KEYS.reduce((s, k) => s + r[k], 0), 0);

  const donutClients = useMemo(() => clients.filter((c) => {
    if (donutRange === "all") return true;
    const d = clientDate(c);
    if (donutRange === "year") return d.getFullYear() === now.getFullYear();
    return d >= thisMonthStart;
  }), [clients, donutRange, now, thisMonthStart]);
  const statusBreakdown = STATUS_KEYS.map((key) => ({ key, ...STATUS_META[key], count: donutClients.filter((c) => c.status === key).length }));
  const donutTotal = statusBreakdown.reduce((sum, s) => sum + s.count, 0);
  const conversionRate = donutTotal ? Math.round(((statusBreakdown.find((s) => s.key === "converted")?.count || 0) / donutTotal) * 100) : 0;

  const salesPersonOptions = useMemo(() => Array.from(
    new Map(clients.map((c) => (salesKey(c) ? [salesKey(c), salesName(c)] : null)).filter(Boolean)).entries()
  ).sort((a, b) => a[1].localeCompare(b[1])), [clients]);

  const leaderboard = useMemo(() => Array.from(
    clients.reduce((map, c) => {
      const key = salesKey(c);
      if (!key) return map;
      const entry = map.get(key) || { id: key, name: salesName(c), count: 0, converted: 0 };
      entry.count += 1;
      if (c.status === "converted") entry.converted += 1;
      map.set(key, entry);
      return map;
    }, new Map()).values()
  ).sort((a, b) => b.count - a.count || b.converted - a.converted), [clients]);
  const unassignedCount = clients.filter((c) => !salesKey(c)).length;
  const showLeaderboard = leaderboard.length > 1;
  const visibleLeaders = showAllSalesPersons ? leaderboard : leaderboard.slice(0, 5);
  const topCount = leaderboard[0]?.count || 1;

  const filteredClients = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return clients.filter((client) => {
      const matchesSearch = !q || [client.clientName, client.companyName, client.email, client.phone, client.city]
        .some((v) => (v || "").toLowerCase().includes(q));
      const matchesStatus = statusFilter === "all" || client.status === statusFilter
        || (statusFilter === "lost" && (client.status === "cold" || client.status === "ni"));
      const matchesType = clientTypeFilter === "all" || client.clientType === clientTypeFilter;
      const matchesCategory = categoryFilter === "all" || client.businessCategory === categoryFilter;
      const matchesSales = salesPersonFilter === "all"
        || (salesPersonFilter === "none" ? !salesKey(client) : salesKey(client) === salesPersonFilter);
      const matchesDate = !dateFilterActive || (clientDate(client) >= dateRange.start && clientDate(client) <= dateRange.end);
      return matchesSearch && matchesStatus && matchesType && matchesCategory && matchesSales && matchesDate;
    });
  }, [clients, searchTerm, statusFilter, clientTypeFilter, categoryFilter, salesPersonFilter, dateFilterActive, dateRange]);

  const totalPages = Math.max(1, Math.ceil(filteredClients.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageClients = filteredClients.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const allPageSelected = pageClients.length > 0 && pageClients.every((c) => selectedClientIds.has(c._id));
  const allFilteredSelected = filteredClients.length > 0 && filteredClients.every((c) => selectedClientIds.has(c._id));
  const filtersActive = Boolean(searchTerm.trim()) || statusFilter !== "all" || clientTypeFilter !== "all" || categoryFilter !== "all" || salesPersonFilter !== "all" || dateFilterActive;

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setClientTypeFilter("all");
    setCategoryFilter("all");
    setSalesPersonFilter("all");
    setDateRange((r) => ({ ...r, presetKey: "all" }));
  };

  // ── Selection / bulk delete ─────────────────────────────────────────────────
  const toggleClientSelected = (id) => {
    setSelectedClientIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // "Select all" covers the current page only; selecting every matching client
  // is a separate, explicit click — so one checkbox can't queue hundreds for deletion.
  const toggleSelectPage = () => {
    setSelectedClientIds((prev) => (allPageSelected ? new Set([...prev].filter((id) => !pageClients.some((c) => c._id === id))) : new Set([...prev, ...pageClients.map((c) => c._id)])));
  };

  const handleBulkDeleteClients = async () => {
    const count = selectedClientIds.size;
    if (count === 0) return;
    if (!window.confirm(`Delete ${count} selected client${count === 1 ? "" : "s"}? This also removes their contracts, reminders, and activity history. This cannot be undone.`)) return;
    setBulkDeleting(true);
    try {
      // The backend caps one request at 200 ids — send larger selections in batches.
      const allIds = Array.from(selectedClientIds);
      let deletedCount = 0;
      const failedIds = [];
      for (let i = 0; i < allIds.length; i += 200) {
        const { data } = await bulkDeleteClients(allIds.slice(i, i + 200));
        deletedCount += data.deletedCount || 0;
        if (data.failedIds?.length) failedIds.push(...data.failedIds);
      }
      const message = `${plural(deletedCount, "client")} deleted${failedIds.length ? `, ${failedIds.length} failed` : ""}`;
      if (failedIds.length) toast.warning(message); else toast.success(message);
      setSelectedClientIds(new Set());
      await loadClients();
    } catch (error) {
      toast.error(error.response?.data?.message || "Error deleting clients");
    } finally {
      setBulkDeleting(false);
    }
  };

  const openClient = (id) => navigate(`/clients/${id}`);
  const subtitleFor = (c) => [c.companyName ? c.clientName : null, c.city].filter(Boolean).join(" · ");

  const tabs = [{ key: "all", label: "All Clients", color: "#0f172a" }, ...STATUS_KEYS.map((k) => ({ key: k, label: STATUS_META[k].label, color: STATUS_META[k].color }))];

  return (
    <div className={`cl-page${embedded ? "" : " cl-page-standalone"}`}>
      <input ref={importInputRef} type="file" accept=".csv,.xls,.xlsx,.numbers" onChange={handleImportFile} style={{ display: "none" }} />

      {/* ── Header ── */}
      <div className="cl-header">
        <div className="cl-title">
          <h2>Clients Overview</h2>
          <p>
            {loading ? "Loading your clients…" : <>{plural(counts.all, "client")} · <b>{kpi.total.added}</b> added this month · {conversionRate}% converted</>}
          </p>
        </div>
        <div className="cl-actions">
          <button type="button" className="cl-btn" onClick={() => exportClientsToCsv(filteredClients)} disabled={!filteredClients.length}
            title={filtersActive ? `Export the ${filteredClients.length} clients matching your filters` : "Export all clients to CSV"}>
            <Download size={15} strokeWidth={2.2} /> Export
          </button>
          <button type="button" className="cl-btn" onClick={() => importInputRef.current?.click()} disabled={importing}>
            <Upload size={15} strokeWidth={2.2} /> {importing ? "Importing…" : "Import"}
          </button>
          <button type="button" className="cl-btn cl-btn-soft" onClick={handleAddContract}>
            <FileText size={15} strokeWidth={2.2} /> New Contract
          </button>
          <button type="button" className="cl-btn cl-btn-primary" onClick={handleAddClient}>
            <Plus size={16} strokeWidth={2.5} /> Add Client
          </button>
        </div>
      </div>

      {importResult && (
        <div className={`cl-banner ${importResult.ok ? "is-ok" : "is-error"}`}>
          <div className="cl-banner-body">
            {importResult.ok ? (
              <>
                <b>Import completed</b>
                <span>{importResult.totalRows} rows · {importResult.clientsCreated} clients created · {importResult.existingClientsUsed} existing used · {importResult.contractsCreated} contracts created · {importResult.skippedRows} skipped</span>
                {importResult.errors?.length > 0 && (
                  <ul>
                    {importResult.errors.slice(0, 5).map((error) => <li key={`${error.row}-${error.message}`}>Row {error.row}: {error.message}</li>)}
                    {importResult.errors.length > 5 && <li>+{importResult.errors.length - 5} more rows skipped</li>}
                  </ul>
                )}
              </>
            ) : (
              <><b>Import failed</b><span>{importResult.message}</span></>
            )}
          </div>
          <button type="button" className="cl-banner-close" onClick={() => setImportResult(null)} aria-label="Dismiss"><X size={15} /></button>
        </div>
      )}

      {/* ── KPI cards ── */}
      <div className="cl-row cl-row-kpi">
        <KpiHero tone="orange" Icon={Users} iconColor="#ea580c" iconBg="#ffe2c7" label="Total Clients"
          value={kpi.total.value} added={kpi.total.added} trend={kpi.total.trend} sparkColor="#f08a2c"
          active={false} onClick={() => filterByStatus("all")} />
        <KpiHero tone="blue" Icon={Inbox} iconColor="#2563eb" iconBg="#d9e6fd" label="Open Leads"
          value={kpi.open.value} added={kpi.open.added} trend={kpi.open.trend} sparkColor="#2563eb"
          active={statusFilter === "open"} onClick={() => filterByStatus("open")} />
        <KpiHero tone="green" Icon={UserCheck} iconColor="#16a34a" iconBg="#d3f5df" label="Converted Clients"
          value={kpi.converted.value} added={kpi.converted.added} trend={kpi.converted.trend} sparkColor="#16a34a"
          active={statusFilter === "converted"} onClick={() => filterByStatus("converted")} />
        <KpiHero tone="purple" Icon={Snowflake} iconColor="#7c3aed" iconBg="#e9ddff" label="Cold / Not Interested"
          value={kpi.lost.value} added={kpi.lost.added} trend={kpi.lost.trend} sparkColor="#8b5cf6"
          active={statusFilter === "lost"} onClick={() => filterByStatus("lost")} />
      </div>

      {/* ── Insights ── */}
      <div className={`cl-row cl-row-insights${showLeaderboard ? "" : " no-leaders"}`}>
        <div className="cl-card">
          <div className="cl-card-head">
            <CardTitle Icon={PieIcon} color="#2563eb" bg="#e8efff">Clients by Status</CardTitle>
            <select className="cl-pill-select" value={donutRange} onChange={(e) => setDonutRange(e.target.value)} aria-label="Period">
              <option value="all">All Time</option>
              <option value="year">This Year</option>
              <option value="month">This Month</option>
            </select>
          </div>
          <div className="cl-donut-body">
            <div className="cl-donut">
              <PieChart width={124} height={124}>
                <Pie
                  data={donutTotal ? statusBreakdown.filter((s) => s.count) : [{ key: "empty", count: 1 }]}
                  dataKey="count" cx="50%" cy="50%" innerRadius={45} outerRadius={62}
                  startAngle={90} endAngle={-270} stroke="none" paddingAngle={donutTotal ? 2 : 0} isAnimationActive={false}
                >
                  {(donutTotal ? statusBreakdown.filter((s) => s.count) : [{ key: "empty" }]).map((s) => (
                    <Cell key={s.key} fill={s.color || "#e2e8f0"} />
                  ))}
                </Pie>
              </PieChart>
              <div className="cl-donut-center">
                <b>{donutTotal.toLocaleString("en-IN")}</b>
                <span>Clients</span>
              </div>
            </div>
            <div className="cl-legend">
              {statusBreakdown.map((s) => (
                <button key={s.key} type="button" className="cl-legend-row" onClick={() => filterByStatus(s.key)} title={`Show ${s.label.toLowerCase()}`}>
                  <i style={{ background: s.color }} />
                  <span className="cl-legend-label">{s.label}</span>
                  <span className="cl-legend-value">
                    <b>{s.count}</b>
                    <span>{donutTotal ? Math.round((s.count / donutTotal) * 100) : 0}%</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="cl-card">
          <div className="cl-card-head">
            <CardTitle Icon={BarChart3} color="#16a34a" bg="#dcfce7" sub={`${plural(addedInWindow, "client")} in ${MONTHS_SHOWN} months`}>New Clients by Month</CardTitle>
            <span className="cl-pill">Last {MONTHS_SHOWN} months</span>
          </div>
          <div className="cl-bars">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyAdds} margin={{ top: 8, right: 4, left: -18, bottom: 0 }} barCategoryGap="32%">
                <CartesianGrid vertical={false} stroke="#eef0f5" />
                <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: "#cbd5e1" }} tick={{ fill: "#64748b", fontSize: 11.5 }} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} width={40} />
                <Tooltip content={<MonthTooltip />} cursor={{ fill: "rgba(37,99,235,.06)" }} />
                {STATUS_KEYS.map((k, i) => (
                  <Bar key={k} dataKey={k} stackId="m" fill={STATUS_META[k].color} maxBarSize={34}
                    radius={i === STATUS_KEYS.length - 1 ? [4, 4, 0, 0] : 0} isAnimationActive={false} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="cl-mini-legend">
            {STATUS_KEYS.map((k) => <span key={k}><i style={{ background: STATUS_META[k].color }} />{STATUS_META[k].short}</span>)}
          </div>
        </div>

        {showLeaderboard && (
          <div className="cl-card">
            <div className="cl-card-head">
              <CardTitle Icon={Trophy} color="#d97706" bg="#fef3c7">Top Sales Persons</CardTitle>
              {leaderboard.length > 5 && (
                <button type="button" className="cl-link" onClick={() => setShowAllSalesPersons((v) => !v)}>
                  {showAllSalesPersons ? "Show less" : `View all ${leaderboard.length}`} <ArrowRight size={13} />
                </button>
              )}
            </div>
            <div className={`cl-leaders${showAllSalesPersons ? " is-expanded" : ""}`}>
              {visibleLeaders.map((sp, i) => (
                <button key={sp.id} type="button" className={`cl-leader${salesPersonFilter === sp.id ? " is-active" : ""}`} onClick={() => filterBySalesPerson(sp.id)} title={`Show ${sp.name}'s clients`}>
                  <span className={`cl-rank cl-rank-${i + 1}`}>{i + 1}</span>
                  <span className="cl-leader-body">
                    <span className="cl-leader-top">
                      <span className="cl-leader-name">{sp.name}</span>
                      <span className="cl-leader-count"><b>{sp.count}</b> {sp.count === 1 ? "client" : "clients"} · {sp.converted} won</span>
                    </span>
                    <span className="cl-leader-bar"><span style={{ width: `${Math.max(6, (sp.count / topCount) * 100)}%` }} /></span>
                  </span>
                </button>
              ))}
            </div>
            {unassignedCount > 0 && (
              <button type="button" className="cl-unassigned" onClick={() => filterBySalesPerson("none")}>
                {plural(unassignedCount, "client")} without a sales person <ArrowRight size={12} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Directory ── */}
      <div className="cl-card cl-directory" ref={directoryRef}>
        <div className="cl-card-head cl-dir-head">
          <CardTitle Icon={Users} color="#2563eb" bg="#e8efff"
            sub={loading ? "Loading…" : filtersActive ? `${filteredClients.length.toLocaleString("en-IN")} ${filteredClients.length === 1 ? "match" : "matches"} of ${counts.all.toLocaleString("en-IN")}` : plural(counts.all, "client")}>
            Client Directory
          </CardTitle>
          <div className="cl-view-toggle" role="group" aria-label="View">
            <button type="button" className={viewMode === "list" ? "is-active" : ""} title="List view" onClick={() => changeView("list")}><List size={15} strokeWidth={2.2} /></button>
            <button type="button" className={viewMode === "grid" ? "is-active" : ""} title="Card view" onClick={() => changeView("grid")}><LayoutGrid size={15} strokeWidth={2.2} /></button>
          </div>
        </div>

        <div className="cl-tabs" role="tablist">
          {tabs.map((t) => {
            // The "Cold / Not Interested" card filters to both statuses at once.
            const selected = statusFilter === t.key || (statusFilter === "lost" && (t.key === "cold" || t.key === "ni"));
            return (
            <button key={t.key} type="button" role="tab" aria-selected={selected}
              className={`cl-tab${selected ? " is-active" : ""}`} onClick={() => setStatusFilter(t.key)}
              style={{ "--tab-color": t.color }}>
              {t.key !== "all" && <i style={{ background: t.color }} />}
              {t.label}
              <span className="cl-tab-count">{counts[t.key] ?? 0}</span>
            </button>
            );
          })}
        </div>

        <div className="cl-toolbar">
          <label className="cl-search">
            <Search size={15} strokeWidth={2.2} />
            <input type="text" placeholder="Search name, company, email, phone or city…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            {searchTerm && <button type="button" onClick={() => setSearchTerm("")} aria-label="Clear search"><X size={14} /></button>}
          </label>
          <select className={`cl-select${clientTypeFilter !== "all" ? " is-set" : ""}`} value={clientTypeFilter} onChange={(e) => setClientTypeFilter(e.target.value)} aria-label="Client type">
            <option value="all">All client types</option>
            {CLIENT_TYPE_OPTIONS.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
          </select>
          <select className={`cl-select${categoryFilter !== "all" ? " is-set" : ""}`} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} aria-label="Category">
            <option value="all">All categories</option>
            {CLIENT_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          {salesPersonOptions.length > 1 && (
            <select className={`cl-select${salesPersonFilter !== "all" ? " is-set" : ""}`} value={salesPersonFilter} onChange={(e) => setSalesPersonFilter(e.target.value)} aria-label="Sales person">
              <option value="all">All sales persons</option>
              {salesPersonOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
              {unassignedCount > 0 && <option value="none">No sales person</option>}
            </select>
          )}
          <div className={`cl-date${dateFilterActive ? " is-set" : ""}`} title="Filter by onboarding date">
            <DateRangePicker value={dateRange} onChange={setDateRange} allLabel="Any onboarding date" />
          </div>
          {filtersActive && (
            <button type="button" className="cl-clear" onClick={clearFilters}><X size={13} strokeWidth={2.4} /> Clear filters</button>
          )}
        </div>

        {selectedClientIds.size > 0 && (
          <div className="cl-bulk">
            <span className="cl-bulk-count"><CheckCircle2 size={15} /> {plural(selectedClientIds.size, "client")} selected</span>
            {allPageSelected && filteredClients.length > pageClients.length && !allFilteredSelected && (
              <button type="button" className="cl-link" onClick={() => setSelectedClientIds(new Set(filteredClients.map((c) => c._id)))}>
                Select all {filteredClients.length} matching
              </button>
            )}
            <span className="cl-bulk-actions">
              <button type="button" className="cl-btn cl-btn-ghost" onClick={() => setSelectedClientIds(new Set())}>Clear</button>
              <button type="button" className="cl-btn cl-btn-danger" onClick={handleBulkDeleteClients} disabled={bulkDeleting}>
                <Trash2 size={14} strokeWidth={2.2} /> {bulkDeleting ? "Deleting…" : "Delete selected"}
              </button>
            </span>
          </div>
        )}

        {loading ? (
          <div className="cl-skeleton">
            {Array.from({ length: 6 }, (_, i) => <div key={i} className="cl-skeleton-row" />)}
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="cl-empty">
            <span className="cl-empty-icon"><Search size={20} /></span>
            <b>{clients.length ? "No clients match these filters" : "No clients yet"}</b>
            <p>{clients.length ? "Try a different search or clear the filters." : "Add your first client or import a spreadsheet to get started."}</p>
            {clients.length
              ? <button type="button" className="cl-btn" onClick={clearFilters}>Clear filters</button>
              : <button type="button" className="cl-btn cl-btn-primary" onClick={handleAddClient}><Plus size={15} /> Add Client</button>}
          </div>
        ) : viewMode === "list" ? (
          <div className="cl-table-wrap">
            <table className="cl-table">
              <thead>
                <tr>
                  <th className="cl-col-check">
                    <input type="checkbox" className="cl-check" checked={allPageSelected} onChange={toggleSelectPage} aria-label="Select all on this page" />
                  </th>
                  <th>Client</th>
                  <th>Contact</th>
                  {!isSalesView && <th>Sales Person</th>}
                  <th className="cl-col-type">Type / Source</th>
                  <th>Status</th>
                  <th className="cl-col-date">Onboarded</th>
                  <th aria-label="Open" />
                </tr>
              </thead>
              <tbody>
                {pageClients.map((client) => (
                  <tr key={client._id} className={selectedClientIds.has(client._id) ? "is-selected" : ""} onClick={() => openClient(client._id)}>
                    <td className="cl-col-check" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" className="cl-check" checked={selectedClientIds.has(client._id)} onChange={() => toggleClientSelected(client._id)} aria-label={`Select ${client.clientName}`} />
                    </td>
                    <td>
                      <div className="cl-identity">
                        <Avatar client={client} />
                        <div className="cl-identity-text">
                          <div className="cl-name" title={client.companyName || client.clientName}>
                            {client.companyName || client.clientName}
                            {client.hasLoginAccess && <CheckCircle2 size={13} color="#16a34a" strokeWidth={2.4} aria-label="Portal access" />}
                          </div>
                          {subtitleFor(client) && <div className="cl-sub">{subtitleFor(client)}</div>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="cl-contact">
                        <span><Phone size={12} />{client.phone || "—"}</span>
                        {client.email && <span className="cl-muted" title={client.email}><Mail size={12} />{client.email}</span>}
                      </div>
                    </td>
                    {!isSalesView && (
                      <td>{salesName(client) ? <span className="cl-person">{salesName(client)}</span> : <span className="cl-muted">Unassigned</span>}</td>
                    )}
                    <td className="cl-col-type"><TypeSource client={client} /></td>
                    <td><StatusChip status={client.status} /></td>
                    <td className="cl-nowrap cl-col-date">{fmtDate(client.onboardedAt || client.createdAt)}</td>
                    <td className="cl-col-go"><ChevronRight size={16} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <>
            <label className="cl-select-page">
              <input type="checkbox" className="cl-check" checked={allPageSelected} onChange={toggleSelectPage} />
              Select all {pageClients.length} on this page
            </label>
            <div className="cl-grid">
              {pageClients.map((client) => (
                <div key={client._id} role="button" tabIndex={0}
                  className={`cl-client-card${selectedClientIds.has(client._id) ? " is-selected" : ""}`}
                  onClick={() => openClient(client._id)}
                  onKeyDown={(e) => { if (e.key === "Enter") openClient(client._id); }}>
                  <div className="cl-cc-top">
                    <Avatar client={client} size={40} />
                    <div className="cl-identity-text">
                      <div className="cl-name" title={client.companyName || client.clientName}>{client.companyName || client.clientName}</div>
                      {subtitleFor(client) && <div className="cl-sub">{subtitleFor(client)}</div>}
                    </div>
                    <input type="checkbox" className="cl-check" checked={selectedClientIds.has(client._id)}
                      onClick={(e) => e.stopPropagation()} onChange={() => toggleClientSelected(client._id)} aria-label={`Select ${client.clientName}`} />
                  </div>
                  <div className="cl-cc-tags">
                    <StatusChip status={client.status} />
                    {client.clientType && <span className="cl-tag">{TYPE_LABELS[client.clientType] || titleCase(client.clientType)}</span>}
                    {client.businessCategory && <span className="cl-tag">{clientCategoryLabel(client.businessCategory)}</span>}
                    {client.hasLoginAccess && <span className="cl-tag cl-tag-green"><CheckCircle2 size={11} /> Portal</span>}
                  </div>
                  <div className="cl-cc-lines">
                    <span><Phone size={13} />{client.phone || "—"}</span>
                    <span title={client.email}><Mail size={13} />{client.email || <em>No email</em>}</span>
                    {(client.city || client.state) && <span><MapPin size={13} />{[client.city, client.state].filter(Boolean).join(", ")}</span>}
                  </div>
                  <div className="cl-cc-foot">
                    {isSalesView
                      ? <span title="Lead source">{client.leadSource ? titleCase(client.leadSource) : "—"}</span>
                      : <span title="Sales person"><Users size={12} />{salesName(client) || "Unassigned"}</span>}
                    <span title="Onboarded"><Calendar size={12} />{fmtDate(client.onboardedAt || client.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {!loading && filteredClients.length > PAGE_SIZE && (
          <div className="cl-pager">
            <span>Showing <b>{(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredClients.length)}</b> of {filteredClients.length}</span>
            <div className="cl-pager-controls">
              <button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={15} /> Prev</button>
              <span>Page {currentPage} of {totalPages}</span>
              <button type="button" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}>Next <ChevronRight size={15} /></button>
            </div>
          </div>
        )}
      </div>

      {showContractPicker && (
        <ContractClientPicker
          onClose={() => setShowContractPicker(false)}
          onAddClient={() => { setShowContractPicker(false); handleAddClient(); }}
        />
      )}

      {showForm && (
        <div className="modal-overlay">
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setShowForm(false)} aria-label="Close">
              <X size={18} strokeWidth={2} />
            </button>
            <ClientForm client={null} onSuccess={handleFormSuccess} onCancel={() => setShowForm(false)} />
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientsPage;
