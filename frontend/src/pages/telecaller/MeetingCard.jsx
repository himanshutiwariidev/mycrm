import React, { useState } from "react";
import { Phone, MapPin, Video, User, Headset, Repeat, ExternalLink } from "lucide-react";
import { MEETING_MODES, MEETING_STATUS, MEETING_OUTCOMES } from "../../config/telecalling";
import { Badge, DateBlock, fmtWhen } from "./teleUi";

const STATUS_TONE = { scheduled: "#2563eb", completed: "#16a34a", "no-show": "#d97706", cancelled: "#64748b" };

function LocationLink({ meeting }) {
  if (!meeting.location) return null;
  if (meeting.mode === "in-person") {
    return (
      <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(meeting.location)}`} target="_blank" rel="noopener noreferrer">
        <MapPin size={13} /> {meeting.location} <ExternalLink size={11} />
      </a>
    );
  }
  if (meeting.mode === "video" && /^(https?:\/\/|meet\.|zoom\.)/i.test(meeting.location)) {
    const href = /^https?:\/\//i.test(meeting.location) ? meeting.location : `https://${meeting.location}`;
    return <a href={href} target="_blank" rel="noopener noreferrer"><Video size={13} /> Join link <ExternalLink size={11} /></a>;
  }
  return <span><MapPin size={13} /> {meeting.location}</span>;
}

/**
 * One client meeting — shared by the telecaller ("booked"), sales ("assigned")
 * and admin views. `show` picks which people to mention; `actions` renders the
 * caller's buttons under the card.
 */
export default function MeetingCard({ meeting, show = { salesPerson: true, bookedBy: true }, actions }) {
  const status = MEETING_STATUS[meeting.status] || MEETING_STATUS.scheduled;
  const mode = MEETING_MODES[meeting.mode];
  const outcome = meeting.outcome && MEETING_OUTCOMES[meeting.outcome];
  const [renderedAt] = useState(() => Date.now());
  const isPastDue = meeting.status === "scheduled" && new Date(meeting.meetingDate).getTime() < renderedAt - 3600e3;

  return (
    <article className="tc-meeting">
      <DateBlock date={meeting.meetingDate} tone={STATUS_TONE[meeting.status] || "#2563eb"} />
      <div className="tc-meeting-main">
        <div className="tc-meeting-top">
          <div style={{ minWidth: 0 }}>
            <div className="tc-meeting-name">{meeting.company || meeting.contactName}</div>
            <div style={{ fontSize: 12.5, color: "#64748b", marginTop: 2 }}>
              {meeting.company ? `${meeting.contactName} · ` : ""}{fmtWhen(meeting.meetingDate)}
              {meeting.rescheduleCount > 0 && <span style={{ color: "#d97706" }}> · rescheduled {meeting.rescheduleCount}×</span>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {isPastDue ? <Badge meta={{ label: "Update pending", color: "#d97706", bg: "#fef3c7" }} /> : <Badge meta={status} />}
            {outcome && <Badge meta={outcome} />}
          </div>
        </div>

        <div className="tc-meeting-meta">
          {meeting.contactPhone && <a href={`tel:${meeting.contactPhone}`}><Phone size={13} /> {meeting.contactPhone}</a>}
          {mode && <span><mode.Icon size={13} /> {mode.label}</span>}
          <LocationLink meeting={meeting} />
          {show.salesPerson && meeting.salesPerson && <span><User size={13} /> {meeting.salesPerson.name}</span>}
          {show.bookedBy && meeting.createdBy && <span><Headset size={13} /> Booked by {meeting.createdBy.name}</span>}
          {meeting.rescheduleCount > 0 && meeting.status === "scheduled" && <span><Repeat size={13} /> New time confirmed</span>}
        </div>

        {meeting.description && <div className="tc-meeting-note"><strong style={{ color: "#0f172a" }}>Agenda:</strong> {meeting.description}</div>}
        {meeting.outcomeNotes && <div className="tc-meeting-note" style={{ background: "#f0fdf4" }}><strong style={{ color: "#0f172a" }}>Result:</strong> {meeting.outcomeNotes}</div>}
        {actions && <div className="tc-meeting-actions">{actions}</div>}
      </div>
    </article>
  );
}
