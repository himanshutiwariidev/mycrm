/* eslint-disable react-refresh/only-export-components */
import React, { useEffect, useState } from "react";
import { X, Inbox } from "lucide-react";
import { T } from "../sections/shared";
import "./telecaller.css";

// Building blocks shared by the Telecaller panel, the Sales "Meetings" tab
// and the admin Telecalling / Client Meetings views.

// ── Formatting ────────────────────────────────────────────────────────────
export const fmtDateTime = (v) =>
  v ? new Date(v).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "—";
export const fmtTime = (v) => (v ? new Date(v).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }) : "—");

export function fmtDuration(sec) {
  const s = Math.max(0, Math.round(sec || 0));
  if (!s) return "—";
  const m = Math.floor(s / 60);
  return m ? `${m}m ${String(s % 60).padStart(2, "0")}s` : `${s}s`;
}

export function fmtAgo(v) {
  if (!v) return "—";
  const mins = Math.round((Date.now() - new Date(v).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h} hr${h === 1 ? "" : "s"} ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} day${d === 1 ? "" : "s"} ago`;
  return new Date(v).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

/** "Today, 4:30 pm" / "Tomorrow, 11:00 am" / "Mon 24 Nov, 11:00 am" */
export function fmtWhen(v) {
  if (!v) return "—";
  const d = new Date(v);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const day = new Date(d); day.setHours(0, 0, 0, 0);
  const diff = Math.round((day - today) / 86400000);
  const time = fmtTime(d);
  if (diff === 0) return `Today, ${time}`;
  if (diff === 1) return `Tomorrow, ${time}`;
  if (diff === -1) return `Yesterday, ${time}`;
  return `${d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}, ${time}`;
}

/** Date → value for <input type="datetime-local"> in local time. */
export function toLocalInput(date) {
  if (!date) return "";
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const isOverdue = (v) => v && new Date(v).getTime() < Date.now();

// ── Primitives ────────────────────────────────────────────────────────────
export function Badge({ meta, children, size = "md" }) {
  const m = meta || { color: T.textSecondary, bg: "#f1f5f9" };
  return (
    <span className={`tc-badge tc-badge-${size}`} style={{ color: m.color, background: m.bg }}>
      {m.Icon && <m.Icon size={size === "sm" ? 11 : 12} strokeWidth={2.4} />}
      {children ?? m.label}
    </span>
  );
}

export function Btn({ variant = "primary", size = "md", Icon, children, className = "", ...props }) {
  return (
    <button type="button" className={`tc-btn tc-btn-${variant} tc-btn-${size} ${className}`} {...props}>
      {Icon && <Icon size={size === "sm" ? 14 : 16} strokeWidth={2.2} />}
      {children}
    </button>
  );
}

const AVATAR_COLORS = ["#2563eb", "#7c3aed", "#db2777", "#ea580c", "#0891b2", "#16a34a", "#d97706", "#4f46e5"];
export function Avatar({ name = "", size = 34 }) {
  const initials = name.replace(/\(.*?\)/g, "").trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";
  const color = AVATAR_COLORS[[...name].reduce((s, c) => s + c.charCodeAt(0), 0) % AVATAR_COLORS.length];
  return (
    <span className="tc-avatar" style={{ width: size, height: size, fontSize: size * 0.38, background: `${color}1a`, color }}>
      {initials}
    </span>
  );
}

export function Field({ label, hint, children, span2 = false, required = false }) {
  return (
    <label className="tc-field" style={span2 ? { gridColumn: "1 / -1" } : undefined}>
      <span className="tc-field-label">{label}{required && <em> *</em>}</span>
      {children}
      {hint && <span className="tc-field-hint">{hint}</span>}
    </label>
  );
}

export function KpiTile({ Icon, label, value, sub, tone = "#2563eb", subTone }) {
  return (
    <div className="tc-kpi">
      <div className="tc-kpi-icon" style={{ background: `${tone}14`, color: tone }}><Icon size={19} strokeWidth={2.2} /></div>
      <div className="tc-kpi-body">
        <div className="tc-kpi-label">{label}</div>
        <div className="tc-kpi-value">{value}</div>
        {sub && <div className="tc-kpi-sub" style={subTone ? { color: subTone } : undefined}>{sub}</div>}
      </div>
    </div>
  );
}

/** Calendar-page style date: "NOV / 21 / 11:00 am". */
export function DateBlock({ date, tone = "#2563eb" }) {
  const d = new Date(date);
  return (
    <div className="tc-dateblock" style={{ borderColor: `${tone}33` }}>
      <span className="tc-dateblock-month" style={{ background: tone }}>{d.toLocaleDateString("en-IN", { month: "short" })}</span>
      <span className="tc-dateblock-day">{d.getDate()}</span>
      <span className="tc-dateblock-time">{fmtTime(d)}</span>
    </div>
  );
}

export function EmptyState({ Icon = Inbox, title, text, action }) {
  return (
    <div className="tc-empty">
      <div className="tc-empty-icon"><Icon size={22} strokeWidth={1.8} /></div>
      <div className="tc-empty-title">{title}</div>
      {text && <div className="tc-empty-text">{text}</div>}
      {action}
    </div>
  );
}

export function SectionCard({ title, subtitle, Icon, tone = "#2563eb", right, children, className = "", bodyClassName = "" }) {
  return (
    <section className={`tc-card ${className}`}>
      {(title || right) && (
        <header className="tc-card-head">
          <div className="tc-card-title">
            {Icon && <span className="tc-card-icon" style={{ background: `${tone}14`, color: tone }}><Icon size={16} strokeWidth={2.2} /></span>}
            <div>
              <h3>{title}</h3>
              {subtitle && <p>{subtitle}</p>}
            </div>
          </div>
          {right}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

/** Quick-pick chips for a datetime field: "In 1 hour", "Tomorrow 11 am"… */
export function QuickTimes({ onPick, options = ["1h", "eod", "tomorrow", "3d"] }) {
  const [now] = useState(() => Date.now());
  const build = (key) => {
    const d = new Date(now);
    if (key === "1h") return { label: "In 1 hour", date: new Date(d.getTime() + 3600e3) };
    if (key === "eod") { d.setHours(17, 0, 0, 0); return { label: "Today 5 pm", date: d }; }
    if (key === "tomorrow") { d.setDate(d.getDate() + 1); d.setHours(11, 0, 0, 0); return { label: "Tomorrow 11 am", date: d }; }
    if (key === "tomorrow4") { d.setDate(d.getDate() + 1); d.setHours(16, 0, 0, 0); return { label: "Tomorrow 4 pm", date: d }; }
    if (key === "3d") { d.setDate(d.getDate() + 3); d.setHours(11, 0, 0, 0); return { label: "In 3 days", date: d }; }
    if (key === "week") { d.setDate(d.getDate() + 7); d.setHours(11, 0, 0, 0); return { label: "Next week", date: d }; }
    return null;
  };
  return (
    <div className="tc-quick">
      {options.map(build).filter((o) => o && o.date.getTime() > now).map((o) => (
        <button key={o.label} type="button" className="tc-quick-chip" onClick={() => onPick(o.date)}>{o.label}</button>
      ))}
    </div>
  );
}

export function Modal({ title, subtitle, Icon, tone = "#2563eb", onClose, footer, children, width = 620 }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  return (
    <div className="tc-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="tc-modal" role="dialog" aria-modal="true" aria-label={title} style={{ width: `min(${width}px, 100%)` }}>
        <header className="tc-modal-head">
          {Icon && <span className="tc-modal-icon" style={{ background: `${tone}14`, color: tone }}><Icon size={19} strokeWidth={2.2} /></span>}
          <div className="tc-modal-titles">
            <h3>{title}</h3>
            {subtitle && <div className="tc-modal-sub">{subtitle}</div>}
          </div>
          <button type="button" className="tc-icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </header>
        <div className="tc-modal-body">{children}</div>
        {footer && <footer className="tc-modal-foot">{footer}</footer>}
      </div>
    </div>
  );
}
