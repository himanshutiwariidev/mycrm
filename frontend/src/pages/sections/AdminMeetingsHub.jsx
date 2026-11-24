import React, { useCallback, useEffect, useState } from "react";
import { CalendarCheck, CalendarClock, ClipboardCheck, RefreshCw, Users, UserCheck, UserPlus, CalendarPlus, Navigation } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getAdminClientMeetings, getSalesPeople } from "../../services/telecallingApi";
import { MEETING_STATUS } from "../../config/telecalling";
import { SectionCard, EmptyState, Btn } from "../telecaller/teleUi";
import MeetingCard from "../telecaller/MeetingCard";
import MeetingUpdateModal from "../telecaller/MeetingUpdateModal";
import AssignMeetingModal from "../telecaller/AssignMeetingModal";
import AddMeetingModal from "../telecaller/AddMeetingModal";
import { visitPathFor } from "./visitPath";
import MeetingsSection from "./MeetingsSection";
import "../telecaller/telecaller.css";

const SCOPES = [
  { key: "upcoming", label: "Upcoming" },
  { key: "today", label: "Today" },
  { key: "past", label: "Past & updated" },
  { key: "all", label: "All" },
];

/**
 * Every client meeting booked by telecallers. Telecallers book them without a
 * sales person; here the sales manager (or super admin) assigns each one.
 * `startUnassigned` opens on the meetings still waiting for a sales person.
 */
export function ClientMeetingsPanel({ startUnassigned = false, visitsBase }) {
  const navigate = useNavigate();
  const me = localStorage.getItem("userId");
  // The sales manager can add meetings (for themselves or a sales person) and go to their own.
  const canAdd = localStorage.getItem("role") === "salesmanager";
  const [adding, setAdding] = useState(false);
  const [scope, setScope] = useState(startUnassigned ? "all" : "upcoming");
  const [status, setStatus] = useState(startUnassigned ? "scheduled" : "");
  const [salesPerson, setSalesPerson] = useState(startUnassigned ? "unassigned" : "");
  const [salesPeople, setSalesPeople] = useState([]);
  const [data, setData] = useState({ meetings: [], statusCounts: {}, unassigned: 0 });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [assigning, setAssigning] = useState(null);

  useEffect(() => {
    getSalesPeople().then(({ data: res }) => setSalesPeople(res.salesPeople || [])).catch(() => setSalesPeople([]));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await getAdminClientMeetings({ scope, status: status || undefined, salesPerson: salesPerson || undefined });
      setData(res);
    } catch {
      setData({ meetings: [], statusCounts: {}, unassigned: 0 });
    } finally {
      setLoading(false);
    }
  }, [scope, status, salesPerson]);

  useEffect(() => { load(); }, [load]);

  const counts = data.statusCounts || {};
  const showUnassigned = () => { setSalesPerson("unassigned"); setStatus("scheduled"); setScope("all"); };

  return (
    <>
      {data.unassigned > 0 && salesPerson !== "unassigned" && (
        <button type="button" onClick={showUnassigned} className="tc-assign-banner" data-unassigned-banner>
          <UserPlus size={17} />
          <span><strong>{data.unassigned} meeting{data.unassigned === 1 ? "" : "s"}</strong> booked by telecallers {data.unassigned === 1 ? "is" : "are"} waiting for a sales person</span>
          <span className="tc-assign-banner-cta">Assign now →</span>
        </button>
      )}
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
              <option value="unassigned">Not assigned yet{data.unassigned ? ` (${data.unassigned})` : ""}</option>
              {canAdd && me && <option value={me}>My meetings</option>}
              {salesPeople.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
            <div className="tc-segmented">
              {SCOPES.map((s) => <button key={s.key} type="button" className={scope === s.key ? "active" : ""} onClick={() => setScope(s.key)}>{s.label}</button>)}
            </div>
            <Btn variant="secondary" size="sm" Icon={RefreshCw} onClick={load} disabled={loading}>Refresh</Btn>
            {canAdd && <Btn variant="primary" size="sm" Icon={CalendarPlus} onClick={() => setAdding(true)} data-add-meeting>Add meeting</Btn>}
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
              actions={m.status === "scheduled" && (
                <>
                  {visitsBase && m.salesPerson?._id === me && m.mode === "in-person" && m.clientId && (!m.visit || m.visit.status === "in-progress") && (
                    <Btn size="sm" variant="success" Icon={Navigation} onClick={() => navigate(visitPathFor(m, visitsBase))} data-start-visit>{m.visit ? "Open visit" : "Start visit"}</Btn>
                  )}
                  {m.salesPerson
                    ? <Btn size="sm" variant="secondary" Icon={UserCheck} onClick={() => setAssigning(m)}>Reassign</Btn>
                    : <Btn size="sm" variant="primary" Icon={UserCheck} onClick={() => setAssigning(m)} data-assign-btn>Assign sales person</Btn>}
                  {m.salesPerson && <Btn size="sm" variant="secondary" Icon={ClipboardCheck} onClick={() => setUpdating(m)}>Update</Btn>}
                </>
              )}
            />
          ))
        )}
      </SectionCard>

      {updating && <MeetingUpdateModal meeting={updating} onClose={() => setUpdating(null)} onUpdated={() => { setUpdating(null); load(); }} />}
      {adding && (
        <AddMeetingModal
          salesPeople={salesPeople}
          onClose={() => setAdding(false)}
          onAdded={(meeting, { startVisit }) => {
            setAdding(false);
            if (startVisit && visitsBase) navigate(visitPathFor(meeting, visitsBase));
            else load();
          }}
        />
      )}
      {assigning && (
        <AssignMeetingModal
          meeting={assigning}
          salesPeople={salesPeople}
          onClose={() => setAssigning(null)}
          onAssigned={() => { setAssigning(null); load(); }}
        />
      )}
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
