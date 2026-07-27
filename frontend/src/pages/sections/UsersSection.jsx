import React, { useMemo, useState } from "react";
import {
  Briefcase, Pencil, Shield, Trash2, UserPlus, Users, Search, Filter,
  LayoutGrid, List, ChevronDown, ChevronLeft, ChevronRight, MoreVertical,
} from "lucide-react";
import { IconBtn, STATUS, T } from "./shared";

const ROLE_ACCENT = {
  admin: { color: "#f7931e", bg: "#fff4e6", border: "#fed7aa" },
  hr: { color: "#0d9488", bg: "#ccfbf1", border: "#99f6e4" },
  sales: { color: "#16a34a", bg: "#dcfce7", border: "#bbf7d0" },
  user: { color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
  client: { color: "#db2777", bg: "#fce7f3", border: "#fbcfe8" },
};

const ROLE_OPTIONS = [
  { value: "all", label: "All Roles" },
  { value: "admin", label: "Admin" },
  { value: "hr", label: "HR" },
  { value: "sales", label: "Sales" },
  { value: "user", label: "User" },
  { value: "client", label: "Client" },
];

const PAGE_SIZE = 6;

const fmtJoined = (d) => (d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—");

function FilterDropdown({ icon: Icon, value, onChange, options }) {
  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <Icon size={14} strokeWidth={2} color={T.textMuted} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
      <select
        className="inp"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          appearance: "none", cursor: "pointer", padding: "10px 32px 10px 34px",
          background: "#fff", border: `1.5px solid ${T.inputBorder}`, borderRadius: 10,
          color: T.textPrimary, fontSize: 13, fontWeight: 500, outline: "none", fontFamily: "inherit",
        }}
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown size={14} strokeWidth={2} color={T.textMuted} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
    </div>
  );
}

