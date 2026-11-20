import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarCheck, Navigation, ClipboardCheck, ArrowUpRight, RefreshCw } from "lucide-react";
import { getAssignedMeetings } from "../../services/telecallingApi";
import { SectionCard, EmptyState, Btn } from "../telecaller/teleUi";
import MeetingCard from "../telecaller/MeetingCard";
import MeetingUpdateModal from "../telecaller/MeetingUpdateModal";

const SCOPES = [
  { key: "today", label: "Today" },
  { key: "upcoming", label: "Upcoming" },
  { key: "past", label: "Past & updated" },
];

/**
 * Sales person's client meetings — booked for them by the telecalling team.
 * Start the visit (location check-in) and record the result from here.
 */
export default function SalesMeetingsSection() {
  const navigate = useNavigate();
  const [scope, setScope] = useState("upcoming");
  const [data, setData] = useState({ meetings: [], counts: { today: 0, upcoming: 0 } });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);

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

  const startVisit = (m) => {
    const qs = new URLSearchParams({ view: "visits", client: m.clientId?._id || m.clientId || "", purpose: m.description || "Client meeting" });
    navigate(`/sales?${qs.toString()}`);
  };

  return (
    <div className="tc-page">
      <div className="tc-head">
        <div>
          <h1>My Meetings</h1>
          <p>Client meetings booked for you by the telecalling team.</p>
        </div>
        <div className="tc-head-actions">
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
            text="Meetings the telecallers book for you will appear here."
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
                    {m.mode === "in-person" && m.clientId && <Btn size="sm" variant="success" Icon={Navigation} onClick={() => startVisit(m)}>Start visit</Btn>}
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
    </div>
  );
}
