import {
  CalendarCheck, ThumbsUp, PhoneForwarded, ThumbsDown, PhoneMissed, PhoneOff, WifiOff, Ban,
  MapPin, Video, Phone,
} from "lucide-react";

// UI side of backend/utils/telecalling.js — keep the keys in sync.

export const CALL_OUTCOMES = {
  "meeting-scheduled": { label: "Meeting Scheduled", short: "Meeting", Icon: CalendarCheck, color: "#7c3aed", bg: "#f3e8ff", connected: true },
  interested: { label: "Interested", Icon: ThumbsUp, color: "#16a34a", bg: "#dcfce7", connected: true },
  "call-back": { label: "Call Back Later", short: "Call Back", Icon: PhoneForwarded, color: "#2563eb", bg: "#dbeafe", connected: true },
  "not-interested": { label: "Not Interested", Icon: ThumbsDown, color: "#dc2626", bg: "#fee2e2", connected: true },
  "no-answer": { label: "No Answer", Icon: PhoneMissed, color: "#d97706", bg: "#fef3c7", connected: false },
  busy: { label: "Busy", Icon: PhoneOff, color: "#ea580c", bg: "#ffedd5", connected: false },
  unreachable: { label: "Switched Off / Unreachable", short: "Unreachable", Icon: WifiOff, color: "#64748b", bg: "#f1f5f9", connected: false },
  "wrong-number": { label: "Wrong Number", Icon: Ban, color: "#475569", bg: "#e2e8f0", connected: false },
};
export const CONNECTED_OUTCOMES = Object.keys(CALL_OUTCOMES).filter((k) => CALL_OUTCOMES[k].connected);
export const NOT_CONNECTED_OUTCOMES = Object.keys(CALL_OUTCOMES).filter((k) => !CALL_OUTCOMES[k].connected);
/** Outcomes where the telecaller should plan the next call. */
export const FOLLOW_UP_OUTCOMES = ["call-back", "interested", "no-answer", "busy"];

export const LEAD_STATUS = {
  new: { label: "New", color: "#0891b2", bg: "#cffafe" },
  "follow-up": { label: "Follow-up", color: "#2563eb", bg: "#dbeafe" },
  interested: { label: "Interested", color: "#16a34a", bg: "#dcfce7" },
  "meeting-scheduled": { label: "Meeting Booked", color: "#7c3aed", bg: "#f3e8ff" },
  converted: { label: "Converted", color: "#047857", bg: "#d1fae5" },
  "not-interested": { label: "Not Interested", color: "#dc2626", bg: "#fee2e2" },
  unreachable: { label: "Unreachable", color: "#64748b", bg: "#f1f5f9" },
  invalid: { label: "Invalid Number", color: "#475569", bg: "#e2e8f0" },
};

export const LEAD_SOURCES = [
  { value: "cold list", label: "Cold list" },
  { value: "website", label: "Website enquiry" },
  { value: "referral", label: "Referral" },
  { value: "social media", label: "Social media" },
  { value: "walk-in", label: "Walk-in" },
  { value: "other", label: "Other" },
];

export const MEETING_MODES = {
  "in-person": { label: "In person", Icon: MapPin, locationLabel: "Meeting address", placeholder: "Office address, landmark…" },
  video: { label: "Video call", Icon: Video, locationLabel: "Meeting link", placeholder: "Google Meet / Zoom link (optional)" },
  phone: { label: "Phone call", Icon: Phone, locationLabel: "Notes for the call", placeholder: "Best number / time to call (optional)" },
};

export const MEETING_STATUS = {
  scheduled: { label: "Scheduled", color: "#2563eb", bg: "#dbeafe" },
  completed: { label: "Completed", color: "#16a34a", bg: "#dcfce7" },
  "no-show": { label: "No-show", color: "#d97706", bg: "#fef3c7" },
  cancelled: { label: "Cancelled", color: "#64748b", bg: "#f1f5f9" },
};

export const MEETING_OUTCOMES = {
  converted: { label: "Converted", color: "#047857", bg: "#d1fae5" },
  interested: { label: "Interested", color: "#16a34a", bg: "#dcfce7" },
  "follow-up": { label: "Needs follow-up", color: "#2563eb", bg: "#dbeafe" },
  "not-interested": { label: "Not interested", color: "#dc2626", bg: "#fee2e2" },
};
