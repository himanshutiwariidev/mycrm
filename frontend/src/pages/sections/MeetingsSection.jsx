import React from "react";
import { CalendarClock, Clock, MapPin, Plus, Trash2, Users } from "lucide-react";
import { IconBtn, T } from "./shared";

const fmtMeetingDateTime = (v) => {
  if (!v) return "—";
  return new Date(v).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

export default function MeetingsSection({ meetings, setTab, setDeleteMeeting }) {
  const totalCount = meetings.length;
  const now = new Date();
  const upcoming = meetings.filter((m) => new Date(m.meetingDate) >= now);
  const past = meetings.filter((m) => new Date(m.meetingDate) < now);

  const renderMeeting = (meeting, i) => (
    <div key={meeting._id} className="card card-in" style={{ background: T.card, border: `1.5px solid ${T.border}`, borderRadius: 14, padding: "18px 20px", animationDelay: `${i * 35}ms`, display: "flex", alignItems: "flex-start", boxShadow: "0 1px 3px rgba(0,0,0,.04)" }}>
      <div style={{ width: 3, borderRadius: 99, background: "#7c3aed", alignSelf: "stretch", marginRight: 16, flexShrink: 0, minHeight: 52 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: 14.5, color: T.textPrimary, marginBottom: meeting.description ? 5 : 10 }}>{meeting.title}</h3>
        {meeting.description && <p style={{ fontSize: 12.5, color: T.textMuted, lineHeight: 1.65, marginBottom: 12 }}>{meeting.description}</p>}
        <div style={{ display: "flex", gap: 18, flexWrap: "wrap", fontSize: 12, color: T.textMuted, alignItems: "center" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Clock size={12} strokeWidth={1.8} />{fmtMeetingDateTime(meeting.meetingDate)}</span>
          {meeting.location && <span style={{ display: "flex", alignItems: "center", gap: 5 }}><MapPin size={12} strokeWidth={1.8} />{meeting.location}</span>}
          {meeting.attendees?.length > 0 && <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Users size={12} strokeWidth={1.8} />{meeting.attendees.join(", ")}</span>}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 14, flexShrink: 0 }}>
        <IconBtn icon={Trash2} color={T.red} bg={T.redBg} hoverBg={T.redBorder} onClick={() => setDeleteMeeting(meeting)} title="Delete meeting" />
      </div>
    </div>
  );

  return (
    <div className="fade-up">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 19, color: T.textPrimary }}>Meeting Scheduler</h2>
          <p style={{ fontSize: 12.5, color: T.textMuted, marginTop: 3 }}>{totalCount} meeting{totalCount !== 1 ? "s" : ""} total &middot; {upcoming.length} upcoming</p>
        </div>
        <button className="pri-btn" onClick={() => setTab("createMeeting")} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", background: "linear-gradient(135deg, #f7931e, #e8590c)", color: "#fff", borderRadius: 10, fontSize: 13, fontWeight: 600 }}>
          <Plus size={15} strokeWidth={2.5} /> New Meeting
        </button>
      </div>

      {totalCount === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 0" }}>
          <CalendarClock size={48} strokeWidth={1} color={T.textMuted} style={{ margin: "0 auto 16px", display: "block" }} />
          <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 17, color: T.textSecondary }}>No meetings scheduled</p>
          <p style={{ fontSize: 13, color: T.textMuted, marginTop: 6 }}>Schedule your first meeting to get started</p>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div style={{ marginBottom: past.length > 0 ? 28 : 0 }}>
              <div style={{ fontSize: 11, color: T.textMuted, letterSpacing: ".09em", textTransform: "uppercase", fontWeight: 700, marginBottom: 12 }}>Upcoming</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {upcoming.map(renderMeeting)}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: T.textMuted, letterSpacing: ".09em", textTransform: "uppercase", fontWeight: 700, marginBottom: 12 }}>Past</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, opacity: 0.7 }}>
                {past.map(renderMeeting)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
