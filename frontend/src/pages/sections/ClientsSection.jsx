import React, { useEffect, useState } from "react";
import {
  Menu, Plus, Users, FileText, Bell, User,
  Package, CheckCircle2, Hourglass, PieChart as PieChartIcon,
  IndianRupee, Wallet, AlertTriangle, ArrowRight, Inbox, TrendingUp,
  Briefcase, Landmark, Banknote, RefreshCw, Layers, ChevronDown, ChevronRight,
} from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { T, PROJECT_CHART_COLORS } from "./shared";
import DateRangePicker, { computeRangeForPreset } from "../../components/DateRangePicker";

const PURPLE = { color: "#f7931e", bg: "#fff4e6" };
const GREEN = { color: "#16a34a", bg: "#dcfce7" };
const ORANGE = { color: "#f59e0b", bg: "#fef3c7" };
const BLUE = { color: "#2563eb", bg: "#dbeafe" };
const RED = { color: "#dc2626", bg: "#fee2e2" };
const TEAL = { color: "#0891b2", bg: "#e0f7fa" };
const INDIGO = { color: "#4f46e5", bg: "#e0e7ff" };

const RENEWAL_STATUS_COLORS = {
  Upcoming: { color: "#2563eb", bg: "#dbeafe" },
  Overdue: { color: "#dc2626", bg: "#fee2e2" },
  Completed: { color: "#16a34a", bg: "#dcfce7" },
};

const STORAGE_KEY = "crm_dashboard_date_range";

function loadStoredRange() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const start = new Date(parsed.start);
      const end = new Date(parsed.end);
      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
        return { start, end, presetKey: parsed.presetKey || "custom" };
      }
    }
  } catch { /* fall through to default */ }
  return { ...computeRangeForPreset("thisMonth"), presetKey: "thisMonth" };
}

function Skeleton({ height = 16, width = "100%", radius = 6, style = {} }) {
  return <div style={{ height, width, borderRadius: radius, background: "linear-gradient(90deg,#eef0f4 25%,#f6f7fa 37%,#eef0f4 63%)", backgroundSize: "400% 100%", animation: "shimmer 1.4s ease infinite", ...style }} />;
}

function StatCard({ Icon, accent, label, value, caption, pillText, pillAccent, loading }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 16, padding: "20px 22px", boxShadow: "0 1px 3px rgba(0,0,0,.04)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, background: accent.bg, display: "grid", placeItems: "center" }}>
          <Icon size={19} color={accent.color} strokeWidth={2} />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 13, color: T.textSecondary, fontWeight: 500 }}>{label}</div>
          {loading ? <Skeleton height={22} width={60} style={{ marginTop: 4 }} /> : (
            <div style={{ fontSize: 22, fontWeight: 700, color: T.textPrimary, fontFamily: "'Inter', sans-serif", marginTop: 2 }}>{value}</div>
          )}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 14, borderTop: `1px solid ${T.borderLight}` }}>
        <span style={{ fontSize: 12, color: T.textMuted }}>{caption}</span>
        {loading ? <Skeleton height={18} width={50} radius={99} /> : (
          <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99, color: pillAccent.color, background: pillAccent.bg }}>{pillText}</span>
        )}
      </div>
    </div>
  );
}

function MiniTile({ Icon, accent, value, label, loading }) {
  return (
    <div style={{ background: accent.bg, borderRadius: 14, padding: "18px 16px", textAlign: "center" }}>
      <Icon size={22} color={accent.color} strokeWidth={2} style={{ margin: "0 auto 12px", display: "block" }} />
      {loading ? <Skeleton height={22} width="60%" style={{ margin: "0 auto" }} /> : (
        <div style={{ fontSize: 22, fontWeight: 700, color: T.textPrimary, fontFamily: "'Inter', sans-serif" }}>{value}</div>
      )}
      <div style={{ fontSize: 12.5, color: T.textSecondary, marginTop: 5 }}>{label}</div>
    </div>
  );
}

