import React, { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck, Briefcase, Building2, CreditCard, Droplet, Globe, Mail, MoreVertical, Pencil, Phone,
  Power, Search, Filter, LayoutGrid, List, ChevronDown, ChevronLeft, ChevronRight,
  Trash2, UserPlus, Users, FileText,
} from "lucide-react";
import cybertrickLogo from "../../assets/cybertrick.png";
import { Modal, T } from "./shared";
import { uploadedFileUrl } from "../../utils/uploads";
import "./UsersSection.css";

const ROLE_OPTIONS = [
  { value: "all", label: "All Roles" },
  { value: "manager", label: "Manager" },
  { value: "hr", label: "HR" },
  { value: "sales", label: "Sales" },
  { value: "salesmanager", label: "Sales Manager" },
  { value: "telecaller", label: "Telecaller" },
  { value: "user", label: "User" },
  { value: "client", label: "Client" },
];

const roleLabel = (role) => ROLE_OPTIONS.find((o) => o.value === role)?.label || role || "";

const PAGE_SIZE = 6;

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—");
const fmtSalary = (v) => (v !== undefined && v !== null && v !== "" ? `₹${Number(v).toLocaleString("en-IN")}` : "—");
const getInitials = (name) => (name ? name.trim().split(/\s+/).map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "??");

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

function PassportPhoto({ user, className = "cm-id-photo", width, height, radius, darkFrame = false }) {
  const src = user.photo ? uploadedFileUrl("user-photos", user.photo) : "";
  const customStyle = width ? { width, height, borderRadius: radius } : undefined;
  return (
    <div
      className={className}
      style={{
        ...customStyle,
        ...(darkFrame ? { background: "rgba(255,255,255,0.14)", border: "2px solid rgba(255,255,255,0.35)" } : null),
      }}
    >
      {src ? (
        <img src={src} alt={user.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      ) : (
        <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: width ? Math.round(width * 0.32) : 28, color: darkFrame ? "#fff" : "#1e3a8a" }}>
          {getInitials(user.name)}
        </span>
      )}
    </div>
  );
}

function KVRow({ label, value, mono = false }) {
  const empty = !value || value === "—";
  return (
    <div className="emp-kv-row">
      <span className="emp-kv-label">{label}</span>
      <span className={`emp-kv-val${empty ? " is-empty" : ""}`} style={mono && !empty ? { fontVariantNumeric: "tabular-nums", letterSpacing: "0.02em" } : undefined}>
        {value || "Not provided"}
      </span>
    </div>
  );
}

function UserCardMenu({ user, isOpen, onToggle, onClose, onEdit, onToggleStatus, onDelete }) {
  const isInactive = user.isActive === false;
  return (
    <div style={{ position: "relative" }} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className="cm-id-menu-btn"
        aria-label={`Actions for ${user.name}`}
        aria-expanded={isOpen}
        onClick={onToggle}
      >
        <MoreVertical size={15} strokeWidth={2} />
      </button>
      {isOpen && (
        <div className="cm-id-dropdown" role="menu">
          <button type="button" role="menuitem" className="cm-id-dropdown-item" onClick={() => { onClose(); onEdit(user); }}>
            <Pencil size={13} strokeWidth={2} color="#f7931e" /> Edit Details
          </button>
          {onToggleStatus && (
            <button type="button" role="menuitem" className="cm-id-dropdown-item" onClick={() => { onClose(); onToggleStatus(user); }}>
              <Power size={13} strokeWidth={2} color={isInactive ? "#16a34a" : "#d97706"} />
              {isInactive ? "Mark Active" : "Mark Inactive"}
            </button>
          )}
          <button type="button" role="menuitem" className="cm-id-dropdown-item is-danger" onClick={() => { onClose(); onDelete(user); }}>
            <Trash2 size={13} strokeWidth={2} /> Delete User
          </button>
        </div>
      )}
    </div>
  );
}

