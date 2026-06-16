import React from "react";
import { Briefcase, Pencil, Shield, Trash2, UserPlus, Users } from "lucide-react";
import { IconBtn, STATUS, T } from "./shared";

export default function UsersSection({ users, tasks, setTab, openEditUser, setDeleteUser }) {
  return (
    <div className="fade-up">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 19, color: T.textPrimary }}>All Users</h2>
          <p style={{ fontSize: 12.5, color: T.textMuted, marginTop: 3 }}>{users.length} registered member{users.length !== 1 ? "s" : ""}</p>
        </div>
        <button className="pri-btn" onClick={() => setTab("createUser")} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", background: "linear-gradient(135deg, #0891b2, #4f46e5)", color: "#fff", borderRadius: 10, fontSize: 13, fontWeight: 600 }}>
          <UserPlus size={15} strokeWidth={2} /> New User
        </button>
      </div>

      {users.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 0" }}>
          <Users size={48} strokeWidth={1} color={T.textMuted} style={{ margin: "0 auto 16px", display: "block" }} />
          <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 17, color: T.textSecondary }}>No users yet</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: 14 }}>
          {users.map((user, i) => {
            const isAdmin = user.role === "admin";
            const initials = user.name ? user.name.trim().split(/\s+/).map(n => n[0]).join("").toUpperCase().slice(0, 2) : "??";
            const userTasks = tasks.filter(t => t.assignedTo?._id === user._id || t.assignedTo === user._id);
            const tasksDone = userTasks.filter(t => t.status === "completed").length;
            const pct = userTasks.length ? Math.round((tasksDone / userTasks.length) * 100) : 0;
            return (
              <div key={user._id} className="card card-in" style={{ background: T.card, border: `1.5px solid ${T.border}`, borderRadius: 16, padding: "22px", animationDelay: `${i * 40}ms`, boxShadow: "0 1px 3px rgba(0,0,0,.04)", position: "relative" }}>
                <div style={{ position: "absolute", top: 14, right: 14, display: "flex", gap: 6 }}>
                  <IconBtn icon={Pencil} color="#4f46e5" bg="#eef2ff" hoverBg="#c7d2fe" onClick={() => openEditUser(user)} title="Edit user" />
                  <IconBtn icon={Trash2} color={T.red} bg={T.redBg} hoverBg={T.redBorder} onClick={() => setDeleteUser(user)} title="Delete user" />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: 18, paddingRight: 72 }}>
                  <div style={{ width: 48, height: 48, borderRadius: "50%", flexShrink: 0, background: isAdmin ? "linear-gradient(135deg, #4f46e5, #7c3aed)" : "linear-gradient(135deg, #0891b2, #06b6d4)", display: "grid", placeItems: "center", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, color: "#fff", boxShadow: isAdmin ? "0 4px 14px rgba(79,70,229,.3)" : "0 4px 14px rgba(8,145,178,.28)" }}>
                    {initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: 14.5, color: T.textPrimary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.name}</div>
                    <div style={{ fontSize: 12, color: T.textMuted, marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.email}</div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 6, letterSpacing: ".07em", textTransform: "uppercase", flexShrink: 0, color: isAdmin ? "#4f46e5" : "#0891b2", background: isAdmin ? "#eef2ff" : "#ecfeff", border: `1px solid ${isAdmin ? "#c7d2fe" : "#a5f3fc"}` }}>
                    {user.role?.toUpperCase()}
                  </span>
                </div>
                {!isAdmin && (
                  <div style={{ borderTop: `1px solid ${T.borderLight}`, paddingTop: 15 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 9 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: T.textMuted }}>
                        <Briefcase size={12} strokeWidth={1.8} />
                        <span><span style={{ color: T.textSecondary, fontWeight: 600 }}>{userTasks.length}</span> task{userTasks.length !== 1 ? "s" : ""} assigned</span>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: T.green }}>{pct}% done</span>
                    </div>
                    <div style={{ height: 5, background: "#f1f5f9", borderRadius: 99, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, borderRadius: 99, background: "linear-gradient(90deg, #4f46e5, #16a34a)", transition: "width .6s cubic-bezier(.22,1,.36,1)" }} />
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
                {isAdmin && (
                  <div style={{ borderTop: `1px solid ${T.borderLight}`, paddingTop: 15, display: "flex", alignItems: "center", gap: 8 }}>
                    <Shield size={13} strokeWidth={1.8} color="#4f46e5" />
                    <span style={{ fontSize: 12, color: T.textMuted }}>Full system access — no task assignments</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
