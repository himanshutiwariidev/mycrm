import React from "react";
import { CalendarClock, MapPin, Plus, Users } from "lucide-react";
import { FieldIcon, FormField, T, baseInp, baseInpNoIcon } from "./shared";

export default function CreateMeetingSection({ meetingForm, setMeetingForm, handleCreateMeeting }) {
  return (
    <div className="fade-up" style={{ maxWidth: 620 }}>
      <div style={{ marginBottom: 26 }}>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 20, color: T.textPrimary }}>Schedule New Meeting</h2>
        <p style={{ fontSize: 13, color: T.textMuted, marginTop: 4 }}>Fill in the details below to add a meeting to the calendar</p>
      </div>
      <div style={{ background: T.card, border: `1.5px solid ${T.border}`, borderRadius: 18, padding: "30px", boxShadow: "0 2px 8px rgba(0,0,0,.05)" }}>
        <form onSubmit={handleCreateMeeting}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <FormField label="Meeting Title" span2>
              <div style={{ position: "relative" }}><FieldIcon icon={CalendarClock} /><input className="inp" style={baseInp} type="text" placeholder="e.g. Client kickoff call" value={meetingForm.title} onChange={e => setMeetingForm({ ...meetingForm, title: e.target.value })} required /></div>
            </FormField>
            <FormField label="Date & Time">
              <div style={{ position: "relative" }}><FieldIcon icon={CalendarClock} /><input className="inp" style={baseInp} type="datetime-local" value={meetingForm.meetingDate} onChange={e => setMeetingForm({ ...meetingForm, meetingDate: e.target.value })} required /></div>
            </FormField>
            <FormField label="Location / Link">
              <div style={{ position: "relative" }}><FieldIcon icon={MapPin} /><input className="inp" style={baseInp} type="text" placeholder="Office / Google Meet link" value={meetingForm.location} onChange={e => setMeetingForm({ ...meetingForm, location: e.target.value })} /></div>
            </FormField>
            <FormField label="Attendees" span2>
              <div style={{ position: "relative" }}><FieldIcon icon={Users} /><input className="inp" style={baseInp} type="text" placeholder="Comma-separated names or emails" value={meetingForm.attendees} onChange={e => setMeetingForm({ ...meetingForm, attendees: e.target.value })} /></div>
            </FormField>
            <FormField label="Description" span2>
              <textarea className="inp" style={{ ...baseInpNoIcon, minHeight: 96 }} placeholder="Optional agenda or notes…" value={meetingForm.description} onChange={e => setMeetingForm({ ...meetingForm, description: e.target.value })} />
            </FormField>
          </div>
          <button className="pri-btn" type="submit" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", background: "linear-gradient(135deg, #f7931e, #e8590c)", color: "#fff", borderRadius: 11, padding: "13px", fontSize: 14, fontWeight: 700, fontFamily: "'Syne', sans-serif", letterSpacing: ".03em" }}>
            <Plus size={16} strokeWidth={2.5} /> Schedule Meeting
          </button>
        </form>
      </div>
    </div>
  );
}
