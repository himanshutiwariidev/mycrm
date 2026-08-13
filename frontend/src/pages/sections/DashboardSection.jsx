import React, { useEffect, useState } from "react";
import {
  Activity, AlertTriangle, Banknote, Bell, BarChart3, Calendar, CheckCircle2, ChevronDown, ChevronRight, Clock, CreditCard, Edit3, FileText,
  IndianRupee, Inbox, Landmark, Layers, MapPin, MessageSquare, Package, Paperclip,
  RefreshCw, Send, ShieldCheck, TrendingDown, TrendingUp, UserCheck, UserPlus, Wallet,
} from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { T } from "./shared";
import DateRangePicker, { computeRangeForPreset } from "../../components/DateRangePicker";

const DASHBOARD_RANGE_STORAGE_KEY = "crm_main_dashboard_date_range";

function loadStoredDashboardRange() {
  try {
    const raw = localStorage.getItem(DASHBOARD_RANGE_STORAGE_KEY);
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

const fmtINR = (v) => `₹${Math.round(v || 0).toLocaleString("en-IN")}`;
const fmtShortDate = (v) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const fmtTimeAgo = (v) => {
  const diffMs = Date.now() - new Date(v).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return fmtShortDate(v);
};

const RENEWAL_STATUS_COLORS = {
  Upcoming: { color: "#2563eb", bg: "#dbeafe" },
  Overdue: { color: "#dc2626", bg: "#fee2e2" },
  Completed: { color: "#16a34a", bg: "#dcfce7" },
};

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
  payment_deleted: { Icon: IndianRupee, color: "#dc2626" },
  reminder_created: { Icon: Bell, color: "#f7931e" },
  reminder_sent: { Icon: Send, color: "#16a34a" },
  portal_enabled: { Icon: ShieldCheck, color: "#7c3aed" },
  invoice_generated: { Icon: FileText, color: "#2563eb" },
  user_assigned: { Icon: UserCheck, color: "#7c3aed" },
  remark_added: { Icon: MessageSquare, color: "#0891b2" },
  progress_updated: { Icon: TrendingUp, color: "#16a34a" },
  pi_uploaded: { Icon: Paperclip, color: "#2563eb" },
  pi_deleted: { Icon: Paperclip, color: "#dc2626" },
};

function StatCard({ Icon, iconBg, label, value, changePercent, changeIsGood, sparkline, sparklineColor, sparklineId }) {
  const isUp = (changePercent || 0) >= 0;
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 18, padding: "22px 22px 16px", boxShadow: "0 1px 3px rgba(0,0,0,.04)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, flexShrink: 0, background: iconBg, display: "grid", placeItems: "center" }}>
          <Icon size={21} color="#fff" strokeWidth={2} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, color: T.textMuted, fontWeight: 500, marginBottom: 3 }}>{label}</div>
          <div style={{ fontSize: 23, fontWeight: 700, color: T.textPrimary, fontFamily: "'Inter', sans-serif", lineHeight: 1.2 }}>{fmtINR(value)}</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: changeIsGood ? T.green : T.red, display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
            {isUp ? <TrendingUp size={12} strokeWidth={2.4} /> : <TrendingDown size={12} strokeWidth={2.4} />}
            {Math.abs(changePercent || 0)}%
            <span style={{ color: T.textMuted, fontWeight: 500 }}>vs last month</span>
          </div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={48}>
        <AreaChart data={sparkline} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={sparklineId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={sparklineColor} stopOpacity={0.35} />
              <stop offset="100%" stopColor={sparklineColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="value" stroke={sparklineColor} strokeWidth={2} fill={`url(#${sparklineId})`} dot={false} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function GrowthOverviewCard({ growthOverview }) {
  const [mode, setMode] = useState("monthly");
  const data = growthOverview?.[mode] || { currentLabel: "", currentProfit: 0, priorLabel: "", priorProfit: 0, hasPriorData: false };
  const changePercent = data.hasPriorData && data.priorProfit
    ? Math.round(((data.currentProfit - data.priorProfit) / Math.abs(data.priorProfit)) * 100)
    : null;

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 18, padding: "22px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, flexShrink: 0, background: "#2563eb", display: "grid", placeItems: "center" }}>
            <BarChart3 size={21} color="#fff" strokeWidth={2} />
          </div>
          <div style={{ fontSize: 13, color: T.textMuted, fontWeight: 500 }}>Growth Overview</div>
        </div>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          style={{ padding: "6px 10px", borderRadius: 8, border: `1.5px solid ${T.inputBorder}`, fontSize: 12, background: "#fff", color: T.textPrimary, fontFamily: "inherit", cursor: "pointer" }}
        >
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
        </select>
      </div>

      {!data.hasPriorData ? (
        <>
          <div style={{ fontSize: 26, fontWeight: 700, color: T.textMuted, fontFamily: "'Inter', sans-serif" }}>N/A</div>
          <div style={{ fontSize: 12, color: T.textMuted, marginTop: 4 }}>No prior {mode === "monthly" ? "year" : "period"} data</div>
        </>
      ) : (
        <div style={{ fontSize: 12, fontWeight: 700, color: changePercent >= 0 ? T.green : T.red, display: "flex", alignItems: "center", gap: 4 }}>
          {changePercent >= 0 ? <TrendingUp size={12} strokeWidth={2.4} /> : <TrendingDown size={12} strokeWidth={2.4} />}
          {Math.abs(changePercent)}% <span style={{ color: T.textMuted, fontWeight: 500 }}>vs {data.priorLabel}</span>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 16 }}>
        <div style={{ background: T.inputBg, borderRadius: 10, padding: "10px 12px" }}>
          <div style={{ fontSize: 11, color: T.textMuted }}>{data.priorLabel} Profit</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.textPrimary, marginTop: 2 }}>{fmtINR(data.priorProfit)}</div>
        </div>
        <div style={{ background: T.brandLight, borderRadius: 10, padding: "10px 12px" }}>
          <div style={{ fontSize: 11, color: T.brand }}>{data.currentLabel} Profit</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.brand, marginTop: 2 }}>{fmtINR(data.currentProfit)}</div>
        </div>
      </div>
    </div>
  );
}

