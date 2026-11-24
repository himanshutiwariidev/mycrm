import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarCheck, Navigation, ClipboardCheck, ArrowUpRight, RefreshCw, CalendarPlus } from "lucide-react";
import { getAssignedMeetings } from "../../services/telecallingApi";
import { SectionCard, EmptyState, Btn } from "../telecaller/teleUi";
import MeetingCard from "../telecaller/MeetingCard";
import MeetingUpdateModal from "../telecaller/MeetingUpdateModal";
import AddMeetingModal from "../telecaller/AddMeetingModal";
import { visitPathFor } from "./visitPath";

const SCOPES = [
  { key: "today", label: "Today" },
  { key: "upcoming", label: "Upcoming" },
  { key: "past", label: "Past & updated" },
];

/**
 * Sales person's client meetings — booked for them by the telecalling team, or
 * added by themselves (e.g. found on the spot). Start the visit (location
 * check-in + photos) and record the result from here.
 */
export default function SalesMeetingsSection() {
  const navigate = useNavigate();
  const [scope, setScope] = useState("upcoming");
  const [data, setData] = useState({ meetings: [], counts: { today: 0, upcoming: 0 } });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await getAssignedMeetings(scope);
      setData(res);
    } catch {
      setData({ meetings: [], counts: { today: 0, upcoming: 0 } });
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => { load(); }, [load]);

  const startVisit = (m) => navigate(visitPathFor(m));

  return (
    <div className="tc-page">
      <div className="tc-head">
        <div>
          <h1>My Meetings</h1>
          <p>Meetings booked for you by the telecalling team, and ones you add yourself.</p>
        </div>
        <div className="tc-head-actions">
          <Btn variant="primary" Icon={CalendarPlus} onClick={() => setAdding(true)} data-add-meeting>Add meeting</Btn>
          <Btn variant="secondary" Icon={RefreshCw} onClick={load} disabled={loading}>Refresh</Btn>
        </div>
      </div>

      <SectionCard
        title={SCOPES.find((s) => s.key === scope).label}
        subtitle={loading ? "Loading…" : `${data.meetings.length} meeting${data.meetings.length === 1 ? "" : "s"}`}
        Icon={CalendarCheck}
        tone="#7c3aed"
        right={
          <div className="tc-segmented">
            {SCOPES.map((s) => (
              <button key={s.key} type="button" className={scope === s.key ? "active" : ""} onClick={() => setScope(s.key)}>
                {s.label}
                {s.key !== "past" && <span className="tc-count">{s.key === "today" ? data.counts.today : data.counts.upcoming}</span>}
              </button>
            ))}
          </div>
        }
      >
        {!loading && data.meetings.length === 0 ? (
          <EmptyState
            Icon={CalendarCheck}
            title={scope === "today" ? "No meetings today" : scope === "upcoming" ? "No upcoming meetings" : "Nothing here yet"}
            text="Meetings the telecallers book for you appear here. Found one yourself? Use Add meeting."
          />
        ) : (
          data.meetings.map((m) => (
            <MeetingCard
              key={m._id}
              meeting={m}
              show={{ salesPerson: false, bookedBy: true }}
              actions={
                m.status === "scheduled" ? (
                  <>
                    {m.mode === "in-person" && m.clientId && !m.visit && <Btn size="sm" variant="success" Icon={Navigation} onClick={() => startVisit(m)} data-start-visit>Start visit</Btn>}
                    {m.visit?.status === "in-progress" && <Btn size="sm" variant="success" Icon={Navigation} onClick={() => startVisit(m)}>Open visit</Btn>}
                    <Btn size="sm" variant="secondary" Icon={ClipboardCheck} onClick={() => setUpdating(m)}>Update</Btn>
                    {m.clientId && <Btn size="sm" variant="ghost" onClick={() => navigate(`/clients/${m.clientId._id || m.clientId}`)}>Client <ArrowUpRight size={13} /></Btn>}
                  </>
                ) : (
                  m.clientId && <Btn size="sm" variant="ghost" onClick={() => navigate(`/clients/${m.clientId._id || m.clientId}`)}>Open client <ArrowUpRight size={13} /></Btn>
                )
              }
            />
          ))
        )}
      </SectionCard>

      {updating && <MeetingUpdateModal meeting={updating} onClose={() => setUpdating(null)} onUpdated={() => { setUpdating(null); load(); }} />}
      {adding && (
        <AddMeetingModal
          onClose={() => setAdding(false)}
          onAdded={(meeting, { startVisit: go }) => { setAdding(false); if (go) startVisit(meeting); else load(); }}
        />
      )}
    </div>
  );
}
