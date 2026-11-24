import React, { useCallback, useEffect, useState } from "react";
import { Users, IndianRupee, Wallet, CalendarCheck, MapPin, RefreshCw, UserPlus, ArrowLeft, TrendingUp, ChevronRight } from "lucide-react";
import { getSalesTeam } from "../../services/clientApi";
import { T, KpiCard, kpiGridStyle } from "./shared";
import { fmtINR, Card, Segmented, Empty, th, td, linkBtn } from "./salesUi";
import SalesOverviewSection from "./SalesOverviewSection";
import "../telecaller/telecaller.css";

const PERIODS = [
  { value: "month", label: "This month" },
  { value: "last", label: "Last month" },
  { value: "quarter", label: "Last 3 months" },
  { value: "year", label: "This year" },
];

function periodRange(key) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const end = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  if (key === "last") return { from: new Date(y, m - 1, 1), to: end(new Date(y, m, 0)) };
  if (key === "quarter") return { from: new Date(y, m - 2, 1), to: end(new Date(y, m + 1, 0)) };
  if (key === "year") return { from: new Date(y, 0, 1), to: end(new Date(y, 11, 31)) };
  return { from: new Date(y, m, 1), to: end(new Date(y, m + 1, 0)) };
}

/**
 * Sales manager's home: the whole sales team side by side — book, sales and
 * collections in the period, client meetings and visits. A row opens that
 * person's own dashboard (the same one they see); "Whole team" opens all of it.
 */
