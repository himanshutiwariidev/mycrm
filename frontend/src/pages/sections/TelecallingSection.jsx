import React, { useCallback, useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  PhoneCall, Percent, CalendarCheck, CheckCircle2, Trophy, BellRing, BarChart3, PieChart, Headset, RefreshCw, Award,
} from "lucide-react";
import DateRangePicker, { computeRangeForPreset } from "../../components/DateRangePicker";
import { getTelecallingOverview } from "../../services/telecallingApi";
import { CALL_OUTCOMES } from "../../config/telecalling";
import { KpiTile, SectionCard, Badge, Btn, Avatar, EmptyState, fmtAgo, fmtDuration } from "../telecaller/teleUi";
import CallHistorySection from "../telecaller/CallHistorySection";

const RANK_TONE = ["#f59e0b", "#94a3b8", "#c2410c"];

function TrendTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const get = (k) => payload.find((p) => p.dataKey === k)?.value || 0;
  return (
    <div style={{ background: "#0f172a", color: "#fff", borderRadius: 10, padding: "8px 11px", fontSize: 12 }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
      <div>Connected: <strong>{get("connected")}</strong></div>
      <div>Not connected: <strong>{get("notConnected")}</strong></div>
      <div>Meetings booked: <strong>{payload[0]?.payload?.meetings || 0}</strong></div>
    </div>
  );
}

