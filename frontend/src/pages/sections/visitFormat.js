// Formatting shared by the sales person's Client Meetings tab and the admin
// Client Visits section.

export const LOW_ACCURACY_METRES = 500;

export const fmtDateTime = (v) =>
  v
    ? new Date(v).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })
    : "—";

export const fmtTime = (v) => (v ? new Date(v).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }) : "—");

export function fmtDuration(minutes) {
  const m = Math.max(0, Math.round(minutes || 0));
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

/** Minutes between check-in and check-out (or now, for an open meeting). */
export function visitMinutes(visit, now = Date.now()) {
  const start = new Date(visit?.checkIn?.at).getTime();
  const end = visit?.checkOut?.at ? new Date(visit.checkOut.at).getTime() : now;
  return Number.isFinite(start) ? (end - start) / 60000 : 0;
}

export const hasFix = (fix) => Number.isFinite(fix?.lat) && Number.isFinite(fix?.lng);

export const clientLabel = (client) => client?.companyName || client?.clientName || "Client";