function TodaysSchedule({ meetings, setTab }) {
  const today = new Date();
  const todaysMeetings = (meetings || [])
    .filter((m) => {
      const d = new Date(m.meetingDate);
      return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
    })
    .sort((a, b) => new Date(a.meetingDate) - new Date(b.meetingDate));

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 18, padding: 22, display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: T.textPrimary, marginBottom: 16 }}>Today's Schedule</div>

      {todaysMeetings.length === 0 ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: "20px 0" }}>
          <Calendar size={30} strokeWidth={1.4} color={T.textMuted} />
          <div style={{ fontSize: 13.5, color: T.textMuted }}>No meetings today</div>
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
          {todaysMeetings.map((m) => (
            <div key={m._id} style={{ background: T.inputBg, borderRadius: 10, padding: "10px 12px" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.textPrimary }}>{m.title}</div>
              <div style={{ display: "flex", gap: 12, marginTop: 4, fontSize: 11.5, color: T.textMuted, flexWrap: "wrap" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Clock size={11} strokeWidth={1.8} />{new Date(m.meetingDate).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
                {m.location && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><MapPin size={11} strokeWidth={1.8} />{m.location}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => setTab("meetings")}
        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, background: "none", border: "none", cursor: "pointer", color: "#f7931e", fontSize: 12.5, fontWeight: 600, fontFamily: "inherit", padding: "8px 0 0" }}
      >
        <Calendar size={14} strokeWidth={2} /> View Calendar
      </button>
    </div>
  );
}

// Bank vs Cash received this period — keyed off each payment's own paymentDate
// (see revenueSummary in getDashboardStats), never contract/due dates.
function PaymentOverviewCard({ revenueSummary }) {
  const { bank = 0, cash = 0, total = 0 } = revenueSummary || {};
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 18, padding: 22, height: "100%" }}>
      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: T.textPrimary, marginBottom: 4 }}>Payment Overview</div>
      <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 18 }}>Received this period, by payment method</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <div style={{ background: "#dbeafe", borderRadius: 12, padding: 16 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: "#2563eb", display: "grid", placeItems: "center", marginBottom: 10 }}>
            <Landmark size={16} color="#fff" strokeWidth={2} />
          </div>
          <div style={{ fontSize: 11, color: "#1e40af", fontWeight: 600 }}>Bank</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: T.textPrimary, marginTop: 2, fontFamily: "'Inter', sans-serif" }}>{fmtINR(bank)}</div>
        </div>
        <div style={{ background: "#fef3c7", borderRadius: 12, padding: 16 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: "#d97706", display: "grid", placeItems: "center", marginBottom: 10 }}>
            <Banknote size={16} color="#fff" strokeWidth={2} />
          </div>
          <div style={{ fontSize: 11, color: "#92400e", fontWeight: 600 }}>Cash</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: T.textPrimary, marginTop: 2, fontFamily: "'Inter', sans-serif" }}>{fmtINR(cash)}</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 14, borderTop: `1px solid ${T.borderLight}` }}>
        <span style={{ fontSize: 12.5, color: T.textMuted, fontWeight: 600 }}>Total Received</span>
        <span style={{ fontSize: 18, fontWeight: 700, color: T.green, fontFamily: "'Inter', sans-serif" }}>{fmtINR(total)}</span>
      </div>
    </div>
  );
}

