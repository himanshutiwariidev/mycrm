import React from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { currentMonthKey, monthLabel } from "../utils/taskPeriods";

/**
 * Month picker for month-by-month deliverables: ‹ November 2026 › with a
 * dropdown of every month the visible contracts run in, and "This month".
 */
export default function MonthFilter({ value, onChange, months = [] }) {
  const options = months.includes(value) ? months : [...months, value].sort();
  const i = options.indexOf(value);
  const current = currentMonthKey();
  const arrow = (disabled) => ({
    width: 32, height: 34, display: "grid", placeItems: "center", border: "none", background: "none",
    color: disabled ? "#cbd5e1" : "#475569", cursor: disabled ? "not-allowed" : "pointer",
  });

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }} data-month-filter>
      <div style={{ display: "inline-flex", alignItems: "center", border: "1.5px solid #e8eaf0", borderRadius: 10, background: "#fff", overflow: "hidden" }}>
        <button type="button" aria-label="Previous month" disabled={i <= 0} onClick={() => onChange(options[i - 1])} style={arrow(i <= 0)}>
          <ChevronLeft size={16} />
        </button>
        <label style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 6, padding: "0 4px", fontSize: 13, fontWeight: 700, color: "#0f172a", cursor: "pointer" }}>
          <CalendarDays size={14} color="#f7931e" />
          <span style={{ whiteSpace: "nowrap", minWidth: 118, textAlign: "center" }}>{monthLabel(value, true)}</span>
          <select
            aria-label="Month"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%" }}
          >
            {[...options].reverse().map((k) => (
              <option key={k} value={k}>{monthLabel(k, true)}{k === current ? " (this month)" : k > current ? " (upcoming)" : ""}</option>
            ))}
          </select>
        </label>
        <button type="button" aria-label="Next month" disabled={i >= options.length - 1} onClick={() => onChange(options[i + 1])} style={arrow(i >= options.length - 1)}>
          <ChevronRight size={16} />
        </button>
      </div>
      {value !== current && (
        <button type="button" onClick={() => onChange(current)}
          style={{ padding: "7px 11px", borderRadius: 9, border: "1.5px solid #fed7aa", background: "#fff4e6", color: "#c2410c", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
          This month
        </button>
      )}
    </div>
  );
}
