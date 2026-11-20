import {
  Bell, CalendarCheck, CalendarClock, CalendarX, Edit3, FileText, IndianRupee, MapPin, MessageSquare, Package, Paperclip, RefreshCw, Send, ShieldCheck,
  TrendingUp, UserCheck, UserPlus,
} from "lucide-react";

// Formatting + activity icon map shared by the Super Admin Dashboard and its
// "View All" detail tables.

export const fmtINR = (v) => `${(v || 0) < 0 ? "-" : ""}₹${Math.abs(Math.round(v || 0)).toLocaleString("en-IN")}`;

export const fmtShortDate = (v) =>
  v ? new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

/** "just now", "5 min ago", "2 hours ago", "3 days ago", then a date. */
export function fmtTimeAgo(v) {
  const mins = Math.round((Date.now() - new Date(v).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return fmtShortDate(v);
}

/** Axis ticks in Indian units: 3L, 50K, 900. */
export function fmtCompactINR(v) {
  const n = Number(v) || 0;
  if (Math.abs(n) >= 1e7) return `${+(n / 1e7).toFixed(1)}Cr`;
  if (Math.abs(n) >= 1e5) return `${+(n / 1e5).toFixed(1)}L`;
  if (Math.abs(n) >= 1e3) return `${+(n / 1e3).toFixed(1)}K`;
  return String(Math.round(n));
}

export const ACTIVITY_META = {
  client_created: { Icon: UserPlus, color: "#16a34a" },
  client_updated: { Icon: Edit3, color: "#2563eb" },
  status_changed: { Icon: RefreshCw, color: "#f7931e" },
  contract_created: { Icon: FileText, color: "#2563eb" },
  contract_updated: { Icon: Edit3, color: "#2563eb" },
  contract_sent: { Icon: Send, color: "#16a34a" },
  deliverable_added: { Icon: Package, color: "#f7931e" },
  deliverable_updated: { Icon: Package, color: "#2563eb" },
  payment_added: { Icon: IndianRupee, color: "#16a34a" },
  payment_deleted: { Icon: IndianRupee, color: "#dc2626" },
  reminder_created: { Icon: Bell, color: "#f7931e" },
  reminder_sent: { Icon: Send, color: "#16a34a" },
  portal_enabled: { Icon: ShieldCheck, color: "#7c3aed" },
  invoice_generated: { Icon: FileText, color: "#2563eb" },
  user_assigned: { Icon: UserCheck, color: "#7c3aed" },
  remark_added: { Icon: MessageSquare, color: "#0891b2" },
  progress_updated: { Icon: TrendingUp, color: "#16a34a" },
  pi_uploaded: { Icon: Paperclip, color: "#2563eb" },
  pi_deleted: { Icon: Paperclip, color: "#dc2626" },
  meeting_check_in: { Icon: MapPin, color: "#dc2626" },
  meeting_scheduled: { Icon: CalendarClock, color: "#7c3aed" },
  meeting_rescheduled: { Icon: CalendarClock, color: "#2563eb" },
  meeting_completed: { Icon: CalendarCheck, color: "#16a34a" },
  meeting_no_show: { Icon: CalendarX, color: "#d97706" },
  meeting_cancelled: { Icon: CalendarX, color: "#64748b" },
  meeting_check_out: { Icon: MapPin, color: "#16a34a" },
};
