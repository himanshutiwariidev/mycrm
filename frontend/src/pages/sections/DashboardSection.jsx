import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownRight, ArrowRight, ArrowUpRight, Banknote, BadgeIndianRupee, CalendarDays, ChartColumnBig,
  ChartNoAxesColumnIncreasing, CircleAlert, Clock, Database, Handshake, Landmark, Lightbulb, RefreshCw,
  UserPlus, Users, Wallet,
} from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, LabelList, Pie, PieChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { T } from "./shared";
import API from "../../services/api";
import DateRangePicker, { computeRangeForPreset } from "../../components/DateRangePicker";
import MonthFilter from "../../components/MonthFilter";
import { currentMonthKey, monthLabel } from "../../utils/taskPeriods";
import DashboardDetails from "./DashboardDetails";
import { fmtCompactINR, fmtINR, fmtShortDate } from "./dashboardFormat";
import "./DashboardSection.css";

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

// Wording that follows the date-range picker, so "(This Month)" / "from last
// month" stay truthful when the admin looks at a different period.
const PERIOD_COPY = {
  today: { short: "Today", overview: "today", compare: "from yesterday" },
  yesterday: { short: "Yesterday", overview: "yesterday", compare: "from the day before" },
  last7: { short: "Last 7 Days", overview: "the last 7 days", compare: "vs previous 7 days" },
  last30: { short: "Last 30 Days", overview: "the last 30 days", compare: "vs previous 30 days" },
  thisMonth: { short: "This Month", overview: "this month", compare: "from last month" },
  lastMonth: { short: "Last Month", overview: "last month", compare: "from the month before" },
  thisYear: { short: "This Year", overview: "this year", compare: "from last year" },
};

function periodCopy(range) {
  const preset = PERIOD_COPY[range.presetKey];
  if (preset) return preset;
  const fmt = (d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  const label = `${fmt(range.start)} – ${fmt(range.end)}`;
  return { short: label, overview: label, compare: "vs previous period" };
}

// Collapses a long daily trend into ≤10 points (summing neighbours) so the
// small sparklines show direction instead of day-to-day noise.
function resampleTrend(periodTrend, key, maxPoints = 10) {
  if (periodTrend.length <= maxPoints) return periodTrend.map((m) => ({ value: m[key] || 0 }));
  const chunk = Math.ceil(periodTrend.length / maxPoints);
  const out = [];
  for (let i = 0; i < periodTrend.length; i += chunk) {
    out.push({ value: periodTrend.slice(i, i + chunk).reduce((sum, m) => sum + (m[key] || 0), 0) });
  }
  return out;
}

/** Round axis steps (1/2/2.5/5 × 10ⁿ) so ticks read 0, 1L, 2L, 3L — not 2.3L, 75K. */
function niceTicks(max, target = 3) {
  if (!(max > 0)) return [0, 1];
  const raw = max / target;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw);
  const top = Math.ceil(max / step) * step;
  const ticks = [];
  for (let t = 0; t <= top + step / 2; t += step) ticks.push(t);
  return ticks;
}

/** Tracks an element's content-box size (for charts that need exact pixels). */
function useElementSize() {
  const ref = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize((s) => (Math.abs(s.width - width) < 1 && Math.abs(s.height - height) < 1 ? s : { width, height }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size];
}

/** Steps big ₹ figures down a size so crore/thousand-crore amounts still fit. */
const valueFont = (text, base) => (text.length > 15 ? base - 5 : text.length > 13 ? base - 3 : base);

const uniqueClients = (rows = []) => new Set(rows.map((r) => String(r.clientId?._id || r.clientId || r.contractId))).size;
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

function Sparkline({ data, color, id, width = 120, height = 44, title }) {
  if (!data.some((d) => d.value)) return null;
  return (
    <div className="sad-spark" style={{ width, height }} aria-hidden="true" title={title}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 5, left: 3, bottom: 1 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.32} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <Area
            type="monotone" dataKey="value" stroke={color} strokeWidth={2.5} strokeLinejoin="round"
            fill={`url(#${id})`} dot={{ r: 3, fill: color, stroke: color, strokeWidth: 0 }} activeDot={false}
            baseValue={0} isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function Change({ percent, compare, goodWhenUp = true, color }) {
  const value = Number(percent) || 0;
  const up = value >= 0;
  const tone = color || ((goodWhenUp ? up : !up) ? T.green : T.red);
  const Arrow = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 12, color: T.textSecondary, whiteSpace: "nowrap" }}>
      <Arrow size={13} color={tone} strokeWidth={2.4} />
      <span style={{ color: tone, fontWeight: 700 }}>{up ? "+" : "−"}{Math.abs(value)}%</span> {compare}
    </span>
  );
}

