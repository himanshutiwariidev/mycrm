import React, { useCallback, useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  PhoneCall, PhoneOutgoing, Percent, CalendarCheck, BellRing, BarChart3, PieChart, CalendarClock, UserPlus, Phone, RefreshCw,
} from "lucide-react";
import { getMyTelecallingStats } from "../../services/telecallingApi";
import { CALL_OUTCOMES, LEAD_STATUS, MEETING_MODES } from "../../config/telecalling";
import { KpiTile, SectionCard, Badge, Btn, EmptyState, Avatar, fmtWhen, fmtDuration, isOverdue } from "./teleUi";

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const get = (k) => payload.find((p) => p.dataKey === k)?.value || 0;
  return (
    <div style={{ background: "#0f172a", color: "#fff", borderRadius: 10, padding: "8px 11px", fontSize: 12, boxShadow: "0 10px 24px rgba(0,0,0,.2)" }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
      <div>Connected: <strong>{get("connected")}</strong></div>
      <div>Not connected: <strong>{get("notConnected")}</strong></div>
    </div>
  );
}

export default function TelecallerOverview({ userName, onLogCall, onAddLead, onOpenLeads, refreshKey }) {
  const [month, setMonth] = useState(null);
  const [recent, setRecent] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const now = new Date();
      const twoWeeks = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 13);
      const endToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      const [m, r] = await Promise.all([
        getMyTelecallingStats(),
        getMyTelecallingStats({ from: twoWeeks.toISOString(), to: endToday.toISOString() }),
      ]);
      setMonth(m.data);
      setRecent(r.data);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't load your dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  const first = (userName || "").replace(/\(.*?\)/g, "").trim().split(" ")[0];
  const outcomes = month?.outcomes || {};
  const totalOutcomes = Object.values(outcomes).reduce((s, n) => s + n, 0);
  const ordered = Object.keys(CALL_OUTCOMES).filter((k) => outcomes[k]).sort((a, b) => outcomes[b] - outcomes[a]);

  return (
    <div className="tc-page">
      <div className="tc-head">
        <div>
          <h1>{greeting()}{first ? `, ${first}` : ""}</h1>
          <p>Here&apos;s your calling day at a glance.</p>
        </div>
        <div className="tc-head-actions">
          <Btn variant="secondary" Icon={RefreshCw} onClick={load} disabled={loading}>Refresh</Btn>
          <Btn variant="secondary" Icon={UserPlus} onClick={onAddLead}>Add lead</Btn>
          <Btn Icon={PhoneOutgoing} onClick={() => onOpenLeads("due")}>Start calling</Btn>
        </div>
      </div>

      {error && <div role="alert" style={{ marginBottom: 14, color: "#dc2626", fontSize: 13, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: "10px 14px" }}>{error}</div>}

      {month && (
        <>
          <div className="tc-kpis">
            <KpiTile Icon={PhoneCall} tone="#f7931e" label="Calls today" value={month.today.totalCalls} sub={`${month.today.connected} connected`} />
            <KpiTile Icon={PhoneOutgoing} tone="#2563eb" label="Calls this month" value={month.period.totalCalls.toLocaleString("en-IN")} sub={`${month.period.uniqueLeads} leads reached`} />
            <KpiTile Icon={Percent} tone="#0891b2" label="Connect rate" value={`${month.period.connectRate}%`} sub={`Avg talk ${fmtDuration(month.period.avgTalkSec)}`} />
            <KpiTile Icon={CalendarCheck} tone="#7c3aed" label="Meetings booked" value={month.period.meetingsBooked} sub={`${month.period.meetingRate}% of connected calls`} />
            <KpiTile
              Icon={BellRing} tone="#dc2626" label="Follow-ups due" value={month.followUps.due}
              sub={month.followUps.overdue ? `${month.followUps.overdue} overdue` : "All on time"} subTone={month.followUps.overdue ? "#dc2626" : undefined}
            />
          </div>

          <div className="tc-grid-2">
            <SectionCard title="Calls — last 14 days" subtitle="Connected vs not connected" Icon={BarChart3} tone="#2563eb">
              <div style={{ height: 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={recent?.trend || []} margin={{ top: 6, right: 6, left: -18, bottom: 0 }} barCategoryGap="28%">
                    <CartesianGrid vertical={false} stroke="#eef0f5" />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} interval={1} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(37,99,235,.06)" }} />
                    <Bar dataKey="connected" stackId="c" fill="#16a34a" isAnimationActive={false} />
                    <Bar dataKey="notConnected" stackId="c" fill="#cbd5e1" radius={[5, 5, 0, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: "flex", gap: 16, fontSize: 12, color: "#64748b", marginTop: 6 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><i style={{ width: 10, height: 10, borderRadius: 3, background: "#16a34a" }} /> Connected</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><i style={{ width: 10, height: 10, borderRadius: 3, background: "#cbd5e1" }} /> Not connected</span>
              </div>
            </SectionCard>

            <SectionCard title="Call outcomes" subtitle="This month" Icon={PieChart} tone="#7c3aed">
              {!totalOutcomes ? (
                <EmptyState Icon={PieChart} title="No calls yet this month" text="Your outcome mix will show here." />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {ordered.map((k) => {
                    const o = CALL_OUTCOMES[k];
                    const pct = Math.round((outcomes[k] / totalOutcomes) * 100);
                    return (
                      <div key={k}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 5 }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 7, color: "#0f172a", fontWeight: 600 }}>
                            <o.Icon size={13} color={o.color} /> {o.label}
                          </span>
                          <span style={{ color: "#64748b" }}><strong style={{ color: "#0f172a" }}>{outcomes[k]}</strong> · {pct}%</span>
                        </div>
                        <div className="tc-bar"><span style={{ width: `${pct}%`, background: o.color }} /></div>
                      </div>
                    );
                  })}
                </div>
              )}
            </SectionCard>
          </div>

          <div className="tc-grid-2-even">
            <SectionCard
              title="Follow-ups due"
              subtitle="Calls you planned for today or earlier"
              Icon={BellRing}
              tone="#dc2626"
              right={month.followUps.due > 0 && <Btn variant="ghost" size="sm" onClick={() => onOpenLeads("due")}>View all</Btn>}
            >
              {!month.followUps.list.length ? (
                <EmptyState Icon={BellRing} title="You're all caught up" text="No follow-ups due right now." />
              ) : (
                month.followUps.list.map((lead) => (
                  <div key={lead._id} className="tc-list-row">
                    <Avatar name={lead.name} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="tc-cell-main" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lead.name}{lead.company ? ` · ${lead.company}` : ""}</div>
                      <div className="tc-cell-sub" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <span style={{ color: isOverdue(lead.nextFollowUpAt) ? "#dc2626" : "#64748b", fontWeight: 600 }}>{fmtWhen(lead.nextFollowUpAt)}</span>
                        {lead.lastOutcome && <Badge meta={CALL_OUTCOMES[lead.lastOutcome]} size="sm">{CALL_OUTCOMES[lead.lastOutcome].short || CALL_OUTCOMES[lead.lastOutcome].label}</Badge>}
                      </div>
                    </div>
                    <Btn size="sm" Icon={Phone} onClick={() => onLogCall(lead)}>Call</Btn>
                  </div>
                ))
              )}
            </SectionCard>

            <SectionCard title="Upcoming meetings you booked" subtitle="Handled by the sales team" Icon={CalendarClock} tone="#7c3aed">
              {!month.upcomingMeetings.length ? (
                <EmptyState Icon={CalendarClock} title="No upcoming meetings" text="Book one from a call when a client is ready to meet." />
              ) : (
                month.upcomingMeetings.map((m) => {
                  const mode = MEETING_MODES[m.mode];
                  return (
                    <div key={m._id} className="tc-list-row">
                      <span className="tc-card-icon" style={{ background: "#f3e8ff", color: "#7c3aed" }}>{mode ? <mode.Icon size={15} /> : <CalendarClock size={15} />}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="tc-cell-main" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.company || m.contactName}</div>
                        <div className="tc-cell-sub">{fmtWhen(m.meetingDate)} · with {m.salesPerson?.name || "sales"}</div>
                      </div>
                      <Badge meta={LEAD_STATUS["meeting-scheduled"]} size="sm">{mode?.label || "Meeting"}</Badge>
                    </div>
                  );
                })
              )}
            </SectionCard>
          </div>
        </>
      )}

      {!month && loading && <EmptyState Icon={RefreshCw} title="Loading your dashboard…" />}
    </div>
  );
}