/** Super admin: telecalling team performance, outcomes and every call. */
export default function TelecallingSection() {
  const [range, setRange] = useState(() => ({ ...computeRangeForPreset("thisMonth"), presetKey: "thisMonth" }));
  const [telecaller, setTelecaller] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data: res } = await getTelecallingOverview({ from: range.start.toISOString(), to: range.end.toISOString(), telecaller: telecaller || undefined });
      setData(res);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't load telecalling data");
    } finally {
      setLoading(false);
    }
  }, [range.start, range.end, telecaller]);

  useEffect(() => { load(); }, [load]);

  const s = data?.summary;
  const outcomes = data?.outcomes || {};
  const totalOutcomes = Object.values(outcomes).reduce((a, n) => a + n, 0);
  const ordered = Object.keys(CALL_OUTCOMES).filter((k) => outcomes[k]).sort((a, b) => outcomes[b] - outcomes[a]);
  const leaderboard = data?.leaderboard || [];
  const allTelecallers = leaderboard.map((r) => r.telecaller);

  return (
    <div className="tc-page fade-up">
      <div className="tc-head">
        <div>
          <h1 style={{ fontSize: 20 }}>Telecalling</h1>
          <p>Calls, client responses and meetings booked by the telecalling team.</p>
        </div>
        <div className="tc-head-actions" style={{ alignItems: "center" }}>
          <select className="tc-input" value={telecaller} onChange={(e) => setTelecaller(e.target.value)} style={{ width: "auto", minWidth: 180 }} aria-label="Telecaller">
            <option value="">All telecallers</option>
            {allTelecallers.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
          </select>
          <DateRangePicker value={range} onChange={setRange} />
          <Btn variant="secondary" Icon={RefreshCw} onClick={load} disabled={loading}>Refresh</Btn>
        </div>
      </div>

      {error && <div role="alert" style={{ marginBottom: 14, color: "#dc2626", fontSize: 13, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: "10px 14px" }}>{error}</div>}

      {s && (
        <>
          <div className="tc-kpis">
            <KpiTile Icon={PhoneCall} tone="#f7931e" label="Total calls" value={s.totalCalls.toLocaleString("en-IN")} sub={`${s.uniqueLeads} leads · ${s.telecallers} telecaller${s.telecallers === 1 ? "" : "s"}`} />
            <KpiTile Icon={Percent} tone="#0891b2" label="Connect rate" value={`${s.connectRate}%`} sub={`${s.connected} connected · avg ${fmtDuration(s.avgTalkSec)}`} />
            <KpiTile Icon={CalendarCheck} tone="#7c3aed" label="Meetings booked" value={s.meetingsBooked} sub={`${s.meetingRate}% of connected calls`} />
            <KpiTile Icon={CheckCircle2} tone="#16a34a" label="Meetings completed" value={s.meetingsCompleted} sub={`${s.converted} converted to clients`} />
            <KpiTile Icon={BellRing} tone="#dc2626" label="Follow-ups due" value={s.followUpsDue} sub="Across the team, today" />
          </div>

          <SectionCard title="Team leaderboard" subtitle="Ranked by meetings booked, then calls" Icon={Trophy} tone="#f59e0b" className="" bodyClassName="">
            {!leaderboard.length ? (
              <EmptyState Icon={Headset} title="No telecallers yet" text="Create a user with the Telecaller role from New User." />
            ) : (
              <div className="tc-table-wrap">
                <table className="tc-table" style={{ minWidth: 900 }}>
                  <thead>
                    <tr>
                      <th style={{ width: 44 }}>#</th>
                      <th>Telecaller</th>
                      <th style={{ textAlign: "right" }}>Calls</th>
                      <th style={{ textAlign: "right" }}>Connected</th>
                      <th style={{ minWidth: 150 }}>Connect rate</th>
                      <th style={{ textAlign: "right" }}>Avg talk</th>
                      <th style={{ textAlign: "right" }}>Meetings</th>
                      <th style={{ textAlign: "right" }}>Completed</th>
                      <th style={{ textAlign: "right" }}>Converted</th>
                      <th style={{ textAlign: "right" }}>Follow-ups due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((r, i) => (
                      <tr key={r.telecaller._id}>
                        <td>
                          {i < 3 && r.calls > 0
                            ? <Award size={18} color={RANK_TONE[i]} aria-label={`Rank ${i + 1}`} />
                            : <span style={{ color: "#94a3b8", fontWeight: 700 }}>{i + 1}</span>}
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <Avatar name={r.telecaller.name} />
                            <div>
                              <div className="tc-cell-main">{r.telecaller.name}</div>
                              <div className="tc-cell-sub">{r.telecaller.isActive ? r.telecaller.email : "Inactive"}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ textAlign: "right" }} className="tc-cell-main">{r.calls}</td>
                        <td style={{ textAlign: "right" }}>{r.connected}</td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div className="tc-bar" style={{ flex: 1 }}><span style={{ width: `${r.connectRate}%`, background: r.connectRate >= 60 ? "#16a34a" : r.connectRate >= 35 ? "#f59e0b" : "#dc2626" }} /></div>
                            <span style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", minWidth: 34, textAlign: "right" }}>{r.connectRate}%</span>
                          </div>
                        </td>
                        <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>{fmtDuration(r.avgTalkSec)}</td>
                        <td style={{ textAlign: "right" }}><Badge meta={{ color: "#7c3aed", bg: "#f3e8ff" }} size="sm">{r.meetingsBooked}</Badge></td>
                        <td style={{ textAlign: "right" }}>{r.meetingsCompleted}</td>
                        <td style={{ textAlign: "right" }}>{r.converted ? <Badge meta={{ color: "#047857", bg: "#d1fae5" }} size="sm">{r.converted}</Badge> : 0}</td>
                        <td style={{ textAlign: "right", color: r.followUpsDue ? "#dc2626" : "#94a3b8", fontWeight: 700 }}>{r.followUpsDue}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          <div className="tc-grid-2" style={{ marginTop: 18 }}>
            <SectionCard title="Daily calls" subtitle="Connected vs not connected" Icon={BarChart3} tone="#2563eb">
              <div style={{ height: 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.trend} margin={{ top: 6, right: 6, left: -18, bottom: 0 }} barCategoryGap="24%">
                    <CartesianGrid vertical={false} stroke="#eef0f5" />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} interval="preserveStartEnd" minTickGap={18} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} />
                    <Tooltip content={<TrendTooltip />} cursor={{ fill: "rgba(37,99,235,.06)" }} />
                    <Bar dataKey="connected" stackId="c" fill="#16a34a" isAnimationActive={false} />
                    <Bar dataKey="notConnected" stackId="c" fill="#cbd5e1" radius={[5, 5, 0, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>

            <SectionCard title="Client responses" subtitle="Call outcomes in this period" Icon={PieChart} tone="#7c3aed">
              {!totalOutcomes ? (
                <EmptyState Icon={PieChart} title="No calls in this period" />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                  {ordered.map((k) => {
                    const o = CALL_OUTCOMES[k];
                    const pct = Math.round((outcomes[k] / totalOutcomes) * 100);
                    return (
                      <div key={k}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 5 }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 7, color: "#0f172a", fontWeight: 600 }}><o.Icon size={13} color={o.color} /> {o.label}</span>
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

          <SectionCard title="Latest calls" subtitle="Most recent activity in this period" Icon={Headset} tone="#0891b2" className="" bodyClassName="">
            {!data.recentCalls.length ? (
              <EmptyState Icon={Headset} title="No calls logged yet" />
            ) : (
              data.recentCalls.map((c) => {
                const o = CALL_OUTCOMES[c.outcome];
                return (
                  <div key={c._id} className="tc-list-row">
                    <Avatar name={c.telecaller?.name || "?"} size={30} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: "#0f172a" }}>
                        <strong>{c.telecaller?.name}</strong> called <strong>{c.lead?.name}</strong>{c.lead?.company ? ` (${c.lead.company})` : ""}
                      </div>
                      {c.notes && <div className="tc-cell-sub" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>“{c.notes}”</div>}
                    </div>
                    <Badge meta={o} size="sm">{o?.short || o?.label}</Badge>
                    <span style={{ fontSize: 11.5, color: "#94a3b8", whiteSpace: "nowrap", minWidth: 70, textAlign: "right" }}>{fmtAgo(c.calledAt)}</span>
                  </div>
                );
              })
            )}
          </SectionCard>

          <div style={{ marginTop: 18 }}>
            <CallHistorySection embedded showTelecaller telecallerId={telecaller} />
          </div>
        </>
      )}

      {!s && loading && <EmptyState Icon={RefreshCw} title="Loading telecalling data…" />}
    </div>
  );
}