function CardTitle({ Icon, color, bg, children }) {
  return (
    <div className="sad-card-title">
      <span className="sad-icon-box" style={{ background: bg }}><Icon size={15} color={color} strokeWidth={2.2} /></span>
      <span>{children}</span>
    </div>
  );
}

// ── Row 1: hero cards ─────────────────────────────────────────────────────
function Hero({ tone, Icon, iconColor, iconBg, label, sub, value, meta, art }) {
  return (
    <div className={`sad-hero sad-hero-${tone}`}>
      <div className="sad-hero-icon" style={{ background: iconBg }}>
        <Icon size={24} color={iconColor} strokeWidth={2.2} />
      </div>
      <div className="sad-hero-body">
        <div className="sad-hero-label">{label}{sub && <small> ({sub})</small>}</div>
        <div className="sad-hero-main">
          <div className="sad-hero-figures">
            <div className="sad-hero-value" style={{ fontSize: valueFont(value, 23) }}>{value}</div>
            {meta}
          </div>
          <div className="sad-hero-art">{art}</div>
        </div>
      </div>
    </div>
  );
}

// ── Row 2: charts ─────────────────────────────────────────────────────────
const CASE_COLORS = { renewal: "#2563eb", new: "#9dbcf6" };

const DONUT_INNER = 0.72; // inner radius as a fraction of the outer radius

/** Largest font (10–18px) at which `text` fits across ~85% of the donut hole. */
function centreFont(text, donutSize) {
  const hole = donutSize * DONUT_INNER;
  const byWidth = (hole * 0.85) / (text.length * 0.62);
  return Math.round(Math.max(10, Math.min(18, donutSize * 0.12, byWidth)));
}

function RevenueByCases({ stats, copy, onOpen }) {
  // The donut is drawn at an exact pixel size measured from the card, so the
  // ring and the centred total are always concentric, and the total's font
  // shrinks to fit inside the hole however long the amount gets.
  const [bodyRef, body] = useElementSize();
  const donutSize = Math.round(Math.max(120, Math.min(220, body.height || 180, (body.width || 420) * 0.45)));
  const renewal = stats.revenueByCaseType?.renewal || 0;
  const fresh = stats.revenueByCaseType?.new || 0;
  const total = renewal + fresh;
  const pct = (v) => (total ? Math.round((v / total) * 100) : 0);
  const data = total ? [{ key: "renewal", value: renewal }, { key: "new", value: fresh }] : [{ key: "empty", value: 1 }];
  const legend = [
    { key: "renewal", label: "Renewal Cases", value: renewal },
    { key: "new", label: "New Cases / Clients", value: fresh },
  ];

  return (
    <div className="sad-card sad-chart-card">
      <div className="sad-card-head">
        <CardTitle Icon={ChartColumnBig} color="#2563eb" bg="#e8efff">Total Revenue by Cases</CardTitle>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="sad-pill">{copy.short}</span>
          {onOpen && <button type="button" className="sad-link" onClick={() => onOpen("caseRevenue")} data-case-details>Details <ArrowRight size={13} /></button>}
        </span>
      </div>
      <div className="sad-chart-body sad-donut-body" ref={bodyRef}>
        <div className="sad-donut" style={{ width: donutSize, height: donutSize }}>
          <PieChart width={donutSize} height={donutSize}>
            <Pie
              data={data} dataKey="value" cx="50%" cy="50%"
              innerRadius={(donutSize / 2) * DONUT_INNER} outerRadius={donutSize / 2}
              startAngle={90} endAngle={-270} stroke="none" isAnimationActive={false}
            >
              {data.map((d) => <Cell key={d.key} fill={CASE_COLORS[d.key] || "#e2e8f0"} />)}
            </Pie>
          </PieChart>
          <div className="sad-donut-center">
            <div>
              <div style={{ fontSize: centreFont(fmtINR(total), donutSize), fontWeight: 800, color: T.textPrimary, whiteSpace: "nowrap" }}>{fmtINR(total)}</div>
              <div style={{ fontSize: Math.max(10, Math.min(12, donutSize * 0.075)), color: T.textSecondary, marginTop: 1 }}>Total Revenue</div>
            </div>
          </div>
        </div>
        <div className="sad-legend">
          {legend.map((l) => (
            <div key={l.key} style={{ display: "flex", gap: 9 }}>
              <span style={{ width: 10, height: 10, borderRadius: 99, background: CASE_COLORS[l.key], marginTop: 4, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 12.5, color: T.textPrimary }}>{l.label}</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: T.textPrimary, marginTop: 2, whiteSpace: "nowrap" }}>
                  {fmtINR(l.value)} ({pct(l.value)}%)
                </div>
              </div>
            </div>
          ))}
          {!total && <div style={{ fontSize: 11.5, color: T.textMuted }}>No payments received in this period yet.</div>}
        </div>
      </div>
    </div>
  );
}