const BALANCE_DUE_STATUS_META = {
  Overdue: { color: "#dc2626", bg: "#fee2e2" },
  "Due Today": { color: "#d97706", bg: "#fef3c7" },
  Upcoming: { color: "#2563eb", bg: "#dbeafe" },
};

export default function DashboardSection({ dashboardStats, meetings, activityLog, setTab, fetchDashboardStats }) {
  const stats = dashboardStats || {};
  const serviceWiseActiveCases = stats.serviceWiseActiveCases || [];
  const renewalCases = stats.renewalCases || [];
  const balanceDue = stats.balanceDue || [];
  const activity = activityLog || [];
  const [expandedServiceId, setExpandedServiceId] = useState(null);
  const [range, setRange] = useState(loadStoredDashboardRange);

  useEffect(() => {
    localStorage.setItem(DASHBOARD_RANGE_STORAGE_KEY, JSON.stringify({ start: range.start, end: range.end, presetKey: range.presetKey }));
    fetchDashboardStats?.({ start: range.start.toISOString(), end: range.end.toISOString() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.start, range.end]);

  // periodTrend is bucketed across the currently-selected date range (see
  // backend getDashboardStats) — unlike the old monthlyTrend (a fixed
  // trailing-8-months view), this redraws whenever the date-range picker
  // above changes, instead of looking frozen.
  const periodTrend = stats.periodTrend || [];
  const collectionsSparkline = periodTrend.map((m) => ({ label: m.label, value: m.collected }));
  const expensesSparkline = periodTrend.map((m) => ({ label: m.label, value: m.expenses }));
  const profitSparkline = periodTrend.map((m) => ({ label: m.label, value: m.profit }));

  return (
    <div className="fade-up">
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <DateRangePicker value={range} onChange={setRange} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 18, marginBottom: 18 }}>
        <StatCard
          Icon={Wallet} iconBg="#7c3aed" label="Total Collections" value={stats.totalRevenue}
          changePercent={stats.collectionsChangePercent} changeIsGood={(stats.collectionsChangePercent || 0) >= 0}
          sparkline={collectionsSparkline} sparklineColor="#7c3aed" sparklineId="sparkCollections"
        />
        <StatCard
          Icon={CreditCard} iconBg="#16a34a" label="Total Expenses" value={stats.totalExpenses}
          changePercent={stats.expensesChangePercent} changeIsGood={(stats.expensesChangePercent || 0) <= 0}
          sparkline={expensesSparkline} sparklineColor="#16a34a" sparklineId="sparkExpenses"
        />
        <StatCard
          Icon={TrendingUp} iconBg="#f7931e" label="Total Profit" value={stats.netProfit}
          changePercent={stats.profitChangePercent} changeIsGood={(stats.profitChangePercent || 0) >= 0}
          sparkline={profitSparkline} sparklineColor="#f7931e" sparklineId="sparkProfit"
        />
        <GrowthOverviewCard growthOverview={stats.growthOverview} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <PaymentOverviewCard revenueSummary={stats.revenueSummary} />
        <TodaysSchedule meetings={meetings} setTab={setTab} />
      </div>

      {/* ── Balance Due ── */}
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 18, padding: 22, marginTop: 18 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: "#fee2e2", display: "grid", placeItems: "center" }}>
              <AlertTriangle size={16} color="#dc2626" strokeWidth={2} />
            </div>
            <div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: T.textPrimary }}>Balance Due</div>
              <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>Outstanding contracts with a due date in this period</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 18 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: T.textMuted }}>Overdue</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#dc2626" }}>{stats.overdueBalanceDueCount || 0}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: T.textMuted }}>Total Balance Due</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#f7931e" }}>{fmtINR(stats.totalBalanceDue)}</div>
            </div>
          </div>
        </div>

        {balanceDue.length === 0 ? (
          <div style={{ textAlign: "center", padding: "30px 10px", color: T.textMuted, fontSize: 13, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <CheckCircle2 size={24} strokeWidth={1.6} color={T.green} /> All contracts due this period are fully paid
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                  {["Client", "Contract", "Contract Amount", "Received", "Balance", "Due Date", "Status"].map((h) => (
                    <th key={h} style={{ textAlign: h === "Contract Amount" || h === "Received" || h === "Balance" ? "right" : "left", padding: "8px 10px", fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: 0.4 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {balanceDue.map((b) => {
                  const statusAccent = BALANCE_DUE_STATUS_META[b.status] || BALANCE_DUE_STATUS_META.Upcoming;
                  return (
                    <tr key={b.contractId} style={{ borderBottom: `1px solid ${T.borderLight}` }}>
                      <td style={{ padding: "10px", color: T.textPrimary, fontWeight: 600 }}>{b.companyName || b.clientName}</td>
                      <td style={{ padding: "10px", color: T.textSecondary }}>{b.projectName}</td>
                      <td style={{ padding: "10px", color: T.textSecondary, textAlign: "right" }}>{fmtINR(b.contractAmount)}</td>
                      <td style={{ padding: "10px", color: T.textSecondary, textAlign: "right" }}>{fmtINR(b.receivedAmount)}</td>
                      <td style={{ padding: "10px", color: T.textPrimary, fontWeight: 700, textAlign: "right" }}>{fmtINR(b.balance)}</td>
                      <td style={{ padding: "10px", color: T.textSecondary }}>{fmtShortDate(b.dueDate)}</td>
                      <td style={{ padding: "10px" }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99, color: statusAccent.color, background: statusAccent.bg }}>{b.status}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Service Wise Active Cases / Activity Log ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 18, marginTop: 18 }}>
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 18, padding: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 18 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: "#e0f7fa", display: "grid", placeItems: "center" }}>
              <Layers size={16} color="#0891b2" strokeWidth={2} />
            </div>
            <div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: T.textPrimary }}>Service Wise Active Cases</div>
              <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>Excludes rejected/expired contracts</div>
            </div>
          </div>
          {serviceWiseActiveCases.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px 10px", color: T.textMuted, fontSize: 13, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <Inbox size={24} strokeWidth={1.6} color={T.textMuted} /> No active cases in this period
            </div>
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
                          <span style={{ width: 8, height: 8, borderRadius: 99, flexShrink: 0, background: ["#0891b2", "#7c3aed", "#f7931e", "#16a34a", "#db2777", "#d97706"][i % 6] }} />
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
        </div>

        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 18, padding: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 18 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: "#fff4e6", display: "grid", placeItems: "center" }}>
              <Activity size={16} color="#f7931e" strokeWidth={2} />
            </div>
            <div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: T.textPrimary }}>Activity Log</div>
              <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>Most recent activity across the CRM</div>
            </div>
          </div>
          {activity.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px 10px", color: T.textMuted, fontSize: 13, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <Inbox size={24} strokeWidth={1.6} color={T.textMuted} /> No activity recorded yet
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 320, overflowY: "auto" }}>
              {activity.map((entry) => {
                const meta = ACTIVITY_META[entry.type] || { Icon: Activity, color: T.textMuted };
                const clientName = entry.clientId?.clientName || entry.clientId?.companyName;
                return (
                  <div key={entry._id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 4px" }}>
                    <div style={{ width: 26, height: 26, borderRadius: 8, flexShrink: 0, background: `${meta.color}1a`, display: "grid", placeItems: "center", marginTop: 1 }}>
                      <meta.Icon size={13} color={meta.color} strokeWidth={2.2} />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 12.5, color: T.textPrimary, lineHeight: 1.5 }}>{entry.message}</div>
                      <div style={{ fontSize: 11, color: T.textMuted, marginTop: 1 }}>
                        {clientName && <span>{clientName} &middot; </span>}
                        {fmtTimeAgo(entry.createdAt)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Renewal Cases ── */}
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 18, padding: 22, marginTop: 18 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: "#fff4e6", display: "grid", placeItems: "center" }}>
              <RefreshCw size={16} color="#f7931e" strokeWidth={2} />
            </div>
            <div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: T.textPrimary }}>Renewal Cases</div>
              <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>Renewal date (Valid Until) within the selected period</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 18 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: T.textMuted }}>Total Cases</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: T.textPrimary }}>{stats.totalRenewalCases || 0}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: T.textMuted }}>Total Revenue</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#f7931e" }}>{fmtINR(stats.totalRenewalRevenue)}</div>
            </div>
          </div>
        </div>

        {renewalCases.length === 0 ? (
          <div style={{ textAlign: "center", padding: "30px 10px", color: T.textMuted, fontSize: 13, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <Inbox size={24} strokeWidth={1.6} color={T.textMuted} /> No renewals due in this period
          </div>
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
                      <td style={{ padding: "10px", color: T.textSecondary }}>{fmtShortDate(r.renewalDate)}</td>
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
    </div>
  );
}