function SectionCard({ Icon, accent, title, subtitle, children, footer }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 16, padding: 22, boxShadow: "0 1px 3px rgba(0,0,0,.04)", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 18 }}>
        {Icon && (
          <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: accent.bg, display: "grid", placeItems: "center" }}>
            <Icon size={16} color={accent.color} strokeWidth={2} />
          </div>
        )}
        <div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: T.textPrimary }}>{title}</div>
          {subtitle && <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>{subtitle}</div>}
        </div>
      </div>
      <div style={{ flex: 1 }}>{children}</div>
      {footer && (
        <a href="/clients" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 18, paddingTop: 16, borderTop: `1px solid ${T.borderLight}`, fontSize: 12.5, fontWeight: 600, color: "#f7931e", textDecoration: "none" }}>
          {footer} <ArrowRight size={14} strokeWidth={2} />
        </a>
      )}
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div style={{ textAlign: "center", padding: "36px 20px", color: T.textMuted, fontSize: 13, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <Inbox size={28} strokeWidth={1.6} color={T.textMuted} />
      {message}
    </div>
  );
}

export default function ClientsSection({ clients = [], contracts = [], dashboardStats, fetchDashboardStats }) {
  const stats = dashboardStats || {};
  const userName = localStorage.getItem("userName") || "Admin";

  const [range, setRange] = useState(loadStoredRange);
  const [loadingStats, setLoadingStats] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState(null);
  const [filterClientId, setFilterClientId] = useState("");
  const [filterContractId, setFilterContractId] = useState("");
  const [expandedServiceId, setExpandedServiceId] = useState(null);

  useEffect(() => {
    setLoadingStats(true);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ start: range.start, end: range.end, presetKey: range.presetKey }));
    Promise.resolve(fetchDashboardStats?.({ start: range.start.toISOString(), end: range.end.toISOString() })).then(() => {
      setLoadingStats(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.start, range.end]);

  const hasData = stats.hasData;
  const totalContracts = stats.totalContracts || 0;
  // "Total Clients" / "Converted Clients" are headline counts of the current state
  // of the whole client base — they should match the real /clients page regardless
  // of the selected date range, not just clients *created* within that window
  // (which is what the date-scoped dashboard-stats endpoint returns). Contracts/
  // Reminders/Payments below are intentionally still scoped to the selected range.
  const totalClientsCount = clients.length;
  const convertedClientsCount = clients.filter((c) => c.status === "converted").length;
  const convertedClientsPercent = totalClientsCount
    ? Math.round((convertedClientsCount / totalClientsCount) * 100)
    : 0;

  const fmtINR = (v) => `₹${(v || 0).toLocaleString("en-IN")}`;
  const fmtRange = (d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const monthlyTrend = stats.monthlyTrend || [];
  const dailyTrend = stats.dailyTrend || [];

  const clientContractOptions = filterClientId
    ? contracts.filter((p) => String(p.clientId?._id || p.clientId) === filterClientId)
    : [];

  const deliverableView = (() => {
    let items = null;
    if (filterContractId) {
      const contract = contracts.find((p) => p._id === filterContractId);
      items = contract?.deliverables || [];
    } else if (filterClientId) {
      items = clientContractOptions.flatMap((p) => p.deliverables || []);
    }
    if (items === null) {
      return {
        total: stats.totalDeliverables || 0,
        completed: stats.completedDeliverables || 0,
        pending: stats.pendingDeliverables || 0,
        percent: stats.overallCompletionPercent || 0,
      };
    }
    const total = items.length;
    const completed = items.filter((d) => d.status === "Completed").length;
    const totalDue = items.reduce((sum, d) => sum + (d.due || d.quantity || 0), 0);
    const totalDelivered = items.reduce((sum, d) => sum + (d.delivered || 0), 0);
    return {
      total,
      completed,
      pending: total - completed,
      percent: totalDue > 0 ? Math.round((totalDelivered / totalDue) * 100) : 0,
    };
  })();

  // ── Service Wise Active Cases / Revenue Summary / Renewals ──────────────
  // All three come from the same date-scoped dashboard-stats response, so
  // they refresh automatically whenever `range` changes — no extra API calls.
  const serviceWiseActiveCases = stats.serviceWiseActiveCases || [];
  const revenueSummary = stats.revenueSummary || { total: 0, bank: 0, cash: 0 };
  const renewalCases = stats.renewalCases || [];

  const serviceBarData = serviceWiseActiveCases.map((s, i) => ({
    name: s.label,
    revenue: s.totalAmount,
    fill: PROJECT_CHART_COLORS[i % PROJECT_CHART_COLORS.length],
  }));
  const serviceCasesPieData = serviceWiseActiveCases.map((s, i) => ({
    name: s.label,
    value: s.activeCases,
    fill: PROJECT_CHART_COLORS[i % PROJECT_CHART_COLORS.length],
  }));
  return (
    <div className="fade-up">
      <style>{`@keyframes shimmer { 0% { background-position: 100% 0; } 100% { background-position: 0 0; } }`}</style>

      {/* ── Welcome header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22, flexWrap: "wrap", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          
          <div>
            <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 18, color: T.textPrimary }}>Welcome back, {userName}! 👋</h2>
            <p style={{ fontSize: 12.5, color: T.textMuted, marginTop: 3 }}>Here's what's happening with your business today.</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <DateRangePicker value={range} onChange={setRange} />
          <a href="/clients" style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 16px", background: "#f18b37", color: "#fff", borderRadius: 10, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
            <Plus size={15} strokeWidth={2.5} /> Clients Overview
          </a>
        </div>
      </div>

      {!loadingStats && hasData === false && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#fff4e6", border: "1px solid #fed7aa", borderRadius: 12, padding: "12px 16px", marginBottom: 18, fontSize: 13, color: "#92400e", fontWeight: 600 }}>
          <Inbox size={16} strokeWidth={2} /> No data available for the selected period — try a different date range.
        </div>
      )}

      {/* ── Top KPI row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 18 }}>
        <StatCard loading={loadingStats} Icon={Users} accent={PURPLE} label="Total Clients" value={totalClientsCount} caption="Converted clients" pillText={`${convertedClientsCount} Converted`} pillAccent={GREEN} />
        <StatCard loading={loadingStats} Icon={FileText} accent={GREEN} label="Contracts" value={totalContracts} caption="Total contracts" pillText={`${totalContracts} Total`} pillAccent={BLUE} />
        <StatCard loading={loadingStats} Icon={Bell} accent={ORANGE} label="Reminders" value={stats.totalReminders || 0} caption="Pending reminders" pillText={`${stats.pendingReminders || 0} Pending`} pillAccent={ORANGE} />
        <StatCard loading={loadingStats} Icon={User} accent={PURPLE} label="Converted Clients" value={convertedClientsCount} caption="Leads converted" pillText={`${convertedClientsPercent}%`} pillAccent={GREEN} />
      </div>

      {/* ── Deliverables / Payments ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 18, marginBottom: 18 }}>
        <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 16, padding: 22, boxShadow: "0 1px 3px rgba(0,0,0,.04)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: T.textPrimary }}>Scope of Work / Deliverables</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <select
                value={filterClientId}
                onChange={(e) => { setFilterClientId(e.target.value); setFilterContractId(""); }}
                style={{ padding: "7px 10px", borderRadius: 8, border: `1.5px solid ${T.inputBorder}`, fontSize: 12.5, background: "#fff", color: T.textPrimary, fontFamily: "inherit", cursor: "pointer" }}
              >
                <option value="">All Clients</option>
                {clients.map((c) => <option key={c._id} value={c._id}>{c.clientName}</option>)}
              </select>
              <select
                value={filterContractId}
                onChange={(e) => setFilterContractId(e.target.value)}
                disabled={!filterClientId}
                style={{ padding: "7px 10px", borderRadius: 8, border: `1.5px solid ${T.inputBorder}`, fontSize: 12.5, background: filterClientId ? "#fff" : "#f8f9fc", color: filterClientId ? T.textPrimary : T.textMuted, fontFamily: "inherit", cursor: filterClientId ? "pointer" : "not-allowed" }}
              >
                <option value="">All Contracts</option>
                {clientContractOptions.map((p) => <option key={p._id} value={p._id}>{p.projectName}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            <MiniTile loading={loadingStats} Icon={Package} accent={PURPLE} value={deliverableView.total} label="Total work" />
            <MiniTile loading={loadingStats} Icon={CheckCircle2} accent={GREEN} value={deliverableView.completed} label="Completed" />
            <MiniTile loading={loadingStats} Icon={Hourglass} accent={ORANGE} value={deliverableView.pending} label="Pending" />
            <MiniTile loading={loadingStats} Icon={PieChartIcon} accent={BLUE} value={`${deliverableView.percent}%`} label="Completion" />
          </div>
        </div>

        <SectionCard title="Payments Overview" >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            <MiniTile loading={loadingStats} Icon={IndianRupee} accent={GREEN} value={fmtINR(stats.totalRevenue)} label="Revenue" />
            <MiniTile loading={loadingStats} Icon={Wallet} accent={RED} value={fmtINR(stats.outstandingPayments)} label="Outstanding" />
            <MiniTile loading={loadingStats} Icon={AlertTriangle} accent={RED} value={stats.overduePayments || 0} label="Overdue" />
{/*             <MiniTile loading={loadingStats} Icon={CalendarCheck} accent={ORANGE} value={fmtINR(stats.collectedThisMonth)} label="Collected (payments dated in range)" />
 */}          </div>
        </SectionCard>
      </div>

      {/* ── Service Wise Active Cases / Revenue Summary ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 18, marginBottom: 18 }}>
        <SectionCard Icon={Layers} accent={TEAL} title="Service Wise Active Cases" subtitle="Excludes rejected/expired contracts">
          {loadingStats ? (
            <Skeleton height={160} radius={12} />
          ) : serviceWiseActiveCases.length === 0 ? (
            <EmptyState message="No active cases for the selected period" />
          ) : (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {serviceWiseActiveCases.map((s, i) => {
                  const isExpanded = expandedServiceId === s.categoryId;
                  return (
                    <div key={s.categoryId} style={{ borderRadius: 10, background: T.inputBg, overflow: "hidden" }}>
                      <div
                        onClick={() => setExpandedServiceId(isExpanded ? null : s.categoryId)}
                        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "10px 12px", cursor: "pointer" }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                          {isExpanded ? <ChevronDown size={14} color={T.textMuted} /> : <ChevronRight size={14} color={T.textMuted} />}
                          <span style={{ width: 8, height: 8, borderRadius: 99, flexShrink: 0, background: PROJECT_CHART_COLORS[i % PROJECT_CHART_COLORS.length] }} />
                          <span style={{ fontSize: 13, fontWeight: 600, color: T.textPrimary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.label}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
                          <span style={{ fontSize: 12.5, color: T.textMuted }}>{s.activeCases} case{s.activeCases === 1 ? "" : "s"}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary, minWidth: 90, textAlign: "right" }}>{fmtINR(s.totalAmount)}</span>
                        </div>
                      </div>
                      {isExpanded && (
                        <div style={{ padding: "0 12px 12px 34px" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                            <thead>
                              <tr>
                                {["Client", "Project", "Status", "Amount"].map((h) => (
                                  <th key={h} style={{ textAlign: h === "Amount" ? "right" : "left", padding: "4px 8px", fontSize: 10.5, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: 0.3 }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {(s.cases || []).map((c) => (
                                <tr key={c.contractId} style={{ borderTop: `1px solid ${T.borderLight}` }}>
                                  <td style={{ padding: "6px 8px", color: T.textPrimary, fontWeight: 600 }}>{c.companyName || c.clientName}</td>
                                  <td style={{ padding: "6px 8px", color: T.textSecondary }}>{c.projectName}</td>
                                  <td style={{ padding: "6px 8px", color: T.textSecondary, textTransform: "capitalize" }}>{c.contractStatus}</td>
                                  <td style={{ padding: "6px 8px", color: T.textPrimary, fontWeight: 600, textAlign: "right" }}>{fmtINR(c.amount)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16, paddingTop: 14, borderTop: `1px solid ${T.borderLight}` }}>
                <div>
                  <div style={{ fontSize: 11, color: T.textMuted }}>Total Active Cases</div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: T.textPrimary }}>{stats.totalActiveCases || 0}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 11, color: T.textMuted }}>Total Active Revenue</div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: "#f7931e" }}>{fmtINR(stats.totalActiveRevenue)}</div>
                </div>
              </div>
            </>
          )}
        </SectionCard>

        <SectionCard Icon={IndianRupee} accent={GREEN} title="Revenue Summary" subtitle="Paid transactions, grouped by payment mode">
          {loadingStats ? (
            <Skeleton height={110} radius={12} />
          ) : (
            <>
              <div style={{ textAlign: "center", marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: T.textMuted }}>Total Revenue</div>
                <div style={{ fontSize: 26, fontWeight: 700, color: T.textPrimary, fontFamily: "'Inter', sans-serif" }}>{fmtINR(revenueSummary.total)}</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
                <MiniTile loading={loadingStats} Icon={Landmark} accent={BLUE} value={fmtINR(revenueSummary.bank)} label="Bank" />
                <MiniTile loading={loadingStats} Icon={Banknote} accent={ORANGE} value={fmtINR(revenueSummary.cash)} label="Cash" />
              </div>
            </>
          )}
        </SectionCard>
      </div>

      {/* ── Renewal Cases ── */}
      <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 16, padding: 22, boxShadow: "0 1px 3px rgba(0,0,0,.04)", marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
          <div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: T.textPrimary }}>Renewal Cases</div>
            <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>Renewal date (Valid Until) within the selected range</div>
          </div>
          <div style={{ display: "flex", gap: 18 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: T.textMuted }}>Total Renewal Cases</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: T.textPrimary }}>{stats.totalRenewalCases || 0}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: T.textMuted }}>Total Renewal Revenue</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#f7931e" }}>{fmtINR(stats.totalRenewalRevenue)}</div>
            </div>
          </div>
        </div>

        {loadingStats ? (
          <Skeleton height={140} radius={12} />
        ) : renewalCases.length === 0 ? (
          <EmptyState message="No renewals due in the selected period" />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                  {["Client Name", "Service Name", "Renewal Date", "Renewal Amount", "Salesperson", "Status"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "8px 10px", fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: 0.4 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {renewalCases.map((r) => {
                  const statusAccent = RENEWAL_STATUS_COLORS[r.status] || RENEWAL_STATUS_COLORS.Upcoming;
                  return (
                    <tr key={r.contractId} style={{ borderBottom: `1px solid ${T.borderLight}` }}>
                      <td style={{ padding: "10px", color: T.textPrimary, fontWeight: 600 }}>{r.companyName || r.clientName}</td>
                      <td style={{ padding: "10px", color: T.textSecondary }}>{r.serviceName}</td>
                      <td style={{ padding: "10px", color: T.textSecondary }}>{fmtRange(r.renewalDate)}</td>
                      <td style={{ padding: "10px", color: T.textPrimary, fontWeight: 600 }}>{fmtINR(r.renewalAmount)}</td>
                      <td style={{ padding: "10px", color: T.textSecondary }}>{r.salesPerson}</td>
                      <td style={{ padding: "10px" }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99, color: statusAccent.color, background: statusAccent.bg }}>{r.status}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Service / Revenue distribution charts ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 18, marginBottom: 18 }}>
        <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 16, padding: 22, boxShadow: "0 1px 3px rgba(0,0,0,.04)" }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: T.textPrimary, marginBottom: 4 }}>Service Revenue</div>
          <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 16 }}>Active-case revenue by service</div>
          {loadingStats ? <Skeleton height={220} radius={12} /> : serviceBarData.length === 0 ? <EmptyState message="No data for the selected period" /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={serviceBarData} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid horizontal={false} stroke={T.borderLight} />
                <XAxis type="number" tick={{ fontSize: 11, fill: T.textMuted }} axisLine={false} tickLine={false} tickFormatter={(v) => (v >= 1000 ? `₹${Math.round(v / 1000)}k` : `₹${v}`)} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11.5, fill: T.textSecondary }} axisLine={false} tickLine={false} width={110} />
                <Tooltip formatter={(value) => `₹${Number(value).toLocaleString("en-IN")}`} contentStyle={{ borderRadius: 10, border: `1px solid ${T.border}`, fontSize: 12 }} />
                <Bar dataKey="revenue" name="Revenue" radius={[0, 5, 5, 0]} barSize={16}>
                  {serviceBarData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 16, padding: 22, boxShadow: "0 1px 3px rgba(0,0,0,.04)" }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: T.textPrimary, marginBottom: 4 }}>Service Wise Active Cases</div>
          <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 16 }}>Share of active cases by service</div>
          {loadingStats ? <Skeleton height={220} radius={12} /> : serviceCasesPieData.length === 0 ? <EmptyState message="No data for the selected period" /> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={serviceCasesPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                  {serviceCasesPieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 10, border: `1px solid ${T.border}`, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Revenue charts ── */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(360px, 2fr) minmax(300px, 1fr)", gap: 18 }}>
        <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 16, padding: 22, boxShadow: "0 1px 3px rgba(0,0,0,.04)", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 16 }}>
            <div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: T.textPrimary }}>Outstanding Overview</div>
              <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>Collected vs outstanding — last 8 months · click a bar for that month</div>
            </div>
            <div style={{ textAlign: "right" }}>
              {loadingStats ? <Skeleton height={26} width={120} /> : selectedMonth ? (
                <>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: T.textPrimary, marginBottom: 4 }}>
                    {selectedMonth.label} {selectedMonth.year}
                    <button onClick={() => setSelectedMonth(null)} style={{ marginLeft: 8, background: "none", border: "none", cursor: "pointer", color: "#f7931e", fontSize: 11, fontWeight: 700, padding: 0 }}>Clear</button>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#f7931e", fontFamily: "'Inter', sans-serif" }}>{fmtINR(selectedMonth.collected)}</div>
                  <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>Collected</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: T.textPrimary, fontFamily: "'Inter', sans-serif" }}>{fmtINR(selectedMonth.outstanding)}</div>
                  <div style={{ fontSize: 11, color: T.textMuted }}>Outstanding</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#f7931e", fontFamily: "'Inter', sans-serif" }}>{fmtINR(stats.trendTotalCollected)}</div>
                  <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>Collected (8 mo)</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: T.textPrimary, fontFamily: "'Inter', sans-serif" }}>{fmtINR(stats.trendTotalOutstanding)}</div>
                  <div style={{ fontSize: 11, color: T.textMuted }}>Outstanding (8 mo)</div>
                </>
              )}
            </div>
          </div>

          {loadingStats ? <Skeleton height={220} radius={12} /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyTrend} barGap={4}>
                <CartesianGrid vertical={false} stroke={T.borderLight} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: T.textMuted }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: T.textMuted }} axisLine={false} tickLine={false} width={48} tickFormatter={(v) => (v >= 1000 ? `₹${Math.round(v / 1000)}k` : `₹${v}`)} />
                <Tooltip formatter={(value) => `₹${Number(value).toLocaleString("en-IN")}`} contentStyle={{ borderRadius: 10, border: `1px solid ${T.border}`, fontSize: 12 }} />
                <Bar dataKey="collected" name="Collected" fill="#f7931e" radius={[5, 5, 0, 0]} barSize={14} cursor="pointer" onClick={(_, index) => setSelectedMonth(monthlyTrend[index])} />
                <Bar dataKey="outstanding" name="Outstanding" fill="#fde68a" radius={[5, 5, 0, 0]} barSize={14} cursor="pointer" onClick={(_, index) => setSelectedMonth(monthlyTrend[index])} />
              </BarChart>
            </ResponsiveContainer>
          )}

          <div style={{ display: "flex", gap: 18, marginTop: 6, fontSize: 12, color: T.textSecondary }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: "#f7931e", display: "inline-block" }} /> Collected</span>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: "#fde68a", display: "inline-block" }} /> Outstanding (new contracts)</span>
          </div>

       {/*    <a href="/clients" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 18, paddingTop: 16, borderTop: `1px solid ${T.borderLight}`, fontSize: 12.5, fontWeight: 600, color: "#f7931e", textDecoration: "none" }}>
            View Full Report <ArrowRight size={14} strokeWidth={2} />
          </a> */}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <SectionCard Icon={TrendingUp} accent={GREEN} title="Daily Collections" subtitle="Last 7 days · click a bar for that day">
            {loadingStats ? (
              <Skeleton height={110} radius={12} />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={110}>
                  <BarChart data={dailyTrend} barGap={2}>
                    <Tooltip formatter={(value) => `₹${Number(value).toLocaleString("en-IN")}`} contentStyle={{ borderRadius: 10, border: `1px solid ${T.border}`, fontSize: 12 }} />
                    <XAxis dataKey="label" tick={{ fontSize: 9.5, fill: T.textMuted }} axisLine={false} tickLine={false} />
                    <Bar dataKey="collected" name="Collected" radius={[4, 4, 0, 0]} barSize={16} cursor="pointer" onClick={(_, index) => setSelectedDayIndex(index)}>
                      {dailyTrend.map((entry, i) => {
                        const isActive = i === (selectedDayIndex ?? dailyTrend.length - 1);
                        return <Cell key={i} fill={isActive ? "#f7931e" : "#fde68a"} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div style={{ marginTop: 10, paddingTop: 12, borderTop: `1px solid ${T.borderLight}` }}>
                  {(() => {
                    const activeIndex = selectedDayIndex ?? dailyTrend.length - 1;
                    const activeDay = dailyTrend[activeIndex];
                    const isToday = activeIndex === dailyTrend.length - 1;
                    return (
                      <>
                        <div style={{ fontSize: 18, fontWeight: 700, color: T.textPrimary, fontFamily: "'Inter', sans-serif" }}>{fmtINR(activeDay?.collected)}</div>
                        <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 2 }}>
                          {isToday ? "Collected today" : `Collected on ${activeDay?.label}`}
                          {!isToday && (
                            <button onClick={() => setSelectedDayIndex(null)} style={{ marginLeft: 8, background: "none", border: "none", cursor: "pointer", color: "#f7931e", fontSize: 11, fontWeight: 700, padding: 0 }}>Back to today</button>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
