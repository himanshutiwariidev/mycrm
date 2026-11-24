import React, { useState } from "react";
import { Activity, ChevronDown, ChevronRight, Inbox } from "lucide-react";
import { T } from "./shared";
import { ACTIVITY_META, fmtINR, fmtShortDate, fmtTimeAgo } from "./dashboardFormat";

// The detailed lists behind the Super Admin Dashboard's "View All" links —
// the same tables the dashboard always had, just moved off the main grid so
// the overview matches the summary design.

const RENEWAL_STATUS_COLORS = {
  Upcoming: { color: "#2563eb", bg: "#dbeafe" },
  Overdue: { color: "#dc2626", bg: "#fee2e2" },
  Completed: { color: "#16a34a", bg: "#dcfce7" },
};

const BALANCE_DUE_STATUS_META = {
  Overdue: { color: "#dc2626", bg: "#fee2e2" },
  "Due Today": { color: "#d97706", bg: "#fef3c7" },
  Upcoming: { color: "#2563eb", bg: "#dbeafe" },
};

const thStyle = (align = "left") => ({
  textAlign: align, padding: "8px 10px", fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: "uppercase",
  letterSpacing: 0.4, position: "sticky", top: 0, background: T.card, zIndex: 1, whiteSpace: "nowrap",
});

function Empty({ children }) {
  return (
    <div style={{ textAlign: "center", padding: "30px 10px", color: T.textMuted, fontSize: 13, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <Inbox size={24} strokeWidth={1.6} color={T.textMuted} /> {children}
    </div>
  );
}

function StatusPill({ meta, label }) {
  return <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99, color: meta.color, background: meta.bg, whiteSpace: "nowrap" }}>{label}</span>;
}