export default function UsersSection({ users, setTab, openEditUser, setDeleteUser, onToggleUserStatus }) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [view, setView] = useState("grid");
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);

  useEffect(() => {
    if (!openMenuId) return undefined;
    const close = () => setOpenMenuId(null);
    const onKey = (e) => { if (e.key === "Escape") setOpenMenuId(null); };
    document.addEventListener("click", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [openMenuId]);

  const actingRole = localStorage.getItem("role");
  const canManageUser = (user) => actingRole !== "manager" || user.role === "user";

  const resetAnd = (setter) => (val) => { setter(val); setPage(1); };

  const visibleUsers = useMemo(() => users.filter((u) => u.role !== "admin"), [users]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return visibleUsers.filter((u) => {
      if (q && !(
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.empCode?.toLowerCase().includes(q) ||
        u.phone?.toLowerCase().includes(q) ||
        u.designation?.toLowerCase().includes(q) ||
        u.department?.toLowerCase().includes(q)
      )) return false;
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      return true;
    });
  }, [visibleUsers, search, roleFilter]);

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
          <p style={{ fontSize: 12.5, color: T.textMuted, marginTop: 3 }}>{visibleUsers.length} registered member{visibleUsers.length !== 1 ? "s" : ""} · Click any ID card to view full details</p>
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
            placeholder="Search by name, email, mobile, designation, department..."
            value={search}
            onChange={(e) => resetAnd(setSearch)(e.target.value)}
            style={{ width: "100%", boxSizing: "border-box", padding: "10px 14px 10px 38px", background: T.inputBg, border: `1.5px solid ${T.inputBorder}`, borderRadius: 10, color: T.textPrimary, fontSize: 13.5, outline: "none", fontFamily: "inherit" }}
          />
        </div>
        <FilterDropdown icon={Filter} value={roleFilter} onChange={resetAnd(setRoleFilter)} options={ROLE_OPTIONS} />
        <div style={{ display: "flex", border: `1.5px solid ${T.inputBorder}`, borderRadius: 10, overflow: "hidden", flexShrink: 0 }}>
          <button
            onClick={() => setView("grid")}
            title="ID Card view"
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
        <div className="emp-grid">
          {pageUsers.map((user, i) => (
            <div
              key={user._id}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedUser(user)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedUser(user); } }}
              className={`cm-id-card card-in${user.isActive === false ? " is-inactive" : ""}`}
              style={{ animationDelay: `${i * 35}ms` }}
            >
              {/* Top-left decorative two-tone ribbon */}
              <svg className="cm-id-ribbon" viewBox="0 0 140 108" aria-hidden="true">
                <defs>
                  <linearGradient id={`cmRibbonPurple-${user._id}`} x1="0" y1="1" x2="1" y2="0">
                    <stop offset="0%" stopColor="#5b21b6" />
                    <stop offset="55%" stopColor="#9333ea" />
                    <stop offset="100%" stopColor="#d946ef" />
                  </linearGradient>
                  <linearGradient id={`cmRibbonBlue-${user._id}`} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#051c5c" />
                    <stop offset="100%" stopColor="#0e48c7" />
                  </linearGradient>
                </defs>
                <path d="M0,0 L130,0 C82,22 34,54 0,104 Z" fill={`url(#cmRibbonPurple-${user._id})`} />
                <path d="M0,0 L94,0 C58,20 26,48 0,88 Z" fill={`url(#cmRibbonBlue-${user._id})`} />
              </svg>

              {/* Subtle right watermark */}
              <img src={cybertrickLogo} alt="" aria-hidden="true" className="cm-id-watermark" />

              {/* Lanyard slot + 3-dot action menu */}
              <div className="cm-id-top-bar">
                <div className="cm-id-slot" />
                {canManageUser(user) && (
                  <div className="cm-id-actions">
                    <UserCardMenu
                      user={user}
                      isOpen={openMenuId === user._id}
                      onToggle={() => setOpenMenuId((prev) => (prev === user._id ? null : user._id))}
                      onClose={() => setOpenMenuId(null)}
                      onEdit={openEditUser}
                      onToggleStatus={onToggleUserStatus}
                      onDelete={setDeleteUser}
                    />
                  </div>
                )}
              </div>

              {/* Company Logo */}
              <div className="cm-id-logo-wrap">
                <img src={cybertrickLogo} alt="Cybertricks Media Pvt Ltd" className="cm-id-logo" />
              </div>

              {/* Centered Passport Photo */}
              <div className="cm-id-photo-wrap">
                <PassportPhoto user={user} />
              </div>

              {/* Name & Designation Pill */}
              <div className="cm-id-name" title={user.name}>
                <span className="cm-id-name-text">{user.name}</span>
                {user.isActive === false && <span className="cm-id-inactive-dot" title="Inactive" aria-label="Inactive" />}
              </div>
              <div className="cm-id-pill-wrap">
                <span className="cm-id-pill" title={user.designation || roleLabel(user.role)}>
                  {user.designation || roleLabel(user.role)}
                </span>
              </div>

              <div className="cm-id-divider" />

              {/* Key ID Details */}
              <div className="cm-id-details">
                <div className="cm-id-row-2">
                  <div className="cm-id-item">
                    <span className="cm-id-circle"><BadgeCheck size={14} strokeWidth={2.1} /></span>
                    <div style={{ minWidth: 0 }}>
                      <div className="cm-id-label">Emp Code</div>
                      <div className="cm-id-value">{user.empCode || "—"}</div>
                    </div>
                  </div>
                  <div className="cm-id-item">
                    <span className="cm-id-circle"><Building2 size={14} strokeWidth={2.1} /></span>
                    <div style={{ minWidth: 0 }}>
                      <div className="cm-id-label">Department</div>
                      <div className="cm-id-value" title={user.department || roleLabel(user.role)}>
                        {user.department || roleLabel(user.role)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="cm-id-item">
                  <span className="cm-id-circle"><Mail size={14} strokeWidth={2.1} /></span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="cm-id-label">Email ID</div>
                    <div className="cm-id-value" title={user.email}>{user.email}</div>
                  </div>
                </div>

                <div className="cm-id-row-2">
                  <div className="cm-id-item">
                    <span className="cm-id-circle"><Phone size={14} strokeWidth={2.1} /></span>
                    <div style={{ minWidth: 0 }}>
                      <div className="cm-id-label">Mobile No.</div>
                      <div className="cm-id-value" title={user.phone || ""}>{user.phone || "—"}</div>
                    </div>
                  </div>
                  <div className="cm-id-item">
                    <span className="cm-id-circle"><Droplet size={14} strokeWidth={2.1} /></span>
                    <div style={{ minWidth: 0 }}>
                      <div className="cm-id-label">Blood Group</div>
                      <div className="cm-id-value">{user.bloodGroup || "—"}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Brand Footer */}
              <div className="cm-id-footer">
                <Globe size={14} strokeWidth={2} />
                <span style={{ opacity: 0.45 }}>|</span>
                <span>www.cybertricksmedia.com</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 16 }}>
          {pageUsers.map((user, i) => (
            <div
              key={user._id}
              className="emp-list-row"
              onClick={() => setSelectedUser(user)}
              style={{ borderBottom: i < pageUsers.length - 1 ? `1px solid ${T.borderLight}` : "none" }}
            >
              <PassportPhoto user={user} width={40} height={46} radius={8} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13.5, color: T.textPrimary }}>{user.name}</div>
                <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 2 }}>
                  {[user.designation, user.department, user.email].filter(Boolean).join(" · ")}
                </div>
              </div>
              {user.isActive === false && (
                <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 99, background: "#fee2e2", color: "#dc2626", border: "1px solid #fecaca", flexShrink: 0 }}>
                  Inactive
                </span>
              )}
              <span style={{ fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 99, letterSpacing: ".05em", textTransform: "uppercase", color: "#0b3c9d", background: "#eff6ff", border: "1px solid #bfdbfe", flexShrink: 0 }}>
                {roleLabel(user.role)}
              </span>
              <span style={{ fontSize: 12, color: T.textMuted, flexShrink: 0, minWidth: 100, textAlign: "right" }}>{fmtDate(user.doj || user.createdAt)}</span>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                {canManageUser(user) && (
                  <UserCardMenu
                    user={user}
                    isOpen={openMenuId === user._id}
                    onToggle={() => setOpenMenuId((prev) => (prev === user._id ? null : user._id))}
                    onClose={() => setOpenMenuId(null)}
                    onEdit={openEditUser}
                    onToggleStatus={onToggleUserStatus}
                    onDelete={setDeleteUser}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {filtered.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 20, flexWrap: "wrap", gap: 12 }}>
          <span style={{ fontSize: 12.5, color: T.textMuted }}>
            Showing <strong style={{ color: T.textSecondary }}>{rangeStart}</strong> to <strong style={{ color: T.textSecondary }}>{rangeEnd}</strong> of <strong style={{ color: T.textSecondary }}>{filtered.length}</strong> users
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
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
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              style={{ width: 34, height: 34, borderRadius: 9, border: `1.5px solid ${T.inputBorder}`, background: "#fff", color: safePage === totalPages ? T.borderLight : T.textSecondary, cursor: safePage === totalPages ? "not-allowed" : "pointer", display: "grid", placeItems: "center" }}
            >
              <ChevronRight size={15} strokeWidth={2} />
            </button>
          </div>
        </div>
      )}

      {/* Full Employee ID & Details Modal */}
      {selectedUser && (
        <Modal title="Employee Profile" onClose={() => setSelectedUser(null)} width={700}>
          <div>
            <div className="emp-modal-hero">
              <PassportPhoto user={selectedUser} width={78} height={96} radius={12} darkFrame />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                  {selectedUser.empCode && (
                    <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".08em", color: "#cbd5e1" }}>{selectedUser.empCode}</span>
                  )}
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", padding: "2px 9px", borderRadius: 99, background: "rgba(255,255,255,0.16)", color: "#fff" }}>
                    {roleLabel(selectedUser.role)}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 9px", borderRadius: 99, background: selectedUser.isActive === false ? "rgba(220,38,38,0.28)" : "rgba(22,163,74,0.28)", color: selectedUser.isActive === false ? "#fca5a5" : "#86efac" }}>
                    {selectedUser.isActive === false ? "Inactive" : "Active"}
                  </span>
                </div>
                <h3 style={{ margin: 0, fontFamily: "'Syne', sans-serif", fontSize: 21, fontWeight: 700, color: "#fff" }}>{selectedUser.name}</h3>
                <div style={{ fontSize: 13, color: "#e2e8f0", marginTop: 3 }}>
                  {[selectedUser.designation, selectedUser.department].filter(Boolean).join(" · ") || `${roleLabel(selectedUser.role)} Account`}
                </div>
              </div>
            </div>

            <div className="emp-modal-sections">
              <div className="emp-section-box">
                <div className="emp-section-head"><Phone size={12} /> Contact &amp; Address</div>
                <div className="emp-kv-list">
                  <KVRow label="Email" value={selectedUser.email} />
                  <KVRow label="Mobile No" value={selectedUser.phone} mono />
                  <KVRow label="Blood Group" value={selectedUser.bloodGroup} />
                  <KVRow label="Emergency Contact" value={selectedUser.emergencyContact} mono />
                  <KVRow label="Address" value={selectedUser.address} />
                </div>
              </div>

              <div className="emp-section-box">
                <div className="emp-section-head"><Briefcase size={12} /> Employment &amp; Payroll</div>
                <div className="emp-kv-list">
                  <KVRow label="Emp Code" value={selectedUser.empCode} mono />
                  <KVRow label="Designation" value={selectedUser.designation} />
                  <KVRow label="Department" value={selectedUser.department} />
                  <KVRow label="Date of Joining" value={fmtDate(selectedUser.doj)} />
                  <KVRow label="Salary" value={fmtSalary(selectedUser.salary)} mono />
                </div>
              </div>

              <div className="emp-section-box">
                <div className="emp-section-head"><CreditCard size={12} /> KYC &amp; Banking</div>
                <div className="emp-kv-list">
                  <KVRow label="PAN" value={selectedUser.pan} mono />
                  <KVRow label="Aadhar" value={selectedUser.aadhar} mono />
                  <KVRow label="Bank Account" value={selectedUser.bankAccount} mono />
                </div>
              </div>

              <div className="emp-section-box">
                <div className="emp-section-head"><FileText size={12} /> Remarks</div>
                <div style={{ padding: "12px 14px", fontSize: 12.5, lineHeight: 1.5, color: selectedUser.remarks ? T.textPrimary : T.textMuted }}>
                  {selectedUser.remarks || "No remarks added"}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                style={{ padding: "9px 18px", borderRadius: 9, border: `1.5px solid ${T.border}`, background: "#fff", color: T.textSecondary, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
              >
                Close
              </button>
              {canManageUser(selectedUser) && (
                <button
                  type="button"
                  className="pri-btn"
                  onClick={() => {
                    const target = selectedUser;
                    setSelectedUser(null);
                    openEditUser(target);
                  }}
                  style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 20px", background: "linear-gradient(135deg, #f7931e, #e8590c)", color: "#fff", borderRadius: 9, fontSize: 13, fontWeight: 700, fontFamily: "'Syne', sans-serif" }}
                >
                  <Pencil size={14} strokeWidth={2} /> Edit Details
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
