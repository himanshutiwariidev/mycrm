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
      {tab === "activity" && <AllActivity activity={activity} />}
    </div>
  );
}