export default function UsersSection({ users, tasks, setTab, openEditUser, setDeleteUser }) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [view, setView] = useState("grid");
  const [page, setPage] = useState(1);

  const resetAnd = (setter) => (val) => { setter(val); setPage(1); };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (q && !(u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q))) return false;
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      return true;
    });
  }, [users, search, roleFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageUsers = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const rangeStart = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(filtered.length, safePage * PAGE_SIZE);

  return (
    <div className="fade-up">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 14 }}>
        <div>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 19, color: T.textPrimary }}>All Users</h2>
          <p style={{ fontSize: 12.5, color: T.textMuted, marginTop: 3 }}>{users.length} registered member{users.length !== 1 ? "s" : ""}</p>
        </div>
        <button className="pri-btn" onClick={() => setTab("createUser")} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", background: "linear-gradient(135deg, #f7931e, #e8590c)", color: "#fff", borderRadius: 10, fontSize: 13, fontWeight: 600 }}>
          <UserPlus size={15} strokeWidth={2} /> New User
        </button>
      </div>

      {/* ── Toolbar ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1 1 260px" }}>
          <Search size={15} strokeWidth={2} color={T.textMuted} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          <input
            className="inp"
            placeholder="Search users by name or email..."
            value={search}
            onChange={(e) => resetAnd(setSearch)(e.target.value)}
            style={{ width: "100%", boxSizing: "border-box", padding: "10px 14px 10px 38px", background: T.inputBg, border: `1.5px solid ${T.inputBorder}`, borderRadius: 10, color: T.textPrimary, fontSize: 13.5, outline: "none", fontFamily: "inherit" }}
          />
        </div>
        <FilterDropdown icon={Filter} value={roleFilter} onChange={resetAnd(setRoleFilter)} options={ROLE_OPTIONS} />
        <div style={{ display: "flex", border: `1.5px solid ${T.inputBorder}`, borderRadius: 10, overflow: "hidden", flexShrink: 0 }}>
          <button
            onClick={() => setView("grid")}
            title="Grid view"
            style={{ display: "grid", placeItems: "center", width: 38, height: 38, border: "none", cursor: "pointer", background: view === "grid" ? "#fff4e6" : "#fff", color: view === "grid" ? "#f7931e" : T.textMuted }}
          >
            <LayoutGrid size={16} strokeWidth={2} />
          </button>
          <button
            onClick={() => setView("list")}
            title="List view"
            style={{ display: "grid", placeItems: "center", width: 38, height: 38, border: "none", borderLeft: `1.5px solid ${T.inputBorder}`, cursor: "pointer", background: view === "list" ? "#fff4e6" : "#fff", color: view === "list" ? "#f7931e" : T.textMuted }}
          >
            <List size={16} strokeWidth={2} />
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 0" }}>
          <Users size={48} strokeWidth={1} color={T.textMuted} style={{ margin: "0 auto 16px", display: "block" }} />
          <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 17, color: T.textSecondary }}>No users match your filters</p>
        </div>
      ) : view === "grid" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: 14 }}>
          {pageUsers.map((user, i) => {
            const accent = ROLE_ACCENT[user.role] || ROLE_ACCENT.user;
            const initials = user.name ? user.name.trim().split(/\s+/).map(n => n[0]).join("").toUpperCase().slice(0, 2) : "??";
            const userTasks = tasks.filter(t => t.assignedTo?._id === user._id || t.assignedTo === user._id);
            const tasksDone = userTasks.filter(t => t.status === "completed").length;
            const pct = userTasks.length ? Math.round((tasksDone / userTasks.length) * 100) : 0;
            const showTaskProgress = user.role === "user";

            return (
              <div key={user._id} className="card card-in" style={{ background: T.card, border: `1.5px solid ${T.border}`, borderRadius: 16, padding: "22px", animationDelay: `${i * 40}ms`, boxShadow: "0 1px 3px rgba(0,0,0,.04)", position: "relative" }}>
                <div style={{ position: "absolute", top: 14, right: 14, display: "flex", gap: 6 }}>
                  <button title="More" style={{ width: 30, height: 30, borderRadius: 7, border: "none", cursor: "pointer", display: "grid", placeItems: "center", background: "transparent", color: T.textMuted }}>
                    <MoreVertical size={15} strokeWidth={2} />
                  </button>
                  <IconBtn icon={Pencil} color="#f7931e" bg="#fff4e6" hoverBg="#fed7aa" onClick={() => openEditUser(user)} title="Edit user" />
                  <IconBtn icon={Trash2} color={T.red} bg={T.redBg} hoverBg={T.redBorder} onClick={() => setDeleteUser(user)} title="Delete user" />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: 18, paddingRight: 104 }}>
                  <div style={{ width: 48, height: 48, borderRadius: "50%", flexShrink: 0, background: accent.bg, display: "grid", placeItems: "center", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, color: accent.color, border: `1.5px solid ${accent.border}` }}>
                    {initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: 14.5, color: T.textPrimary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.name}</div>
                    <div style={{ fontSize: 12, color: T.textMuted, marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.email}</div>
                  </div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 6, letterSpacing: ".07em", textTransform: "uppercase", color: accent.color, background: accent.bg, border: `1px solid ${accent.border}`, display: "inline-block", marginBottom: 16 }}>
                  {user.role?.toUpperCase()}
                </span>

                {showTaskProgress && (
                  <div style={{ borderTop: `1px solid ${T.borderLight}`, paddingTop: 15, marginBottom: 15 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 9 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: T.textMuted }}>
                        <Briefcase size={12} strokeWidth={1.8} />
                        <span><span style={{ color: T.textSecondary, fontWeight: 600 }}>{userTasks.length}</span> task{userTasks.length !== 1 ? "s" : ""} assigned</span>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: T.green }}>{pct}% done</span>
                    </div>
                    <div style={{ height: 5, background: "#f1f5f9", borderRadius: 99, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, borderRadius: 99, background: "linear-gradient(90deg, #f7931e, #16a34a)", transition: "width .6s cubic-bezier(.22,1,.36,1)" }} />
                    </div>
                    {userTasks.length > 0 && (
                      <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
                        {Object.entries(STATUS).map(([key, { label, color, bg, border, Icon: SIcon }]) => {
                          const count = userTasks.filter(t => (t.status || "pending") === key).length;
                          if (!count) return null;
                          return (
                            <span key={key} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10.5, fontWeight: 600, padding: "4px 9px", borderRadius: 6, color, background: bg, border: `1px solid ${border}` }}>
                              <SIcon size={10} strokeWidth={2} />{count} {label}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
                {user.role === "admin" && (
                  <div style={{ borderTop: `1px solid ${T.borderLight}`, paddingTop: 15, marginBottom: 15, display: "flex", alignItems: "center", gap: 8 }}>
                    <Shield size={13} strokeWidth={1.8} color="#f7931e" />
                    <span style={{ fontSize: 12, color: T.textMuted }}>Full system access — no task assignments</span>
                  </div>
                )}
                {!showTaskProgress && user.role !== "admin" && (
                  <div style={{ borderTop: `1px solid ${T.borderLight}`, paddingTop: 15, marginBottom: 15, display: "flex", alignItems: "center", gap: 8 }}>
                    <Briefcase size={13} strokeWidth={1.8} color={T.textMuted} />
                    <span style={{ fontSize: 12, color: T.textMuted }}>{user.role === "client" ? "Client account — no task tracking" : "Internal role — no task tracking"}</span>
                  </div>
                )}

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: `1px solid ${T.borderLight}`, paddingTop: 14 }}>
                  <div>
                    <div style={{ fontSize: 10.5, color: T.textMuted, textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 600, marginBottom: 5 }}>Status</div>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99, color: T.green, background: T.greenBg }}>Active</span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 10.5, color: T.textMuted, textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 600, marginBottom: 5 }}>Joined</div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: T.textPrimary }}>{fmtJoined(user.createdAt)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 16, overflow: "hidden" }}>
          {pageUsers.map((user, i) => {
            const accent = ROLE_ACCENT[user.role] || ROLE_ACCENT.user;
            const initials = user.name ? user.name.trim().split(/\s+/).map(n => n[0]).join("").toUpperCase().slice(0, 2) : "??";
            return (
              <div key={user._id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderBottom: i < pageUsers.length - 1 ? `1px solid ${T.borderLight}` : "none" }}>
                <div style={{ width: 38, height: 38, borderRadius: "50%", flexShrink: 0, background: accent.bg, display: "grid", placeItems: "center", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13, color: accent.color, border: `1.5px solid ${accent.border}` }}>
                  {initials}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5, color: T.textPrimary }}>{user.name}</div>
                  <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 2 }}>{user.email}</div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 6, letterSpacing: ".06em", textTransform: "uppercase", color: accent.color, background: accent.bg, border: `1px solid ${accent.border}`, flexShrink: 0 }}>
                  {user.role?.toUpperCase()}
                </span>
                <span style={{ fontSize: 12, color: T.textMuted, flexShrink: 0, minWidth: 100, textAlign: "right" }}>{fmtJoined(user.createdAt)}</span>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <IconBtn icon={Pencil} color="#f7931e" bg="#fff4e6" hoverBg="#fed7aa" onClick={() => openEditUser(user)} title="Edit user" />
                  <IconBtn icon={Trash2} color={T.red} bg={T.redBg} hoverBg={T.redBorder} onClick={() => setDeleteUser(user)} title="Delete user" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filtered.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 20, flexWrap: "wrap", gap: 12 }}>
          <span style={{ fontSize: 12.5, color: T.textMuted }}>
            Showing <strong style={{ color: T.textSecondary }}>{rangeStart}</strong> to <strong style={{ color: T.textSecondary }}>{rangeEnd}</strong> of <strong style={{ color: T.textSecondary }}>{filtered.length}</strong> users
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={safePage === 1}
              style={{ width: 34, height: 34, borderRadius: 9, border: `1.5px solid ${T.inputBorder}`, background: "#fff", color: safePage === 1 ? T.borderLight : T.textSecondary, cursor: safePage === 1 ? "not-allowed" : "pointer", display: "grid", placeItems: "center" }}
            >
              <ChevronLeft size={15} strokeWidth={2} />
            </button>
            {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                style={{
                  width: 34, height: 34, borderRadius: 9, cursor: "pointer",
                  background: p === safePage ? "linear-gradient(135deg, #f7931e, #e8590c)" : "#fff",
                  color: p === safePage ? "#fff" : T.textSecondary,
                  fontWeight: 700, fontSize: 13, fontFamily: "'Syne', sans-serif",
                  border: p === safePage ? "none" : `1.5px solid ${T.inputBorder}`,
                }}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              style={{ width: 34, height: 34, borderRadius: 9, border: `1.5px solid ${T.inputBorder}`, background: "#fff", color: safePage === totalPages ? T.borderLight : T.textSecondary, cursor: safePage === totalPages ? "not-allowed" : "pointer", display: "grid", placeItems: "center" }}
            >
              <ChevronRight size={15} strokeWidth={2} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