export default function SalesTeamSection({ onOpenMeetings }) {
  const [period, setPeriod] = useState("month");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // null = the team table; "" = whole team's book; an id = one sales person.
  const [focus, setFocus] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { from, to } = periodRange(period);
      const { data: res } = await getSalesTeam({ from: from.toISOString(), to: to.toISOString() });
      setData(res);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't load the sales team");
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { load(); }, [load]);

  if (focus !== null) {
    const person = data?.team.find((r) => r.salesPerson._id === focus)?.salesPerson;
    return (
      <div>
        <button type="button" style={{ ...linkBtn, marginBottom: 16 }} onClick={() => setFocus(null)} data-back-to-team>
          <ArrowLeft size={13} /> Sales team
        </button>
        <SalesOverviewSection
          key={focus}
          salesPersonId={focus}
          title={person ? `${person.name}'s book` : "Whole sales team"}
          subtitle={person ? `Renewals, payments and delivery for ${person.name}'s clients.` : "Renewals, payments and delivery across every sales person's clients."}
        />
      </div>
    );
  }

  const s = data?.summary;
  const periodLabel = PERIODS.find((p) => p.value === period)?.label.toLowerCase();

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
        <div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700, color: T.textPrimary, margin: 0 }}>Sales Team</h1>
          <p style={{ fontSize: 13, color: T.textSecondary, margin: "4px 0 0" }}>Every sales person&apos;s clients, sales, collections, meetings and visits.</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <Segmented options={PERIODS} value={period} onChange={setPeriod} />
          <button type="button" style={linkBtn} onClick={load} disabled={loading}>
            <RefreshCw size={13} style={loading ? { animation: "spin 1s linear infinite" } : undefined} /> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: "12px 14px", borderRadius: 12, background: T.redBg, border: `1px solid ${T.redBorder}`, color: T.red, fontSize: 13, marginBottom: 14 }}>{error}</div>
      )}
      {!data && loading && <Empty Icon={RefreshCw}>Loading the sales team…</Empty>}

      {data && (
        <>
          {s.unassignedMeetings > 0 && (
            <button type="button" className="tc-assign-banner" onClick={onOpenMeetings} data-team-unassigned>
              <UserPlus size={17} />
              <span><strong>{s.unassignedMeetings} meeting{s.unassignedMeetings === 1 ? "" : "s"}</strong> booked by telecallers {s.unassignedMeetings === 1 ? "is" : "are"} waiting for a sales person</span>
              <span className="tc-assign-banner-cta">Assign now →</span>
            </button>
          )}

          <div style={kpiGridStyle}>
            <KpiCard Icon={Users} label="Sales People" value={s.salesPeople} color={T.brand} bgColor={T.brandLight} sub={`${s.clients} clients`} />
            <KpiCard Icon={TrendingUp} label="Sales Booked" value={fmtINR(s.booked)} color="#2563eb" bgColor="#eff6ff" sub={periodLabel} />
            <KpiCard Icon={IndianRupee} label="Collected" value={fmtINR(s.collected)} color={T.green} bgColor={T.greenBg} sub={periodLabel} />
            <KpiCard Icon={Wallet} label="Outstanding" value={fmtINR(s.outstanding)} color={T.red} bgColor={T.redBg} sub={s.overdue ? `${s.overdue} overdue` : "Nothing overdue"} />
            <KpiCard Icon={CalendarCheck} label="Meetings" value={s.meetingsUpcoming} color="#7c3aed" bgColor="#f5f3ff" sub={`upcoming · ${s.meetingsCompleted} done, ${s.meetingsConverted} converted`} />
            <KpiCard Icon={MapPin} label="Client Visits" value={s.visits} color="#dc2626" bgColor="#fef2f2" sub={periodLabel} />
          </div>

          <Card
            Icon={Users} iconColor={T.brand} iconBg={T.brandLight}
            title="Team performance"
            subtitle={`Sales and collections for ${periodLabel}; outstanding is everything still due. Click a person to open their book.`}
            right={<button type="button" style={linkBtn} onClick={() => setFocus("")} data-whole-team>Whole team&apos;s book <ChevronRight size={13} /></button>}
          >
            {data.team.length === 0 ? (
              <Empty Icon={Users}>No sales people yet — the super admin can add them under New User.</Empty>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 860 }} data-team-table>
                  <thead>
                    <tr>
                      <th style={th()}>Sales person</th>
                      <th style={th("right")}>Clients</th>
                      <th style={th("right")}>Booked</th>
                      <th style={th("right")}>Collected</th>
                      <th style={th("right")}>Outstanding</th>
                      <th style={th("right")}>Meetings</th>
                      <th style={th("right")}>Converted</th>
                      <th style={th("right")}>Visits</th>
                      <th style={th()} />
                    </tr>
                  </thead>
                  <tbody>
                    {data.team.map((r) => (
                      <tr key={r.salesPerson._id} className="data-row" style={{ cursor: "pointer" }} onClick={() => setFocus(r.salesPerson._id)}>
                        <td style={td()}>
                          <div style={{ fontWeight: 600, color: T.textPrimary }}>
                            {r.salesPerson.name}
                            {!r.salesPerson.isActive && <span style={{ marginLeft: 6, fontSize: 11, color: T.textMuted }}>(inactive)</span>}
                          </div>
                          <div style={{ fontSize: 11.5, color: T.textMuted }}>{r.salesPerson.email}</div>
                        </td>
                        <td style={td({ textAlign: "right" })}>
                          {r.clients}
                          <div style={{ fontSize: 11.5, color: T.textMuted }}>{r.convertedClients} converted</div>
                        </td>
                        <td style={td({ textAlign: "right", fontWeight: 600 })}>{fmtINR(r.booked)}</td>
                        <td style={td({ textAlign: "right", fontWeight: 600, color: T.green })}>{fmtINR(r.collected)}</td>
                        <td style={td({ textAlign: "right" })}>
                          <span style={{ fontWeight: 600, color: r.outstanding ? T.red : T.textSecondary }}>{fmtINR(r.outstanding)}</span>
                          {r.overdue > 0 && <div style={{ fontSize: 11.5, color: T.red }}>{r.overdue} overdue</div>}
                        </td>
                        <td style={td({ textAlign: "right" })}>
                          {r.meetingsUpcoming} upcoming
                          <div style={{ fontSize: 11.5, color: r.meetingsPendingUpdate ? "#b45309" : T.textMuted }}>
                            {r.meetingsCompleted} done{r.meetingsPendingUpdate ? ` · ${r.meetingsPendingUpdate} not updated` : ""}
                          </div>
                        </td>
                        <td style={td({ textAlign: "right" })}>{r.meetingsConverted}</td>
                        <td style={td({ textAlign: "right" })}>{r.visits}</td>
                        <td style={td({ textAlign: "right" })}><ChevronRight size={15} color={T.textMuted} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