function SourceTick({ x, y, payload }) {
  const isBank = payload.value === "Bank";
  const Icon = isBank ? Landmark : Banknote;
  return (
    <g transform={`translate(${x},${y + 4})`}>
      <Icon x={-30} y={1} width={16} height={16} color={isBank ? "#2563eb" : "#16a34a"} strokeWidth={2} />
      <text x={-9} y={14} fill={T.textPrimary} fontSize={12.5} fontWeight={600}>{payload.value}</text>
    </g>
  );
}

function RevenueBySource({ stats, copy }) {
  const data = [
    { name: "Bank", value: stats.revenueSummary?.bank || 0, color: "#2563eb" },
    { name: "Cash", value: stats.revenueSummary?.cash || 0, color: "#f08a2c" },
  ];
  const ticks = niceTicks(Math.max(...data.map((d) => d.value)));
  const yAxisWidth = Math.max(30, Math.max(...ticks.map((t) => fmtCompactINR(t).length)) * 7 + 10);
  // Exact pixel size (measured), so the bars always fill the card's height.
  const [bodyRef, body] = useElementSize();
  return (
    <div className="sad-card sad-chart-card">
      <div className="sad-card-head">
        <CardTitle Icon={ChartColumnBig} color="#2563eb" bg="#e8efff">Total Revenue by Source</CardTitle>
        <span className="sad-pill">{copy.short}</span>
      </div>
      <div className="sad-chart-body" ref={bodyRef}>
        {body.width > 0 && body.height > 0 && (
          <BarChart width={body.width} height={body.height} data={data} margin={{ top: 20, right: 8, left: 0, bottom: 2 }} barCategoryGap="34%">
            <CartesianGrid vertical={false} stroke="#eef0f5" />
            <XAxis dataKey="name" tickLine={false} axisLine={{ stroke: "#cbd5e1" }} tick={<SourceTick />} interval={0} height={26} />
            <YAxis tickFormatter={fmtCompactINR} tickLine={false} axisLine={{ stroke: "#cbd5e1" }} width={yAxisWidth} tick={{ fill: T.textSecondary, fontSize: 11 }} domain={[0, ticks[ticks.length - 1]]} ticks={ticks} />
            <Bar dataKey="value" radius={[3, 3, 0, 0]} isAnimationActive={false} maxBarSize={150}>
              {data.map((d) => <Cell key={d.name} fill={d.color} />)}
              <LabelList dataKey="value" position="top" formatter={fmtINR} style={{ fill: T.textPrimary, fontSize: 12, fontWeight: 700 }} />
            </Bar>
          </BarChart>
        )}
      </div>
    </div>
  );
}

