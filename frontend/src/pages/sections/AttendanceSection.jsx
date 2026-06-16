import React from "react";
import {
  Activity, AlertCircle, Calendar, CheckCircle2, ChevronLeft, ChevronRight,
  Clock, Download, Users,
} from "lucide-react";
import {
  ATT_STATUS_META, AttStatCard, FieldIcon, T, baseFilter, fmtDateTime, fmtMin,
} from "./shared";

export default function AttendanceSection({
  attFilters,
  setAttFilter,
  setAttFilters,
  attUsers,
  handleExport,
  attError,
  attLoading,
  attRows,
  computeRunning,
  attPagination,
  attPage,
  setAttPage,
  selectedDayTotal,
  attSummary,
  attActiveNow,
}) {
  return (
    <div className="fade-up">
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 19, color: T.textPrimary }}>Attendance Management</h2>
        <p style={{ fontSize: 12.5, color: T.textMuted, marginTop: 3 }}>Track login/logout, active/offline status and working hours.</p>
      </div>

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 20 }}>
        <AttStatCard icon={Clock} label={attFilters.date ? `${attFilters.date} Active` : "Today Overall"} value={fmtMin(attSummary.todayOverallMinutes || 0)} color="#0891b2" bg="#ecfeff" />
        <AttStatCard icon={Calendar} label="Monthly Total" value={fmtMin(attSummary.monthlyTotalMinutes || 0)} color={T.brand} bg={T.brandLight} />
        <AttStatCard icon={Activity} label="Active Now" value={attActiveNow} color={T.green} bg={T.greenBg} />
        <AttStatCard icon={Users} label="Records" value={attPagination.total || 0} color={T.slate} bg={T.slateBg} />
        {attFilters.date && <AttStatCard icon={CheckCircle2} label={`${attFilters.date} Total`} value={selectedDayTotal || "0h 0m"} color={T.yellow} bg={T.yellowBg} />}
      </div>

      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,.04)", overflow: "hidden" }}>
        <div style={{ padding: "18px 22px", borderBottom: `1px solid ${T.borderLight}`, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
          <div style={{ position: "relative" }}>
            <FieldIcon icon={Calendar} small />
            <input type="date" value={attFilters.date} onChange={e => setAttFilter("date", e.target.value)} className="att-inp" style={baseFilter} />
          </div>
          <div style={{ position: "relative" }}>
            <FieldIcon icon={Users} small />
            <select value={attFilters.userId} onChange={e => setAttFilter("userId", e.target.value)} className="att-inp" style={{ ...baseFilter, paddingRight: 28, appearance: "none", minWidth: 140 }}>
              <option value="">All Users</option>
              {attUsers.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
            </select>
          </div>
          <div style={{ position: "relative" }}>
            <FieldIcon icon={Activity} small />
            <select value={attFilters.status} onChange={e => setAttFilter("status", e.target.value)} className="att-inp" style={{ ...baseFilter, paddingRight: 28, appearance: "none", minWidth: 130 }}>
              <option value="">All Status</option>
              <option value="Active">Active</option>
              <option value="Offline">Offline</option>
            </select>
          </div>
          <div style={{ position: "relative" }}>
            <FieldIcon icon={Calendar} small />
            <input type="month" value={attFilters.month} onChange={e => setAttFilters(p => ({ ...p, month: e.target.value }))} className="att-inp" style={baseFilter} />
          </div>
          <button onClick={handleExport} className="att-exp-btn" style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 7, background: `linear-gradient(135deg, ${T.teal}, #0d9488)`, color: "#fff", borderRadius: 9, padding: "9px 16px", fontSize: 13, fontWeight: 700, fontFamily: "'Syne', sans-serif", boxShadow: "0 2px 8px rgba(15,118,110,.25)" }}>
            <Download size={14} strokeWidth={2.2} /> Export Excel
          </button>
        </div>

        {attError && (
          <div style={{ margin: "14px 22px 0", display: "flex", alignItems: "center", gap: 9, color: T.red, background: T.redBg, border: `1px solid ${T.redBorder}`, borderRadius: 9, padding: "10px 14px", fontSize: 12.5 }}>
            <AlertCircle size={14} strokeWidth={2} />{attError}
          </div>
        )}

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: T.bg }}>
                {["User", "Date", "Login Time", "Logout Time", "Working Time", "Status"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "11px 16px", borderBottom: `1px solid ${T.border}`, fontSize: 10.5, fontWeight: 700, letterSpacing: ".09em", textTransform: "uppercase", color: T.textMuted, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {attLoading && <tr><td colSpan={6} style={{ textAlign: "center", padding: "40px 0", color: T.textMuted, fontSize: 13 }}>Loading records…</td></tr>}
              {!attLoading && attRows.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "60px 0" }}>
                    <Clock size={38} strokeWidth={1} color={T.textMuted} style={{ display: "block", margin: "0 auto 12px" }} />
                    <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 15, color: T.textSecondary }}>No attendance records found</p>
                    <p style={{ fontSize: 12, color: T.textMuted, marginTop: 4 }}>Try adjusting your filters</p>
                  </td>
                </tr>
              )}
              {attRows.map((row, i) => {
                const sm = ATT_STATUS_META[row.status] || ATT_STATUS_META.Offline;
                const min = computeRunning(row);
                const isActive = row.status === "Active";
                return (
                  <tr key={row._id} className="att-row" style={{ background: i % 2 === 0 ? "#fff" : T.bg, borderBottom: `1px solid ${T.borderLight}` }}>
                    <td style={{ padding: "13px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0, background: "linear-gradient(135deg, #0891b2, #06b6d4)", display: "grid", placeItems: "center", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 11, color: "#fff" }}>
                          {(row.userId?.name || "?").trim().split(/\s+/).map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                        </div>
                        <span style={{ fontWeight: 600, color: T.textPrimary }}>{row.userId?.name || "Unknown"}</span>
                      </div>
                    </td>
                    <td style={{ padding: "13px 16px", color: T.textSecondary }}>{row.displayDate || row.date}</td>
                    <td style={{ padding: "13px 16px", color: T.textSecondary, whiteSpace: "nowrap" }}>{fmtDateTime(row.loginTime)}</td>
                    <td style={{ padding: "13px 16px", color: T.textSecondary, whiteSpace: "nowrap" }}>
                      {isActive ? <span style={{ fontSize: 11, fontWeight: 600, color: "#0369a1", background: "#e0f2fe", padding: "3px 8px", borderRadius: 6 }}>Session Active</span> : fmtDateTime(row.logoutTime)}
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13, color: isActive ? T.green : T.textPrimary }}>{fmtMin(min)}</span>
                      {isActive && <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: T.green, marginLeft: 6, verticalAlign: "middle", boxShadow: `0 0 0 2px ${T.greenBg}` }} />}
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, padding: "5px 11px", borderRadius: 8, color: sm.color, background: sm.bg, border: `1px solid ${sm.border}`, letterSpacing: ".04em" }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: sm.color, flexShrink: 0 }} />
                        {row.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 22px", borderTop: `1px solid ${T.borderLight}` }}>
          <span style={{ fontSize: 12, color: T.textMuted }}>{attPagination.total || 0} record{attPagination.total !== 1 ? "s" : ""}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={() => setAttPage(p => Math.max(1, p - 1))} disabled={attPage <= 1} className="att-page-btn" style={{ width: 34, height: 34, borderRadius: 8, border: `1.5px solid ${T.border}`, background: "#fff", color: T.textSecondary, display: "grid", placeItems: "center" }}>
              <ChevronLeft size={15} strokeWidth={2} />
            </button>
            <span style={{ fontSize: 12.5, color: T.textSecondary, fontWeight: 600, minWidth: 80, textAlign: "center" }}>Page {attPage} / {attPagination.totalPages || 1}</span>
            <button onClick={() => setAttPage(p => Math.min(attPagination.totalPages || 1, p + 1))} disabled={attPage >= (attPagination.totalPages || 1)} className="att-page-btn" style={{ width: 34, height: 34, borderRadius: 8, border: `1.5px solid ${T.border}`, background: "#fff", color: T.textSecondary, display: "grid", placeItems: "center" }}>
              <ChevronRight size={15} strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
