import React, { useState } from "react";
import { Phone, MapPin, Video, User, Headset, Repeat, ExternalLink, Navigation, UserPlus } from "lucide-react";
import { PhotoStrip, PhotoLightbox } from "../sections/VisitPhotos";
import { mapUrl } from "../../services/clientVisitApi";
import { fmtDuration, visitMinutes, hasFix } from "../sections/visitFormat";
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

/** The location check-in made for the meeting, with its photos — proof it happened. */
function VisitProof({ visit, title }) {
  const [viewer, setViewer] = useState(null);
  const [now] = useState(() => Date.now());
  const open = visit.status === "in-progress";
  const time = (d) => new Date(d).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
  return (
    <div className="tc-meeting-note" data-visit-proof style={{ background: open ? "#eff6ff" : "#f8fafc", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <Navigation size={14} color={open ? "#2563eb" : "#16a34a"} />
      <span>
        <strong style={{ color: "#0f172a" }}>{open ? "Visit in progress" : "Visited"}</strong>
        {" "}· {time(visit.checkIn?.at)}{visit.checkOut?.at ? `–${time(visit.checkOut.at)}` : ""} ({fmtDuration(visitMinutes(visit, now))})
        {hasFix(visit.checkIn) && <> · <a href={mapUrl(visit.checkIn.lat, visit.checkIn.lng)} target="_blank" rel="noopener noreferrer">location <ExternalLink size={11} /></a></>}
        {visit.outcome ? ` · ${visit.outcome}` : ""}
      </span>
      <span style={{ marginLeft: "auto" }}><PhotoStrip visit={visit} onOpen={(i) => setViewer(i)} size={30} /></span>
      {viewer !== null && <PhotoLightbox visit={visit} startIndex={viewer} title={title} onClose={() => setViewer(null)} />}
    </div>
  );
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
          {show.salesPerson && !meeting.salesPerson && (
            <span style={{ color: "#b45309", fontWeight: 600 }} data-unassigned><User size={13} /> Waiting for the sales manager to assign</span>
          )}
          {show.bookedBy && meeting.createdBy && (meeting.source === "sales"
            ? <span data-self-added><UserPlus size={13} /> Added by {meeting.createdBy.name} (on the spot)</span>
            : <span><Headset size={13} /> Booked by {meeting.createdBy.name}</span>)}
          {meeting.rescheduleCount > 0 && meeting.status === "scheduled" && <span><Repeat size={13} /> New time confirmed</span>}
        </div>

        {meeting.description && <div className="tc-meeting-note"><strong style={{ color: "#0f172a" }}>Agenda:</strong> {meeting.description}</div>}
        {meeting.outcomeNotes && <div className="tc-meeting-note" style={{ background: "#f0fdf4" }}><strong style={{ color: "#0f172a" }}>Result:</strong> {meeting.outcomeNotes}</div>}
        {meeting.visit && <VisitProof visit={meeting.visit} title={meeting.company || meeting.contactName} />}
        {actions && <div className="tc-meeting-actions">{actions}</div>}
      </div>
    </article>
  );
}
