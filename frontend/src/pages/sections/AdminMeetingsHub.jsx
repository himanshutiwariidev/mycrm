import React, { useCallback, useEffect, useState } from "react";
import { CalendarCheck, CalendarClock, ClipboardCheck, RefreshCw, Users } from "lucide-react";
import { getAdminClientMeetings, getSalesPeople } from "../../services/telecallingApi";
import { MEETING_STATUS } from "../../config/telecalling";
import { SectionCard, EmptyState, Btn } from "../telecaller/teleUi";
import MeetingCard from "../telecaller/MeetingCard";
import MeetingUpdateModal from "../telecaller/MeetingUpdateModal";
import MeetingsSection from "./MeetingsSection";
import "../telecaller/telecaller.css";

const SCOPES = [
  { key: "upcoming", label: "Upcoming" },
  { key: "today", label: "Today" },
  { key: "past", label: "Past & updated" },
  { key: "all", label: "All" },
];

function ClientMeetingsPanel() {
  const [scope, setScope] = useState("upcoming");
  const [status, setStatus] = useState("");
  const [salesPerson, setSalesPerson] = useState("");
  const [salesPeople, setSalesPeople] = useState([]);
  const [data, setData] = useState({ meetings: [], statusCounts: {} });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);

  useEffect(() => {
    getSalesPeople().then(({ data: res }) => setSalesPeople(res.salesPeople || [])).catch(() => setSalesPeople([]));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await getAdminClientMeetings({ scope, status: status || undefined, salesPerson: salesPerson || undefined });
      setData(res);
    } catch {
      setData({ meetings: [], statusCounts: {} });
    } finally {
      setLoading(false);
    }
  }, [scope, status, salesPerson]);

  useEffect(() => { load(); }, [load]);

  const counts = data.statusCounts || {};

  return (
    <>
      <div className="tc-kpis" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
        {Object.entries(MEETING_STATUS).map(([k, m]) => (
          <button
            key={k}
            type="button"
            onClick={() => setStatus(status === k ? "" : k)}
            className="tc-kpi"
            style={{ cursor: "pointer", textAlign: "left", fontFamily: "inherit", borderColor: status === k ? m.color : undefined, boxShadow: status === k ? `0 0 0 3px ${m.color}22` : undefined }}
            aria-pressed={status === k}
          >
            <div className="tc-kpi-icon" style={{ background: m.bg, color: m.color }}><CalendarCheck size={18} /></div>
            <div className="tc-kpi-body">
              <div className="tc-kpi-label">{m.label}</div>
              <div className="tc-kpi-value">{counts[k] || 0}</div>
            </div>
          </button>
        ))}
      </div>

      <SectionCard
        title="Client meetings"
        subtitle={loading ? "Loading…" : `${data.meetings.length} shown${status ? ` · ${MEETING_STATUS[status].label}` : ""} — booked by telecallers for the sales team`}
        Icon={CalendarClock}
        tone="#7c3aed"
        right={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <select className="tc-input" value={salesPerson} onChange={(e) => setSalesPerson(e.target.value)} style={{ width: "auto", minWidth: 170 }} aria-label="Sales person">
              <option value="">All sales people</option>
              {salesPeople.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
            <div className="tc-segmented">
              {SCOPES.map((s) => <button key={s.key} type="button" className={scope === s.key ? "active" : ""} onClick={() => setScope(s.key)}>{s.label}</button>)}
            </div>
            <Btn variant="secondary" size="sm" Icon={RefreshCw} onClick={load} disabled={loading}>Refresh</Btn>
          </div>
        }
      >
        {!loading && data.meetings.length === 0 ? (
          <EmptyState Icon={CalendarCheck} title="No client meetings in this view" text="Meetings booked by telecallers appear here automatically." />
        ) : (
          data.meetings.map((m) => (
            <MeetingCard
              key={m._id}
              meeting={m}
              show={{ salesPerson: true, bookedBy: true }}
              actions={m.status === "scheduled" && <Btn size="sm" variant="secondary" Icon={ClipboardCheck} onClick={() => setUpdating(m)}>Update</Btn>}
            />
          ))
        )}
      </SectionCard>

      {updating && <MeetingUpdateModal meeting={updating} onClose={() => setUpdating(null)} onUpdated={() => { setUpdating(null); load(); }} />}
    </>
  );
}

/** Admin "Meetings": client meetings (from telecalling) + the internal calendar. */
export default function AdminMeetingsHub({ meetings, setTab, setDeleteMeeting }) {
  const [view, setView] = useState("client");
  const internal = (meetings || []).filter((m) => m.kind !== "client");

  return (
    <div className="tc-page fade-up">
      <div className="tc-segmented" style={{ marginBottom: 18 }} role="tablist">
        <button type="button" role="tab" aria-selected={view === "client"} className={view === "client" ? "active" : ""} onClick={() => setView("client")}>
          <CalendarCheck size={14} /> Client Meetings
        </button>
        <button type="button" role="tab" aria-selected={view === "internal"} className={view === "internal" ? "active" : ""} onClick={() => setView("internal")}>
          <Users size={14} /> Internal Meetings <span className="tc-count">{internal.length}</span>
        </button>
      </div>
      {view === "client" ? <ClientMeetingsPanel /> : <MeetingsSection meetings={internal} setTab={setTab} setDeleteMeeting={setDeleteMeeting} />}
    </div>
  );
}