// ── Row 3 ─────────────────────────────────────────────────────────────────
function MetricCard({ Icon, iconColor, iconBg, label, value, change, sparkline }) {
  return (
    <div className="sad-card">
      <CardTitle Icon={Icon} color={iconColor} bg={iconBg}>{label}</CardTitle>
      <div className="sad-metric-main">
        <div className="sad-metric-figures">
          <div className="sad-metric-value" style={{ fontSize: valueFont(value, 22) }}>{value}</div>
          <div style={{ marginTop: 3 }}>{change}</div>
        </div>
        {sparkline}
      </div>
    </div>
  );
}

function DueSummary({ stats, renewalClients, balanceClients, onOpen }) {
  const rows = [
    { tab: "renewals", Icon: RefreshCw, color: "#7c3aed", bg: "#f1ebff", label: "Renewal Due", amount: stats.totalRenewalRevenue, clients: renewalClients, countColor: "#2563eb" },
    { tab: "balance", Icon: Wallet, color: "#ea580c", bg: "#ffedd5", label: "Balance Due", amount: stats.totalBalanceDue, clients: balanceClients, countColor: T.green },
  ];
  return (
    <div className="sad-card">
      <div className="sad-card-head" style={{ marginBottom: 4 }}>
        <CardTitle Icon={CalendarDays} color="#2563eb" bg="#e8efff">Upcoming &amp; Due Summary</CardTitle>
        <button type="button" className="sad-link" onClick={() => onOpen("renewals")}>View All <ArrowRight size={13} /></button>
      </div>
      {rows.map((r) => (
        <button key={r.tab} type="button" className="sad-summary-row" onClick={() => onOpen(r.tab)}>
          <span className="sad-icon-box" style={{ background: r.bg, width: 26, height: 26, borderRadius: 99 }}><r.Icon size={13} color={r.color} strokeWidth={2.3} /></span>
          <span style={{ fontSize: 13, color: T.textPrimary, fontWeight: 500 }}>{r.label}</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: T.textPrimary }}>{fmtINR(r.amount)}</span>
          <span className="sad-summary-count" style={{ fontSize: 12.5, color: r.countColor, fontWeight: 500, whiteSpace: "nowrap" }}>{plural(r.clients, "Client")}</span>
        </button>
      ))}
    </div>
  );
}

