import React from "react";
import { Eye, EyeOff, Lock, Mail, Shield, User, UserPlus } from "lucide-react";
import { FieldIcon, FormField, T, baseInp } from "./shared";

export default function CreateUserSection({
  userForm,
  setUserForm,
  handleCreateUser,
  showPw,
  setShowPw,
}) {
  // A manager's Users section may only onboard plain team members — the
  // dropdown is locked to "User" rather than just defaulting to it, since
  // the backend also rejects any other role from a manager caller.
  const actingRole = localStorage.getItem("role");
  const isManager = actingRole === "manager";

  return (
    <div className="fade-up" style={{ maxWidth: 620 }}>
      <div style={{ marginBottom: 26 }}>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 20, color: T.textPrimary }}>Add New User</h2>
        <p style={{ fontSize: 13, color: T.textMuted, marginTop: 4 }}>Create a new account and assign a role</p>
      </div>
      <div style={{ background: T.card, border: `1.5px solid ${T.border}`, borderRadius: 18, padding: "30px", boxShadow: "0 2px 8px rgba(0,0,0,.05)" }}>
        <form onSubmit={handleCreateUser}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <FormField label="Full Name">
              <div style={{ position: "relative" }}><FieldIcon icon={User} /><input className="inp" style={baseInp} type="text" placeholder="John Doe" value={userForm.name} onChange={e => setUserForm({ ...userForm, name: e.target.value })} required /></div>
            </FormField>
            <FormField label="Role">
              <div style={{ position: "relative" }}>
                <FieldIcon icon={Shield} />
                <select
                  className="inp"
                  style={{ ...baseInp, appearance: "none", ...(isManager ? { opacity: 0.65, cursor: "not-allowed" } : {}) }}
                  value={isManager ? "user" : userForm.role}
                  disabled={isManager}
                  onChange={e => setUserForm({ ...userForm, role: e.target.value })}
                >
                  <option value="user">User</option>
                  {!isManager && (
                    <>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                      <option value="hr">HR</option>
                      <option value="sales">Sales</option>
                    </>
                  )}
                </select>
                {isManager && (
                  <p style={{ fontSize: 11.5, color: T.textMuted, marginTop: 6 }}>Managers can only create User accounts.</p>
                )}
              </div>
            </FormField>
            <FormField label="Email Address" span2>
              <div style={{ position: "relative" }}><FieldIcon icon={Mail} /><input className="inp" style={baseInp} type="email" placeholder="john@example.com" value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })} required /></div>
            </FormField>
            <FormField label="Password" span2>
              <div style={{ position: "relative" }}>
                <FieldIcon icon={Lock} />
                <input className="inp" style={baseInp} type={showPw ? "text" : "password"} placeholder="Set a strong password" value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })} required />
                <button type="button" onClick={() => setShowPw(p => !p)} style={{ position: "absolute", right: 13, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: T.textMuted, display: "flex", padding: 0 }}>
                  {showPw ? <EyeOff size={15} strokeWidth={1.8} /> : <Eye size={15} strokeWidth={1.8} />}
                </button>
              </div>
            </FormField>
          </div>
          <button className="pri-btn" type="submit" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", background: "linear-gradient(135deg, #f7931e, #e8590c)", color: "#fff", borderRadius: 11, padding: "13px", fontSize: 14, fontWeight: 700, fontFamily: "'Syne', sans-serif", letterSpacing: ".03em" }}>
            <UserPlus size={16} strokeWidth={2} /> Create User
          </button>
        </form>
      </div>
    </div>
  );
}