function RenewalCasesTable({ stats }) {
  const rows = stats.renewalCases || [];
  if (!rows.length) return <Empty>No renewals due in this period</Empty>;
  return (
    <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: 440 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 720 }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${T.border}` }}>
            {["Client Name", "Service Name", "Renewal Date", "Renewal Amount", "Salesperson", "Status"].map((h) => <th key={h} style={thStyle()}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.contractId} style={{ borderBottom: `1px solid ${T.borderLight}` }}>
              <td style={{ padding: 10, color: T.textPrimary, fontWeight: 600 }}>{r.companyName || r.clientName}</td>
              <td style={{ padding: 10, color: T.textSecondary }}>{r.serviceName}</td>
              <td style={{ padding: 10, color: T.textSecondary, whiteSpace: "nowrap" }}>{fmtShortDate(r.renewalDate)}</td>
              <td style={{ padding: 10, color: T.textPrimary, fontWeight: 600, whiteSpace: "nowrap" }}>{fmtINR(r.renewalAmount)}</td>
              <td style={{ padding: 10, color: T.textSecondary }}>{r.salesPerson}</td>
              <td style={{ padding: 10 }}><StatusPill meta={RENEWAL_STATUS_COLORS[r.status] || RENEWAL_STATUS_COLORS.Upcoming} label={r.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BalanceDueTable({ stats }) {
  const rows = stats.balanceDue || [];
  if (!rows.length) return <Empty>All contracts due this period are fully paid</Empty>;
  return (
    <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: 440 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 760 }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${T.border}` }}>
            {["Client", "Contract", "Contract Amount", "Received", "Balance", "Due Date", "Status"].map((h) => (
              <th key={h} style={thStyle(["Contract Amount", "Received", "Balance"].includes(h) ? "right" : "left")}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((b) => (
            <tr key={b.contractId} style={{ borderBottom: `1px solid ${T.borderLight}` }}>
              <td style={{ padding: 10, color: T.textPrimary, fontWeight: 600 }}>{b.companyName || b.clientName}</td>
              <td style={{ padding: 10, color: T.textSecondary }}>{b.projectName}</td>
              <td style={{ padding: 10, color: T.textSecondary, textAlign: "right" }}>{fmtINR(b.contractAmount)}</td>
              <td style={{ padding: 10, color: T.textSecondary, textAlign: "right" }}>{fmtINR(b.receivedAmount)}</td>
              <td style={{ padding: 10, color: T.textPrimary, fontWeight: 700, textAlign: "right" }}>{fmtINR(b.balance)}</td>
              <td style={{ padding: 10, color: T.textSecondary, whiteSpace: "nowrap" }}>{fmtShortDate(b.dueDate)}</td>
              <td style={{ padding: 10 }}><StatusPill meta={BALANCE_DUE_STATUS_META[b.status] || BALANCE_DUE_STATUS_META.Upcoming} label={b.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const SERVICE_DOT_COLORS = ["#0891b2", "#7c3aed", "#f7931e", "#16a34a", "#db2777", "#d97706"];

function ServiceWiseCases({ stats }) {
  const [expandedId, setExpandedId] = useState(null);
  const services = stats.serviceWiseActiveCases || [];
  if (!services.length) return <Empty>No active cases in this period</Empty>;
  return (
    <>
      <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 12 }}>Excludes rejected/expired contracts</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {services.map((s, i) => {
          const isExpanded = expandedId === s.categoryId;
          return (
            <div key={s.categoryId} style={{ borderRadius: 10, background: T.inputBg, overflow: "hidden" }}>
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : s.categoryId)}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "10px 12px", cursor: "pointer", border: "none", background: "transparent", fontFamily: "inherit" }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  {isExpanded ? <ChevronDown size={14} color={T.textMuted} /> : <ChevronRight size={14} color={T.textMuted} />}
                  <span style={{ width: 8, height: 8, borderRadius: 99, flexShrink: 0, background: SERVICE_DOT_COLORS[i % SERVICE_DOT_COLORS.length] }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: T.textPrimary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.label}</span>
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
                  <span style={{ fontSize: 12.5, color: T.textMuted }}>{s.activeCases} case{s.activeCases === 1 ? "" : "s"}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary, minWidth: 90, textAlign: "right" }}>{fmtINR(s.totalAmount)}</span>
                </span>
              </button>
              {isExpanded && (
                <div style={{ padding: "0 12px 12px 34px", maxHeight: 260, overflowY: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                    <thead style={{ position: "sticky", top: 0, background: T.inputBg }}>
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
  );
}

// Same blues as the dashboard's "Total Revenue by Cases" donut.
const CASE_TYPE_META = {
  renewal: { label: "Renewal", color: "#2563eb", bg: "#dbeafe", bar: "#2563eb" },
  new: { label: "New client", color: "#4f7fd9", bg: "#e8efff", bar: "#9dbcf6" },
};

/**
 * Money collected in the period, split by renewal contracts vs new ones —
 * one row per contract that received payments (same numbers as the
 * dashboard's revenue split: renewal + new = total collected).
 */
function RevenueByCaseType({ stats }) {
  const [filter, setFilter] = useState("all");
  const split = stats.revenueByCaseType || {};
  const all = split.rows || [];
  const rows = filter === "all" ? all : all.filter((r) => r.type === filter);
  const total = (split.renewal || 0) + (split.new || 0);
  const pct = (v) => (total ? Math.round((v / total) * 100) : 0);
  const shown = rows.reduce((sum, r) => sum + r.collected, 0);

  const tiles = [
    { id: "all", label: "Total collected", value: total, sub: `${all.length} contract${all.length === 1 ? "" : "s"}`, color: T.textPrimary },
    { id: "renewal", label: "Renewals", value: split.renewal || 0, sub: `${split.renewalContracts || 0} contracts · ${pct(split.renewal || 0)}%`, color: CASE_TYPE_META.renewal.color },
    { id: "new", label: "New clients", value: split.new || 0, sub: `${split.newContracts || 0} contracts · ${pct(split.new || 0)}%`, color: CASE_TYPE_META.new.color },
  ];

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10, marginBottom: 12 }} data-case-tiles>
        {tiles.map((t) => {
          const active = filter === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setFilter(t.id)}
              aria-pressed={active}
              style={{
                textAlign: "left", cursor: "pointer", fontFamily: "inherit", padding: "12px 14px", borderRadius: 12,
                border: `1px solid ${active ? t.color : T.border}`, background: active ? `${t.color}0d` : T.card,
                boxShadow: active ? `0 0 0 3px ${t.color}1a` : "none",
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: 0.4 }}>{t.label}</div>
              <div style={{ fontSize: 19, fontWeight: 700, color: t.color, marginTop: 4 }}>{fmtINR(t.value)}</div>
              <div style={{ fontSize: 12, color: T.textSecondary, marginTop: 2 }}>{t.sub}</div>
            </button>
          );
        })}
      </div>
      {total > 0 && (
        <div style={{ display: "flex", height: 8, borderRadius: 99, overflow: "hidden", background: T.borderLight, marginBottom: 16 }} title={`Renewals ${pct(split.renewal || 0)}% · New ${pct(split.new || 0)}%`}>
          <span style={{ width: `${pct(split.renewal || 0)}%`, background: CASE_TYPE_META.renewal.bar }} />
          <span style={{ width: `${pct(split.new || 0)}%`, background: CASE_TYPE_META.new.bar }} />
        </div>
      )}
      {!rows.length ? (
        <Empty>No {filter === "renewal" ? "renewal " : filter === "new" ? "new-client " : ""}revenue collected in this period</Empty>
      ) : (
        <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: 440 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 820 }} data-case-table>
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                {["Client", "Contract", "Type", "Salesperson", "Contract Amount", "Payments", "Collected", "Last Payment"].map((h) => (
                  <th key={h} style={thStyle(["Contract Amount", "Payments", "Collected"].includes(h) ? "right" : "left")}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.contractId} style={{ borderBottom: `1px solid ${T.borderLight}` }}>
                  <td style={{ padding: 10, color: T.textPrimary, fontWeight: 600 }}>{r.companyName || r.clientName}</td>
                  <td style={{ padding: 10, color: T.textSecondary }}>
                    {r.projectName}
                    {r.contractNumber && <div style={{ fontSize: 11.5, color: T.textMuted }}>{r.contractNumber}</div>}
                  </td>
                  <td style={{ padding: 10 }}><StatusPill meta={CASE_TYPE_META[r.type]} label={CASE_TYPE_META[r.type].label} /></td>
                  <td style={{ padding: 10, color: T.textSecondary }}>{r.salesPerson}</td>
                  <td style={{ padding: 10, color: T.textSecondary, textAlign: "right", whiteSpace: "nowrap" }}>{fmtINR(r.contractAmount)}</td>
                  <td style={{ padding: 10, color: T.textSecondary, textAlign: "right" }}>{r.payments}</td>
                  <td style={{ padding: 10, color: T.textPrimary, fontWeight: 700, textAlign: "right", whiteSpace: "nowrap" }}>{fmtINR(r.collected)}</td>
                  <td style={{ padding: 10, color: T.textSecondary, whiteSpace: "nowrap" }}>{fmtShortDate(r.lastPaidOn)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={6} style={{ padding: 10, fontWeight: 700, color: T.textPrimary }}>Total{filter !== "all" ? ` · ${filter === "renewal" ? "renewals" : "new clients"}` : ""}</td>
                <td style={{ padding: 10, fontWeight: 700, color: T.textPrimary, textAlign: "right", whiteSpace: "nowrap" }} data-case-total>{fmtINR(shown)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </>
  );
}

function AllActivity({ activity }) {
  if (!activity.length) return <Empty>No activity recorded yet</Empty>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, maxHeight: 440, overflowY: "auto" }}>
      {activity.map((entry) => {
        const meta = ACTIVITY_META[entry.type] || { Icon: Activity, color: T.textMuted };
        const clientName = entry.clientId?.companyName || entry.clientId?.clientName;
        return (
          <div key={entry._id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 4px", borderBottom: `1px solid ${T.borderLight}` }}>
            <div style={{ width: 28, height: 28, borderRadius: 99, flexShrink: 0, background: `${meta.color}1a`, display: "grid", placeItems: "center" }}>
              <meta.Icon size={14} color={meta.color} strokeWidth={2.2} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 13, color: T.textPrimary, lineHeight: 1.5 }}>{entry.message}</div>
              {clientName && <div style={{ fontSize: 11.5, color: T.textMuted }}>{clientName}</div>}
            </div>
            <div style={{ fontSize: 11.5, color: T.textMuted, whiteSpace: "nowrap" }}>{fmtTimeAgo(entry.createdAt)}</div>
          </div>
        );
      })}
    </div>
  );
}

const DETAIL_TABS = [
  { id: "renewals", label: "Renewal Cases" },
  { id: "balance", label: "Balance Due" },
  { id: "services", label: "Service Wise Cases" },
  { id: "caseRevenue", label: "Revenue: Renewal / New" },
  { id: "activity", label: "All Activity" },
];

export default function DashboardDetails({ stats, activity, tab, onTabChange }) {
  return (
    <div className="sad-card" style={{ marginTop: 18 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16, borderBottom: `1px solid ${T.border}` }} role="tablist">
        {DETAIL_TABS.map((t) => {
          const active = t.id === tab;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onTabChange(t.id)}
              style={{
                border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 13.5, fontWeight: 600,
                padding: "10px 12px", marginBottom: -1, color: active ? "#2563eb" : T.textSecondary,
                borderBottom: `2px solid ${active ? "#2563eb" : "transparent"}`,
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      {tab === "renewals" && <RenewalCasesTable stats={stats} />}
      {tab === "balance" && <BalanceDueTable stats={stats} />}
      {tab === "services" && <ServiceWiseCases stats={stats} />}
      {tab === "caseRevenue" && <RevenueByCaseType stats={stats} />}
      {tab === "activity" && <AllActivity activity={activity} />}
    </div>
  );
}
