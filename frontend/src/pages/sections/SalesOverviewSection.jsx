import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, FileText, Wallet, CalendarClock, PackageCheck, RefreshCw, ChevronDown, ChevronRight,
  CheckCircle2, Inbox, RotateCcw, ArrowUpRight, AlertTriangle,
} from "lucide-react";
import { getSalesDashboard } from "../../services/clientApi";
import { T, KpiCard, kpiGridStyle, fmtShortDate } from "./shared";
import { fmtINR, Chip, Card, Segmented, Empty, th, td, linkBtn } from "./salesUi";

function daysLabel(daysLeft) {
  if (daysLeft === 0) return "Today";
  if (daysLeft < 0) return `${Math.abs(daysLeft)}d overdue`;
  return `in ${daysLeft}d`;
}

function progressText(item) {
  if (item.trackingMode === "status") return "—";
  const per = item.frequency && item.frequency !== "one-time" ? ` (${item.quantity}/${item.frequency})` : "";
  return `${item.delivered}/${item.due}${per}`;
}

// ─── Renewals ─────────────────────────────────────────────────────────────
function RenewalsCard({ renewals, soonDays, openClient, renew }) {
  const [range, setRange] = useState("soon");
  const soon = renewals.filter((r) => r.status !== "Upcoming");
  const rows = range === "soon" ? soon : renewals;

  return (
    <Card
      Icon={CalendarClock} iconColor="#2563eb" iconBg="#dbeafe"
      title="My Renewals"
      subtitle="Contracts that need renewing, earliest first"
      right={
        <Segmented
          value={range}
          onChange={setRange}
          options={[
            { value: "soon", label: `Overdue + next ${soonDays} days`, count: soon.length },
            { value: "all", label: "All pending", count: renewals.length },
          ]}
        />
      }
    >
      {rows.length === 0 ? (
        <Empty Icon={CheckCircle2} color={T.green}>
          {range === "soon" ? `Nothing due for renewal in the next ${soonDays} days` : "No pending renewals"}
        </Empty>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 640 }}>
            <thead>
              <tr>
                <th style={th()}>Client</th>
                <th style={th()}>Services</th>
                <th style={th()}>Renewal Date</th>
                <th style={th("right")}>Amount</th>
                <th style={th()}>Status</th>
                <th style={th("right")} />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.contractId}>
                  <td style={td()}>
                    <div style={{ fontWeight: 600, color: T.textPrimary }}>{r.companyName || r.clientName}</div>
                    <div style={{ fontSize: 11.5, color: T.textMuted }}>{r.projectName}</div>
                  </td>
                  <td style={td({ color: T.textSecondary })}>{r.serviceName}</td>
                  <td style={td({ whiteSpace: "nowrap" })}>
                    <div style={{ color: T.textPrimary }}>{fmtShortDate(r.renewalDate)}</div>
                    <div style={{ fontSize: 11.5, color: r.daysLeft < 0 ? T.red : T.textMuted }}>{daysLabel(r.daysLeft)}</div>
                  </td>
                  <td style={td({ textAlign: "right", fontWeight: 700, color: T.textPrimary, whiteSpace: "nowrap" })}>{fmtINR(r.renewalAmount)}</td>
                  <td style={td()}><Chip label={r.status} /></td>
                  <td style={td({ textAlign: "right", whiteSpace: "nowrap" })}>
                    <div style={{ display: "inline-flex", gap: 6 }}>
                      <button type="button" style={{ ...linkBtn, borderColor: T.brandMid, color: T.brand, background: T.brandLight }} onClick={() => renew(r)}>
                        <RotateCcw size={13} /> Renew
                      </button>
                      <button type="button" style={linkBtn} onClick={() => openClient(r.clientId, "contracts")}>
                        View <ArrowUpRight size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

// ─── Balance Due ──────────────────────────────────────────────────────────
function BalanceDueCard({ balanceDue, total, overdueCount, openClient }) {
  return (
    <Card
      Icon={Wallet} iconColor={T.brand} iconBg={T.brandLight}
      title="Balance Due"
      subtitle="Contracts with money still to collect, overdue first"
      right={
        <div style={{ display: "flex", gap: 18 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: T.textMuted }}>Overdue</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.red }}>{overdueCount}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: T.textMuted }}>Total Balance</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.brand }}>{fmtINR(total)}</div>
          </div>
        </div>
      }
    >
      {balanceDue.length === 0 ? (
        <Empty Icon={CheckCircle2} color={T.green}>All your contracts are fully paid</Empty>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 680 }}>
            <thead>
              <tr>
                <th style={th()}>Client</th>
                <th style={th("right")}>Contract</th>
                <th style={th("right")}>Received</th>
                <th style={th("right")}>Balance</th>
                <th style={th()}>Due Date</th>
                <th style={th()}>Status</th>
                <th style={th("right")} />
              </tr>
            </thead>
            <tbody>
              {balanceDue.map((b) => (
                <tr key={b.contractId}>
                  <td style={td()}>
                    <div style={{ fontWeight: 600, color: T.textPrimary }}>{b.companyName || b.clientName}</div>
                    <div style={{ fontSize: 11.5, color: T.textMuted }}>{b.projectName}</div>
                  </td>
                  <td style={td({ textAlign: "right", color: T.textSecondary, whiteSpace: "nowrap" })}>{fmtINR(b.contractAmount)}</td>
                  <td style={td({ textAlign: "right", color: T.green, whiteSpace: "nowrap" })}>{fmtINR(b.receivedAmount)}</td>
                  <td style={td({ textAlign: "right", fontWeight: 700, color: T.textPrimary, whiteSpace: "nowrap" })}>{fmtINR(b.balance)}</td>
                  <td style={td({ color: T.textSecondary, whiteSpace: "nowrap" })}>{b.dueDate ? fmtShortDate(b.dueDate) : "—"}</td>
                  <td style={td()}><Chip label={b.status} /></td>
                  <td style={td({ textAlign: "right" })}>
                    <button type="button" style={linkBtn} onClick={() => openClient(b.clientId, "payments")}>
                      Payments <ArrowUpRight size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

// ─── Deliverables ─────────────────────────────────────────────────────────
function ContractDeliverables({ contract, items, expanded, onToggle, openClient }) {
  const pct = contract.total ? Math.round((contract.completed / contract.total) * 100) : 0;
  const Chevron = expanded ? ChevronDown : ChevronRight;
  return (
    <div style={{ border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", border: "none",
          background: T.inputBg, cursor: "pointer", fontFamily: "inherit", textAlign: "left", flexWrap: "wrap",
        }}
      >
        <Chevron size={16} color={T.textMuted} style={{ flexShrink: 0 }} />
        <div style={{ flex: "1 1 200px", minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 13.5, color: T.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {contract.companyName || contract.clientName}
          </div>
          <div style={{ fontSize: 11.5, color: T.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{contract.projectName}</div>
        </div>
        <div style={{ flex: "1 1 160px", display: "flex", alignItems: "center", gap: 10, minWidth: 140 }}>
          <div style={{ flex: 1, height: 6, background: T.border, borderRadius: 99, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: T.green, borderRadius: 99 }} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: T.textPrimary, whiteSpace: "nowrap" }}>{contract.completed}/{contract.total} done</span>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {contract.pending > 0 && <Chip label="Pending" />}
          {contract.inProgress > 0 && <Chip label="In Progress" />}
          {contract.completed === contract.total && <Chip label="Completed" />}
        </div>
      </button>
      {expanded && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 620 }}>
            <thead>
              <tr>
                <th style={th()}>Deliverable</th>
                <th style={th()}>Assigned To</th>
                <th style={th()}>Progress</th>
                <th style={th()}>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i._id}>
                  <td style={td()}>
                    <div style={{ color: T.textPrimary, fontWeight: 500 }}>{i.title.replace(/^.*? — /, "")}</div>
                    <div style={{ fontSize: 11.5, color: T.textMuted }}>{i.categoryLabel}</div>
                  </td>
                  <td style={td({ color: i.assignee ? T.textSecondary : T.red, whiteSpace: "nowrap" })}>
                    {i.assignee || (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><AlertTriangle size={12} /> Unassigned</span>
                    )}
                  </td>
                  <td style={td({ color: T.textSecondary, whiteSpace: "nowrap" })}>{progressText(i)}</td>
                  <td style={td()}><Chip label={i.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: "10px 14px", textAlign: "right" }}>
            <button type="button" style={linkBtn} onClick={() => openClient(contract.clientId, "deliverables")}>
              Open in client page <ArrowUpRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function DeliverablesCard({ contracts, openClient }) {
  const [filter, setFilter] = useState("open");
  const [expandedId, setExpandedId] = useState(null);

  const matches = (i) =>
    filter === "all" ? true : filter === "open" ? i.status !== "Completed" : i.status === filter;
  const visible = contracts
    .map((c) => ({ contract: c, items: c.items.filter(matches) }))
    .filter((v) => v.items.length > 0);
  const countItems = (fn) => contracts.reduce((n, c) => n + c.items.filter(fn).length, 0);

  // Open the first contract by default so the section never looks empty.
  const effectiveExpanded = expandedId ?? visible[0]?.contract.contractId;

  return (
    <Card
      Icon={PackageCheck} iconColor={T.green} iconBg="#dcfce7"
      title="Deliverables"
      subtitle="Work progress on your clients' active contracts"
      right={
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { value: "open", label: "Not done", count: countItems((i) => i.status !== "Completed") },
            { value: "Pending", label: "Pending", count: countItems((i) => i.status === "Pending") },
            { value: "In Progress", label: "In Progress", count: countItems((i) => i.status === "In Progress") },
            { value: "Completed", label: "Completed", count: countItems((i) => i.status === "Completed") },
            { value: "all", label: "All" },
          ]}
        />
      }
    >
      {visible.length === 0 ? (
        <Empty Icon={filter === "open" ? CheckCircle2 : Inbox} color={filter === "open" ? T.green : T.textMuted}>
          {contracts.length === 0 ? "No active contracts with deliverables yet" : filter === "open" ? "Everything is delivered" : "Nothing in this status"}
        </Empty>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {visible.map(({ contract, items }) => (
            <ContractDeliverables
              key={contract.contractId}
              contract={contract}
              items={items}
              expanded={effectiveExpanded === contract.contractId}
              onToggle={() => setExpandedId(effectiveExpanded === contract.contractId ? "" : contract.contractId)}
              openClient={openClient}
            />
          ))}
        </div>
      )}
    </Card>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────
export default function SalesOverviewSection() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await getSalesDashboard();
      setData(response.data);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't load your dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openClient = (clientId, tab) => navigate(`/clients/${clientId}${tab ? `?tab=${tab}` : ""}`);
  const renew = (r) => navigate(`/clients/${r.clientId}/contracts/new?renewFrom=${r.contractId}`);

  const s = data?.summary;
  const deliveredPct = useMemo(
    () => (s?.totalDeliverables ? Math.round((s.completedDeliverables / s.totalDeliverables) * 100) : 0),
    [s]
  );

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
        <div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700, color: T.textPrimary, margin: 0 }}>My Dashboard</h1>
          <p style={{ fontSize: 13, color: T.textSecondary, margin: "4px 0 0" }}>Renewals, payments and delivery status for your clients only.</p>
        </div>
        <button type="button" style={linkBtn} onClick={load} disabled={loading}>
          <RefreshCw size={13} style={loading ? { animation: "spin 1s linear infinite" } : undefined} /> Refresh
        </button>
      </div>

      {error && (
        <div style={{ padding: "12px 14px", borderRadius: 12, background: T.redBg, border: `1px solid ${T.redBorder}`, color: T.red, fontSize: 13, marginBottom: 14 }}>
          {error}
        </div>
      )}

      {!data && loading && <Empty Icon={RefreshCw}>Loading your dashboard…</Empty>}

      {data && (
        <>
          <div style={kpiGridStyle}>
            <KpiCard Icon={Users} label="My Clients" value={s.totalClients} color={T.brand} bgColor={T.brandLight} sub={`${s.convertedClients} converted`} />
            <KpiCard Icon={FileText} label="Active Contracts" value={s.activeContracts} color="#2563eb" bgColor="#eff6ff" />
            <KpiCard
              Icon={Wallet} label="Balance Due" value={fmtINR(s.totalBalanceDue)} color={T.red} bgColor={T.redBg}
              sub={s.overdueBalanceCount ? `${s.overdueBalanceCount} overdue` : "Nothing overdue"}
            />
            <KpiCard
              Icon={CalendarClock} label={`Renewals (${s.renewalSoonDays} days)`} value={s.renewalsSoonCount} color={T.yellow} bgColor="#fffbeb"
              sub={s.renewalsSoonCount ? fmtINR(s.renewalsSoonAmount) : "None due soon"}
            />
            <KpiCard
              Icon={PackageCheck} label="Deliverables Done" value={`${s.completedDeliverables}/${s.totalDeliverables}`} color={T.green} bgColor={T.greenBg}
              sub={`${deliveredPct}% complete`}
            />
          </div>

          <RenewalsCard renewals={data.renewals} soonDays={s.renewalSoonDays} openClient={openClient} renew={renew} />
          <BalanceDueCard balanceDue={data.balanceDue} total={s.totalBalanceDue} overdueCount={s.overdueBalanceCount} openClient={openClient} />
          <DeliverablesCard contracts={data.deliverables} openClient={openClient} />
        </>
      )}
    </div>
  );
}
