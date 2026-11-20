/* eslint-disable react-refresh/only-export-components */
import React from "react";
import { Inbox } from "lucide-react";
import { T } from "./shared";

// Small building blocks shared by the sales person's panel sections
// (SalesOverviewSection, SalesVisitsSection) and the admin Client Visits view,
// styled to match the admin dashboard cards/tables.

export const fmtINR = (v) => `₹${Math.round(v || 0).toLocaleString("en-IN")}`;

export const CHIP = {
  Overdue: { color: "#dc2626", bg: "#fee2e2" },
  "Due Today": { color: "#d97706", bg: "#fef3c7" },
  "Due Soon": { color: "#d97706", bg: "#fef3c7" },
  Upcoming: { color: "#2563eb", bg: "#dbeafe" },
  "No Due Date": { color: "#64748b", bg: "#f1f5f9" },
  Completed: { color: "#16a34a", bg: "#dcfce7" },
  "In Progress": { color: "#d97706", bg: "#fef3c7" },
  Pending: { color: "#64748b", bg: "#f1f5f9" },
  "In Meeting": { color: "#c2410c", bg: "#ffedd5" },
  "Low accuracy": { color: "#b45309", bg: "#fef3c7" },
};

export function Chip({ label }) {
  const c = CHIP[label] || CHIP.Pending;
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99, color: c.color, background: c.bg, whiteSpace: "nowrap" }}>
      {label}
    </span>
  );
}

export function Card({ Icon, iconColor, iconBg, title, subtitle, right, children }) {
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 18, padding: 20, marginTop: 18, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: iconBg, display: "grid", placeItems: "center" }}>
            <Icon size={16} color={iconColor} strokeWidth={2} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: T.textPrimary }}>{title}</div>
            {subtitle && <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>{subtitle}</div>}
          </div>
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

export function Segmented({ options, value, onChange }) {
  return (
    <div style={{ display: "inline-flex", gap: 4, padding: 3, borderRadius: 10, background: T.inputBg, border: `1px solid ${T.border}`, flexWrap: "wrap" }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            style={{
              border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 600,
              padding: "6px 11px", borderRadius: 8,
              background: active ? T.card : "transparent",
              color: active ? T.textPrimary : T.textSecondary,
              boxShadow: active ? "0 1px 2px rgba(15,23,42,.08)" : "none",
            }}
          >
            {o.label}{o.count !== undefined ? ` · ${o.count}` : ""}
          </button>
        );
      })}
    </div>
  );
}

export function Empty({ Icon = Inbox, color = T.textMuted, children }) {
  return (
    <div style={{ textAlign: "center", padding: "28px 10px", color: T.textMuted, fontSize: 13, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <Icon size={24} strokeWidth={1.6} color={color} /> {children}
    </div>
  );
}

export const th = (align = "left") => ({
  textAlign: align, padding: "8px 10px", fontSize: 11, fontWeight: 700, color: T.textMuted,
  textTransform: "uppercase", letterSpacing: 0.4, whiteSpace: "nowrap", borderBottom: `1px solid ${T.border}`,
});
export const td = (extra = {}) => ({ padding: "10px", borderBottom: `1px solid ${T.borderLight}`, verticalAlign: "middle", ...extra });

export const linkBtn = {
  display: "inline-flex", alignItems: "center", gap: 5, border: `1px solid ${T.border}`, background: T.card,
  color: T.textSecondary, padding: "5px 10px", borderRadius: 8, fontSize: 12, fontWeight: 600,
  cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
};
