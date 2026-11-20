import React, { useCallback, useEffect, useState } from "react";
import { CalendarCheck } from "lucide-react";
import { getBookedMeetings } from "../../services/telecallingApi";
import { SectionCard, EmptyState } from "./teleUi";
import MeetingCard from "./MeetingCard";

const SCOPES = [
  { key: "upcoming", label: "Upcoming" },
  { key: "past", label: "Past & updated" },
  { key: "all", label: "All" },
];

/** Meetings this telecaller booked, with the sales team's result. */
export default function BookedMeetingsSection({ refreshKey }) {
  const [scope, setScope] = useState("upcoming");
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getBookedMeetings(scope);
      setMeetings(data.meetings || []);
    } catch {
      setMeetings([]);
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => { load(); }, [load, refreshKey]);

  return (
    <div className="tc-page">
      <div className="tc-head">
        <div>
          <h1>Meetings I Booked</h1>
          <p>Track every meeting you set up — and how the sales team closed it.</p>
        </div>
      </div>
      <SectionCard
        title={scope === "upcoming" ? "Upcoming" : scope === "past" ? "Past & updated" : "All meetings"}
        subtitle={loading ? "Loading…" : `${meetings.length} meeting${meetings.length === 1 ? "" : "s"}`}
        Icon={CalendarCheck}
        tone="#7c3aed"
        right={
          <div className="tc-segmented">
            {SCOPES.map((s) => <button key={s.key} type="button" className={scope === s.key ? "active" : ""} onClick={() => setScope(s.key)}>{s.label}</button>)}
          </div>
        }
      >
        {!loading && meetings.length === 0 ? (
          <EmptyState Icon={CalendarCheck} title="No meetings here" text="When a client agrees to meet, log the call as “Meeting Scheduled” to book it." />
        ) : (
          meetings.map((m) => <MeetingCard key={m._id} meeting={m} show={{ salesPerson: true, bookedBy: false }} />)
        )}
      </SectionCard>
    </div>
  );
}