// ── Row 4 ─────────────────────────────────────────────────────────────────
function ClientMonthlyPaymentsCard() {
  const [month, setMonth] = useState(currentMonthKey);
  const [data, setData] = useState({ loadedMonth: null, availableMonths: [], totalCollected: 0, clientCount: 0, clients: [] });
  const reqIdRef = useRef(0);

  useEffect(() => {
    const reqId = ++reqIdRef.current;
    API.get("/clients/monthly-payments", { params: { month } })
      .then((res) => {
        if (reqId === reqIdRef.current) {
          setData({
            loadedMonth: month,
            ...(res.data || { availableMonths: [], totalCollected: 0, clientCount: 0, clients: [] }),
          });
        }
      })
      .catch(() => {
        if (reqId === reqIdRef.current) {
          setData((prev) => ({ ...prev, loadedMonth: month, clients: [], totalCollected: 0, clientCount: 0 }));
        }
      });
  }, [month]);

  const loading = data.loadedMonth !== month;
  const clients = data.clients || [];

  return (
    <div className="sad-card sad-payments-card">
      <div className="sad-card-head sad-payments-head">
        <CardTitle Icon={BadgeIndianRupee} color="#16a34a" bg="#dcfce7">Client Payments</CardTitle>
        <MonthFilter value={month} onChange={setMonth} months={data.availableMonths} />
      </div>
      <div className="sad-payments-summary">
        <span>{plural(data.clientCount || 0, "client")} paid in {monthLabel(month, true)}</span>
        <span>Total: <strong>{fmtINR(data.totalCollected)}</strong></span>
      </div>
      {loading && !clients.length ? (
        <div className="sad-payments-empty">Loading payments…</div>
      ) : clients.length === 0 ? (
        <div className="sad-payments-empty">No client payments recorded in {monthLabel(month, true)}</div>
      ) : (
        <div className="sad-payments-list">
          {clients.map((c) => {
            const name = c.companyName || c.clientName;
            const metaParts = [
              plural(c.paymentCount, "payment"),
              c.methods?.length ? c.methods.join(", ") : null,
              c.lastPaymentDate ? fmtShortDate(c.lastPaymentDate) : null,
            ].filter(Boolean);
            return (
              <div key={c.clientId} className="sad-payments-row">
                <div className="sad-payments-client">
                  <div className="sad-payments-name" title={name}>{name}</div>
                  <div className="sad-payments-meta" title={metaParts.join(" · ")}>{metaParts.join(" · ")}</div>
                </div>
                <span className="sad-payments-amount">{fmtINR(c.totalPaid)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function QuickStats({ stats, copy }) {
  const growth = Number(stats.collectionsChangePercent) || 0;
  const items = [
    { Icon: Database, color: "#2563eb", label: "Total Clients", value: (stats.totalClientsAllTime ?? 0).toLocaleString("en-IN") },
    { Icon: Handshake, color: "#ea580c", label: copy.short === "This Month" ? "Renewals This Month" : "Renewals Done", value: (stats.renewalsDoneCount ?? 0).toLocaleString("en-IN") },
    { Icon: UserPlus, color: "#2563eb", label: "New Clients", value: (stats.totalClients ?? 0).toLocaleString("en-IN") },
    { Icon: ChartNoAxesColumnIncreasing, color: T.green, label: "Growth", value: `${growth >= 0 ? "+" : "−"}${Math.abs(growth)}%`, valueColor: growth >= 0 ? T.green : T.red },
  ];
  return (
    <div className="sad-card sad-quick">
      <CardTitle Icon={Lightbulb} color="#f59e0b" bg="#ffe9c7">Quick Stats</CardTitle>
      <div className="sad-quick-grid">
        {items.map((it) => (
          <div key={it.label} className="sad-quick-item">
            <it.Icon size={22} color={it.color} strokeWidth={2} style={{ margin: "0 auto" }} />
            <div className="sad-quick-label" title={it.label}>{it.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: it.valueColor || T.textPrimary, marginTop: 2 }}>{it.value}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 10.5, color: T.textMuted, textAlign: "center" }}>Growth = revenue {copy.compare}</div>
    </div>
  );
}

// ── Section ───────────────────────────────────────────────────────────────
export default function DashboardSection({ dashboardStats, activityLog, fetchDashboardStats }) {
  const stats = dashboardStats || {};
  const activity = activityLog || [];
  const [range, setRange] = useState(loadStoredDashboardRange);
  const [detailTab, setDetailTab] = useState(null);
  const detailsRef = useRef(null);

  useEffect(() => {
    localStorage.setItem(DASHBOARD_RANGE_STORAGE_KEY, JSON.stringify({ start: range.start, end: range.end, presetKey: range.presetKey }));
    fetchDashboardStats?.({ start: range.start.toISOString(), end: range.end.toISOString() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.start, range.end]);

  const copy = periodCopy(range);
  // Sparklines plot one point per period (the selected period + the 6 before
  // it), so their last segment is exactly the "% from last month" printed
  // beside them — up when the % is positive, down when it's negative. Older
  // backends without comparisonTrend fall back to the in-period daily trend.
  const comparisonTrend = stats.comparisonTrend;
  const periodTrend = useMemo(() => stats.periodTrend || [], [stats.periodTrend]);
  const trendFor = (key) => (comparisonTrend?.length ? comparisonTrend.map((p) => ({ value: p[key] || 0 })) : resampleTrend(periodTrend, key));
  const revenueTrend = useMemo(() => trendFor("collected"), [comparisonTrend, periodTrend]); // eslint-disable-line react-hooks/exhaustive-deps
  const expensesTrend = useMemo(() => trendFor("expenses"), [comparisonTrend, periodTrend]); // eslint-disable-line react-hooks/exhaustive-deps
  const profitTrend = useMemo(() => trendFor("profit"), [comparisonTrend, periodTrend]); // eslint-disable-line react-hooks/exhaustive-deps
  const trendTitle = comparisonTrend?.length
    ? `Trend: ${comparisonTrend[0].label} → ${comparisonTrend[comparisonTrend.length - 1].label}`
    : undefined;
  const renewalClients = uniqueClients(stats.renewalCases);
  const balanceClients = uniqueClients(stats.balanceDue);

  const openDetails = (tab) => {
    setDetailTab(tab);
    requestAnimationFrame(() => detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  return (
    <div className="fade-up">
      <div className="sad-screen">
        <div className="sad-header">
          <div className="sad-title">
            <h2>Super Admin Dashboard</h2>
            <p>Welcome back! Here&apos;s your business overview for {copy.overview}.</p>
          </div>
          <div className="sad-header-actions">
            <button type="button" className="sad-link" onClick={() => openDetails("renewals")}>Detailed reports <ArrowRight size={13} /></button>
            <DateRangePicker value={range} onChange={setRange} />
          </div>
        </div>

        <div className="sad-row sad-row-hero">
          <Hero
            tone="green" Icon={BadgeIndianRupee} iconColor="#16a34a" iconBg="#d3f5df"
            label="Total Revenue" sub={copy.short} value={fmtINR(stats.totalRevenue)}
            meta={<Change percent={stats.collectionsChangePercent} compare={copy.compare} />}
            art={<Sparkline data={revenueTrend} color="#16a34a" id="sadRevenueSpark" width={124} height={52} title={trendTitle} />}
          />
          <Hero
            tone="blue" Icon={RefreshCw} iconColor="#2563eb" iconBg="#d9e6fd"
            label="Renewal Due / Upcoming" value={fmtINR(stats.totalRenewalRevenue)}
            meta={<div className="sad-hero-meta"><CalendarDays size={13} color="#2563eb" /> {plural(renewalClients, "Client")}</div>}
            art={<Clock size={36} color="#93b4f5" strokeWidth={1.6} />}
          />
          <Hero
            tone="orange" Icon={Wallet} iconColor="#ea580c" iconBg="#ffe2c7"
            label="Balance Payment Due" value={fmtINR(stats.totalBalanceDue)}
            meta={<div className="sad-hero-meta"><Users size={13} color="#ea580c" /> {plural(balanceClients, "Client")}</div>}
            art={<CircleAlert size={36} color="#f59e5b" strokeWidth={1.8} />}
          />
        </div>

        <div className="sad-row sad-row-charts">
          <RevenueByCases stats={stats} copy={copy} onOpen={openDetails} />
          <RevenueBySource stats={stats} copy={copy} />
        </div>

        <div className="sad-row sad-row-3">
          <MetricCard
            Icon={Wallet} iconColor="#7c3aed" iconBg="#f1ebff" label="Total Expenses" value={fmtINR(stats.totalExpenses)}
            change={<Change percent={stats.expensesChangePercent} compare={copy.compare} color="#7c3aed" />}
            sparkline={<Sparkline data={expensesTrend} color="#a855f7" id="sadExpenseSpark" width={130} height={50} title={trendTitle} />}
          />
          <MetricCard
            Icon={ChartNoAxesColumnIncreasing} iconColor={T.green} iconBg="#dcfce7" label="Total Profit" value={fmtINR(stats.netProfit)}
            change={<Change percent={stats.profitChangePercent} compare={copy.compare} />}
            sparkline={<Sparkline data={profitTrend} color="#16a34a" id="sadProfitSpark" width={130} height={50} title={trendTitle} />}
          />
          <DueSummary stats={stats} renewalClients={renewalClients} balanceClients={balanceClients} onOpen={openDetails} />
        </div>

        <div className="sad-row sad-row-bottom">
          <ClientMonthlyPaymentsCard />
          <QuickStats stats={stats} copy={copy} />
        </div>
      </div>

      <div ref={detailsRef} style={{ scrollMarginTop: 76 }}>
        {detailTab && <DashboardDetails stats={stats} activity={activity} tab={detailTab} onTabChange={setDetailTab} />}
      </div>
    </div>
  );
}
