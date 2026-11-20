// Single source of truth for the telecalling workflow (mirrored for the UI in
// frontend/src/config/telecalling.js — keep the keys in sync).

// Call outcomes. `connected` = the telecaller actually spoke to the person;
// `leadStatus` = where the lead moves after a call with this outcome.
const CALL_OUTCOMES = {
  "meeting-scheduled": { label: "Meeting Scheduled", connected: true, leadStatus: "meeting-scheduled" },
  interested: { label: "Interested", connected: true, leadStatus: "interested" },
  "call-back": { label: "Call Back Later", connected: true, leadStatus: "follow-up" },
  "not-interested": { label: "Not Interested", connected: true, leadStatus: "not-interested" },
  "no-answer": { label: "No Answer", connected: false, leadStatus: "follow-up" },
  busy: { label: "Busy", connected: false, leadStatus: "follow-up" },
  unreachable: { label: "Switched Off / Unreachable", connected: false, leadStatus: "unreachable" },
  "wrong-number": { label: "Wrong Number", connected: false, leadStatus: "invalid" },
};

const LEAD_STATUSES = ["new", "follow-up", "interested", "meeting-scheduled", "converted", "not-interested", "unreachable", "invalid"];
// Statuses that end the calling cycle — no follow-up is kept for them.
const CLOSED_LEAD_STATUSES = ["converted", "not-interested", "invalid"];

const LEAD_SOURCES = ["cold list", "website", "referral", "social media", "walk-in", "other"];

const MEETING_MODES = ["in-person", "video", "phone"];
const MEETING_STATUSES = ["scheduled", "completed", "no-show", "cancelled"];
// Result the sales person records after a completed meeting.
const MEETING_OUTCOMES = {
  converted: { label: "Converted", clientStatus: "converted", leadStatus: "converted" },
  interested: { label: "Interested", clientStatus: "open", leadStatus: "interested" },
  "follow-up": { label: "Needs Follow-up", clientStatus: "open", leadStatus: "follow-up" },
  "not-interested": { label: "Not Interested", clientStatus: "ni", leadStatus: "not-interested" },
};

/** Digits only (keeps a leading +), so "98765 43210" and "9876543210" match. */
function normalizePhone(phone) {
  const text = String(phone || "").trim();
  const digits = text.replace(/\D/g, "");
  return text.startsWith("+") ? `+${digits}` : digits;
}

module.exports = {
  CALL_OUTCOMES,
  LEAD_STATUSES,
  CLOSED_LEAD_STATUSES,
  LEAD_SOURCES,
  MEETING_MODES,
  MEETING_STATUSES,
  MEETING_OUTCOMES,
  normalizePhone,
};
