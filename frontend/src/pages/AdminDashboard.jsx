import React, { useEffect, useMemo, useState } from "react";
import API from "../services/api";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, ClipboardList, Plus, UserPlus,
  LogOut, CheckCircle2, Clock, AlertCircle, Calendar,
  User, Mail, Lock, Shield, Briefcase,
  TrendingUp, CheckCheck, X, ListTodo, Eye, EyeOff,
  Activity, Pencil, Trash2, Save, Download, ChevronLeft, ChevronRight,
  Building2, FileText, DollarSign,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from "recharts";

// ─── theme tokens ─────────────────────────────────────────────────────────────
const T = {
  bg:           "#f5f6fa",
  sidebar:      "#ffffff",
  card:         "#ffffff",
  header:       "rgba(255,255,255,0.92)",
  border:       "#e8eaf0",
  borderLight:  "#f0f1f6",
  textPrimary:  "#0f172a",
  textSecondary:"#64748b",
  textMuted:    "#94a3b8",
  brand:        "#4f46e5",
  brandLight:   "#eef2ff",
  brandMid:     "#c7d2fe",
  inputBg:      "#f8f9fc",
  inputBorder:  "#e2e6ef",
  green:        "#16a34a", greenBg:  "#f0fdf4", greenBorder: "#bbf7d0",
  yellow:       "#d97706", yellowBg: "#fffbeb", yellowBorder:"#fde68a",
  red:          "#dc2626", redBg:    "#fef2f2", redBorder:   "#fecaca",
  slate:        "#64748b", slateBg:  "#f8fafc", slateBorder: "#e2e8f0",
  teal:         "#0f766e",
};

const PRIORITY = {
  low:    { label: "Low",    color: T.green,  bg: T.greenBg,  border: T.greenBorder  },
  medium: { label: "Medium", color: T.yellow, bg: T.yellowBg, border: T.yellowBorder },
  high:   { label: "High",   color: T.red,    bg: T.redBg,    border: T.redBorder    },
};
const STATUS = {
  completed:     { label: "Completed",   color: T.green,  bg: T.greenBg,  border: T.greenBorder,  Icon: CheckCircle2 },
  "in-progress": { label: "In Progress", color: T.yellow, bg: T.yellowBg, border: T.yellowBorder, Icon: TrendingUp   },
  pending:       { label: "Pending",     color: T.slate,  bg: T.slateBg,  border: T.slateBorder,  Icon: Clock        },
};
const ATT_STATUS_META = {
  Active:  { color: "#0369a1", bg: "#e0f2fe", border: "#bae6fd" },
  Offline: { color: T.slate,   bg: T.slateBg, border: T.slateBorder },
};

const PIE_COLORS       = ["#16a34a", "#d97706", "#64748b"];
const PRIORITY_COLORS  = { low: "#16a34a", medium: "#d97706", high: "#dc2626" };

// ─── attendance helpers ───────────────────────────────────────────────────────
const fmtDateTime = (v) => {
  if (!v) return "—";
  return new Date(v).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};
const fmtMin = (min) => {
  const s = Number(min) || 0;
  return `${Math.floor(s / 60)}h ${s % 60}m`;
};
const fmtCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

// ─── KpiCard ──────────────────────────────────────────────────────────────────
function KpiCard({ Icon, label, value, color, bgColor, sub }) {
  return (
    <div style={{
      flex: "1 1 150px", borderRadius: 16, padding: "20px 22px",
      background: T.card, border: `1px solid ${T.border}`,
      display: "flex", alignItems: "center", gap: 16,
      position: "relative", overflow: "hidden",
      boxShadow: "0 1px 3px rgba(0,0,0,.04)",
    }}>
      <div style={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, borderRadius: "50%", background: bgColor, pointerEvents: "none" }} />
      <div style={{ width: 46, height: 46, borderRadius: 13, flexShrink: 0, background: bgColor, border: `1.5px solid ${color}30`, display: "grid", placeItems: "center" }}>
        <Icon size={20} color={color} strokeWidth={1.8} />
      </div>
      <div>
        <div style={{ fontSize: 28, fontWeight: 700, color: T.textPrimary, lineHeight: 1, fontFamily: "'Syne', sans-serif" }}>{value}</div>
        <div style={{ fontSize: 11, color: T.textMuted, marginTop: 5, letterSpacing: ".09em", textTransform: "uppercase", fontWeight: 600 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color, marginTop: 3, fontWeight: 600 }}>{sub}</div>}
      </div>
    </div>
  );
}

// ─── AttendanceStatCard ───────────────────────────────────────────────────────
function AttStatCard({ icon: Icon, label, value, color, bg }) {
  return (
    <div style={{
      flex: "1 1 150px", background: T.card, border: `1px solid ${T.border}`,
      borderRadius: 14, padding: "18px 20px",
      display: "flex", alignItems: "center", gap: 14,
      boxShadow: "0 1px 3px rgba(0,0,0,.04)",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: -18, right: -18, width: 70, height: 70, borderRadius: "50%", background: bg, pointerEvents: "none" }} />
      <div style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0, background: bg, border: `1.5px solid ${color}30`, display: "grid", placeItems: "center" }}>
        <Icon size={18} color={color} strokeWidth={1.8} />
      </div>
      <div>
        <div style={{ fontSize: 24, fontWeight: 700, color: T.textPrimary, lineHeight: 1, fontFamily: "'Syne', sans-serif" }}>{value}</div>
        <div style={{ fontSize: 10.5, color: T.textMuted, marginTop: 4, letterSpacing: ".09em", textTransform: "uppercase", fontWeight: 600 }}>{label}</div>
      </div>
    </div>
  );
}

// ─── ChartCard ────────────────────────────────────────────────────────────────
function ChartCard({ title, subtitle, children, style = {} }) {
  return (
    <div style={{
      background: T.card, border: `1px solid ${T.border}`, borderRadius: 16,
      padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,.04)", ...style,
    }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: T.textPrimary }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: T.textMuted, marginTop: 3 }}>{subtitle}</div>}
      </div>
      {children}
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 14px", boxShadow: "0 4px 16px rgba(0,0,0,.1)", fontSize: 13 }}>
      {label && <div style={{ fontWeight: 600, color: T.textPrimary, marginBottom: 4 }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || T.textSecondary, display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: p.color, display: "inline-block" }} />
          {p.name}: <strong>{p.value}</strong>
        </div>
      ))}
    </div>
  );
}

// ─── FormField ────────────────────────────────────────────────────────────────
function FormField({ label, children, span2 = false }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, gridColumn: span2 ? "1 / -1" : undefined }}>
      <label style={{ fontSize: 11.5, fontWeight: 600, color: T.textSecondary, letterSpacing: ".06em", textTransform: "uppercase" }}>{label}</label>
      {children}
    </div>
  );
}

const baseInp = {
  width: "100%", boxSizing: "border-box",
  background: T.inputBg, border: `1.5px solid ${T.inputBorder}`,
  borderRadius: 10, padding: "10px 14px 10px 40px",
  color: T.textPrimary, fontSize: 13.5, outline: "none", fontFamily: "inherit",
  transition: "border-color .18s, box-shadow .18s",
};
const baseInpNoIcon = { ...baseInp, paddingLeft: 14 };

const baseFilter = {
  padding: "9px 12px 9px 36px",
  background: T.inputBg, border: `1.5px solid ${T.inputBorder}`,
  borderRadius: 9, color: T.textPrimary,
  fontSize: 13, outline: "none", fontFamily: "inherit",
  transition: "border-color .18s, box-shadow .18s",
};

function FieldIcon({ icon: Icon, small = false }) {
  return (
    <div style={{ position: "absolute", left: small ? 11 : 13, top: "50%", transform: "translateY(-50%)", color: T.textMuted, display: "flex", pointerEvents: "none" }}>
      <Icon size={small ? 13 : 15} strokeWidth={1.8} />
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children, width = 560 }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(15,23,42,0.45)", backdropFilter: "blur(4px)", animation: "fadeIn .18s ease" }}>
      <div style={{ background: "#fff", borderRadius: 20, width: `min(${width}px, 95vw)`, boxShadow: "0 24px 80px rgba(0,0,0,.2)", border: `1px solid ${T.border}`, animation: "slideUp .22s cubic-bezier(.22,1,.36,1)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 26px 18px", borderBottom: `1px solid ${T.borderLight}` }}>
          <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, color: T.textPrimary }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: T.textMuted, display: "flex", padding: 4, borderRadius: 6, transition: "background .15s" }} onMouseEnter={e => e.currentTarget.style.background = T.slateBg} onMouseLeave={e => e.currentTarget.style.background = "none"}>
            <X size={18} strokeWidth={2} />
          </button>
        </div>
        <div style={{ padding: "22px 26px 26px" }}>{children}</div>
      </div>
    </div>
  );
}

function ConfirmModal({ title, message, onConfirm, onClose }) {
  return (
    <Modal title={title} onClose={onClose} width={420}>
      <p style={{ fontSize: 13.5, color: T.textSecondary, lineHeight: 1.7, marginBottom: 24 }}>{message}</p>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button onClick={onClose} style={{ padding: "9px 18px", borderRadius: 9, border: `1.5px solid ${T.border}`, background: "#fff", color: T.textSecondary, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }} onMouseEnter={e => e.currentTarget.style.background = T.slateBg} onMouseLeave={e => e.currentTarget.style.background = "#fff"}>Cancel</button>
        <button onClick={onConfirm} style={{ padding: "9px 20px", borderRadius: 9, border: "none", background: "linear-gradient(135deg, #dc2626, #b91c1c)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Syne', sans-serif", display: "flex", alignItems: "center", gap: 7 }} onMouseEnter={e => e.currentTarget.style.filter = "brightness(1.1)"} onMouseLeave={e => e.currentTarget.style.filter = ""}>
          <Trash2 size={14} strokeWidth={2} /> Delete
        </button>
      </div>
    </Modal>
  );
}

function IconBtn({ icon: Icon, color, bg, hoverBg, onClick, title }) {
  const [hov, setHov] = useState(false);
  return (
    <button title={title} onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ width: 30, height: 30, borderRadius: 7, border: "none", cursor: "pointer", display: "grid", placeItems: "center", background: hov ? hoverBg : bg, color, transition: "background .15s, transform .15s", transform: hov ? "scale(1.1)" : "scale(1)", fontFamily: "inherit" }}>
      <Icon size={13} strokeWidth={2.2} />
    </button>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [clients, setClients] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [tab, setTab]     = useState("dashboard");
  const [toast, setToast] = useState(null);
  const [showPw, setShowPw] = useState(false);

  const [userForm, setUserForm] = useState({ name: "", email: "", password: "", role: "user" });
  const [taskForm, setTaskForm] = useState({ title: "", description: "", assignedTo: "", priority: "medium", dueDate: "" });

  const [editTask, setEditTask]         = useState(null);
  const [editTaskForm, setEditTaskForm] = useState({});
  const [editUser, setEditUser]         = useState(null);
  const [editUserForm, setEditUserForm] = useState({});
  const [showEditPw, setShowEditPw]     = useState(false);

  const [deleteTask, setDeleteTask] = useState(null);
  const [deleteUser, setDeleteUser] = useState(null);
  const [payUser, setPayUser] = useState(null);
  const [payingSalary, setPayingSalary] = useState(false);
  const [salaryForm, setSalaryForm] = useState({
    salaryMonth: new Date().toISOString().slice(0, 7),
    basicSalary: "",
    homeAllowance: "",
    travelAllowance: "",
    otherAllowance: "",
    leaves: "",
    pf: "",
    deductions: "",
  });

  // ── attendance state ───────────────────────────────────────────────────────
  const [attRows, setAttRows]           = useState([]);
  const [attUsers, setAttUsers]         = useState([]);
  const [attLoading, setAttLoading]     = useState(false);
  const [attPage, setAttPage]           = useState(1);
  const [attPagination, setAttPagination] = useState({ totalPages: 1, total: 0 });
  const [attSummary, setAttSummary]     = useState({
    perDay: [],
    monthlyTotalMinutes: 0,
    todayOverallMinutes: 0,
    overallDate: "",
  });
  const [attTick, setAttTick]           = useState(Date.now());
  const [attError, setAttError]         = useState("");
  const [stopPolling, setStopPolling]   = useState(false);
  const [attFilters, setAttFilters]     = useState({
    date: "", userId: "", status: "",
    month: new Date().toISOString().slice(0, 7),
  });

  const showToast = (msg, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3500); };

  const fetchUsers = async () => { try { const { data } = await API.get("/users"); setUsers(data); } catch {} };
  const fetchTasks = async () => { try { const { data } = await API.get("/tasks"); setTasks(data); } catch {} };
  const fetchClients = async () => { try { const { data } = await API.get("/clients"); setClients(data.clients || []); } catch {} };
  const fetchProposals = async () => { try { const { data } = await API.get("/clients/proposals/all"); setProposals(data.proposals || []); } catch {} };
  const fetchReminders = async () => { try { const { data } = await API.get("/clients/reminders/all"); setReminders(data.reminders || []); } catch {} };

  useEffect(() => { fetchUsers(); fetchTasks(); fetchClients(); fetchProposals(); fetchReminders(); }, []);

  // ── attendance fetch helpers ───────────────────────────────────────────────
  const attParams = useMemo(() => ({
    page: attPage, limit: 10,
    date:   attFilters.date   || undefined,
    userId: attFilters.userId || undefined,
    status: attFilters.status || undefined,
    month:  attFilters.month  || undefined,
  }), [attFilters, attPage]);

  const fetchAttUsers = async () => {
    try {
      const { data } = await API.get("/users");
      setAttUsers(data.filter(u => u.role === "user"));
    } catch (err) {
      const s = err?.response?.status;
      if (s === 401 || s === 403) { setAttError("Admin access required."); setStopPolling(true); }
    }
  };

  const fetchAttendance = async () => {
    setAttLoading(true);
    try {
      const { data } = await API.get("/attendance", { params: attParams });
      setAttRows(data.rows || []);
      setAttPagination(data.pagination || { totalPages: 1, total: 0 });
      setAttSummary(data.summary || {
        perDay: [],
        monthlyTotalMinutes: 0,
        todayOverallMinutes: 0,
        overallDate: "",
      });
      setAttError(""); setStopPolling(false);
    } catch (err) {
      const s = err?.response?.status;
      if (s === 404)           setAttError("Attendance API route not found. Restart backend.");
      else if (s === 401 || s === 403) { setAttError("Not authorized to view attendance."); setStopPolling(true); }
      else                     setAttError("Failed to load attendance records.");
      setAttRows([]);
    } finally { setAttLoading(false); }
  };

  const handleExport = async () => {
    try {
      const res = await API.get("/attendance/export/excel", { params: attParams, responseType: "blob" });
      const ct  = res.headers?.["content-type"] || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      const ext = ct.includes("csv") ? "csv" : "xlsx";
      const url = window.URL.createObjectURL(new Blob([res.data], { type: ct }));
      const a   = document.createElement("a");
      a.href = url; a.download = `attendance-${new Date().toISOString().slice(0, 10)}.${ext}`;
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
    } catch { setAttError("Failed to export attendance."); }
  };

  useEffect(() => { fetchAttUsers(); }, []);
  useEffect(() => { fetchAttendance(); }, [attParams]);
  useEffect(() => { const id = setInterval(() => setAttTick(Date.now()), 1000); return () => clearInterval(id); }, []);

  useEffect(() => {
    if (stopPolling) return;
    const pollId = setInterval(fetchAttendance, 15000);
    const io = typeof window !== "undefined" ? window.io : null;
    let socket = null;
    if (io) {
      socket = io("https://crm.technicaltiwariji.com", { transports: ["websocket"] });
      socket.on("attendance:updated", fetchAttendance);
    }
    return () => {
      clearInterval(pollId);
      if (socket) { socket.off("attendance:updated", fetchAttendance); socket.disconnect(); }
    };
  }, [attParams, stopPolling]);

  const selectedDayTotal = useMemo(() => {
    if (!attFilters.date) return null;
    const f = attSummary.perDay?.find(d => d.date === attFilters.date);
    return f ? fmtMin(f.totalMinutes) : "0h 0m";
  }, [attFilters.date, attSummary.perDay]);

  const computeRunning = (row) => {
    if (typeof row.displayWorkingMinutes === "number") return row.displayWorkingMinutes;
    if (row.status !== "Active") return row.totalSessionTime || 0;
    return Math.max(0, Math.round((new Date(attTick) - new Date(row.loginTime)) / 60000));
  };

  const setAttFilter = (key, val) => { setAttPage(1); setAttFilters(p => ({ ...p, [key]: val })); };

  // ── CRUD handlers ──────────────────────────────────────────────────────────
const handleCreateUser = async (e) => {
  e.preventDefault();

  // 🔥 YAHAN ADD KARNA HAI
console.log("Sending data:", JSON.stringify(userForm, null, 2));
  try {
    await API.post("/users", userForm);
    showToast("User created successfully");

    setUserForm({ name: "", email: "", password: "", role: "user" });
    fetchUsers();

  } catch (error) {
    // 🔥 YAHAN BHI ADD KAR
    console.log("Error response:", error.response);

    showToast(
      error?.response?.data?.message || "Failed to create user",
      false
    );
  }
};

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try { await API.post("/tasks", taskForm); showToast("Task created successfully"); setTaskForm({ title: "", description: "", assignedTo: "", priority: "medium", dueDate: "" }); fetchTasks(); }
    catch { showToast("Failed to create task", false); }
  };

  const openEditTask = (task) => {
    setEditTask(task);
    setEditTaskForm({ title: task.title || "", description: task.description || "", assignedTo: task.assignedTo?._id || task.assignedTo || "", priority: task.priority || "medium", status: task.status || "pending", dueDate: task.dueDate ? task.dueDate.slice(0, 10) : "" });
  };

  const handleUpdateTask = async (e) => {
    e.preventDefault();
    try { await API.put(`/tasks/update-task/${editTask._id}`, editTaskForm); showToast("Task updated successfully"); setEditTask(null); fetchTasks(); }
    catch { showToast("Failed to update task", false); }
  };

  const handleDeleteTask = async () => {
    try { await API.delete(`/tasks/${deleteTask._id}`); showToast("Task deleted"); setDeleteTask(null); fetchTasks(); }
    catch { showToast("Failed to delete task", false); }
  };

  const openEditUser = (user) => { setEditUser(user); setEditUserForm({ name: user.name || "", email: user.email || "", role: user.role || "user", password: "" }); setShowEditPw(false); };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    const payload = { name: editUserForm.name, email: editUserForm.email, role: editUserForm.role };
    if (editUserForm.password) payload.password = editUserForm.password;
    try { await API.put(`/users/${editUser._id}`, payload); showToast("User updated successfully"); setEditUser(null); fetchUsers(); }
    catch { showToast("Failed to update user", false); }
  };

  const handleDeleteUser = async () => {
    try { await API.delete(`/users/${deleteUser._id}`); showToast("User deleted"); setDeleteUser(null); fetchUsers(); }
    catch { showToast("Failed to delete user", false); }
  };

  const handleLogout = async () => {
    try { await API.post("/users/logout"); } catch {}
    localStorage.clear(); navigate("/");
  };

  const salaryPreview = useMemo(() => {
    const salaryMonth = salaryForm.salaryMonth;
    const basicSalary = Number(salaryForm.basicSalary) || 0;
    const homeAllowance = Number(salaryForm.homeAllowance) || 0;
    const travelAllowance = Number(salaryForm.travelAllowance) || 0;
    const otherAllowance = Number(salaryForm.otherAllowance) || 0;
    const leavesInput = Math.max(0, Number(salaryForm.leaves) || 0);
    const pf = Number(salaryForm.pf) || 0;
    const deductions = Number(salaryForm.deductions) || 0;

    const match = /^(\d{4})-(\d{2})$/.exec(String(salaryMonth || "").trim());
    const daysInMonth = match
      ? new Date(Number(match[1]), Number(match[2]), 0).getDate()
      : 30;
    const leaves = Math.min(leavesInput, daysInMonth);
    const leaveDeduction = Number(((basicSalary / Math.max(daysInMonth, 1)) * leaves).toFixed(2));
    const totalAllowances = homeAllowance + travelAllowance + otherAllowance;
    const totalDeductions = pf + deductions + leaveDeduction;
    const inHand = Math.max(0, Number((basicSalary + totalAllowances - totalDeductions).toFixed(2)));

    return { daysInMonth, leaves, leaveDeduction, totalAllowances, totalDeductions, inHand };
  }, [salaryForm]);

  const openPaySalary = (user) => {
    setPayUser(user);
    setSalaryForm({
      salaryMonth: new Date().toISOString().slice(0, 7),
      basicSalary: "",
      homeAllowance: "",
      travelAllowance: "",
      otherAllowance: "",
      leaves: "",
      pf: "",
      deductions: "",
    });
  };

  const handlePaySalary = async (e) => {
    e.preventDefault();
    if (!payUser) return;

    setPayingSalary(true);
    try {
      await API.post(`/salary/pay/${payUser._id}`, salaryForm);
      showToast(`Salary slip sent to ${payUser.email}`);
      setPayUser(null);
    } catch (error) {
      showToast(error?.response?.data?.message || "Failed to send salary slip", false);
    } finally {
      setPayingSalary(false);
    }
  };

  // ── derived stats ──────────────────────────────────────────────────────────
  const done   = tasks.filter(t => t.status === "completed").length;
  const inProg = tasks.filter(t => t.status === "in-progress").length;
  const pend   = tasks.filter(t => !t.status || t.status === "pending").length;
  const admins = users.filter(u => u.role === "admin").length;
  const regularUsers = users.filter(u => u.role === "user").length;
  const completionRate = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  const statusPieData = [
    { name: "Completed",   value: done   },
    { name: "In Progress", value: inProg },
    { name: "Pending",     value: pend   },
  ].filter(d => d.value > 0);

  const priorityBarData = [
    { name: "Low",    count: tasks.filter(t => t.priority === "low").length,    fill: PRIORITY_COLORS.low    },
    { name: "Medium", count: tasks.filter(t => t.priority === "medium").length, fill: PRIORITY_COLORS.medium },
    { name: "High",   count: tasks.filter(t => t.priority === "high").length,   fill: PRIORITY_COLORS.high   },
  ];

  const tasksByUser = users
    .filter(u => u.role === "user")
    .map(u => ({
      name:  u.name?.split(" ")[0] || "?",
      total: tasks.filter(t => t.assignedTo?._id === u._id || t.assignedTo === u._id).length,
      done:  tasks.filter(t => (t.assignedTo?._id === u._id || t.assignedTo === u._id) && t.status === "completed").length,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);

  // active users chart — users with ≥1 active attendance row
  const activeUserIds = new Set(attRows.filter(r => r.status === "Active").map(r => r.userId?._id || r.userId));
  const activeUsersData = users
    .filter(u => u.role === "user")
    .map(u => ({
      name:     u.name?.split(" ")[0] || "?",
      isActive: activeUserIds.has(u._id),
      tasks:    tasks.filter(t => t.assignedTo?._id === u._id || t.assignedTo === u._id).length,
    }))
    .sort((a, b) => b.isActive - a.isActive || b.tasks - a.tasks)
    .slice(0, 8);

  const TABS = [
    { id: "dashboard",  label: "Dashboard",  Icon: LayoutDashboard, section: "overview" },
    { id: "attendance", label: "Attendance", Icon: Clock,           section: "overview" },
    { id: "tasks",      label: "All Tasks",  Icon: ClipboardList,   section: "overview" },
    { id: "users",      label: "All Users",  Icon: Users,           section: "overview" },
    { id: "clients",    label: "Clients",    Icon: Building2,       section: "overview" },
    { id: "salary",     label: "Salary",     Icon: Briefcase,       section: "manage"   },
    { id: "createTask", label: "New Task",   Icon: Plus,            section: "manage"   },
    { id: "createUser", label: "New User",   Icon: UserPlus,        section: "manage"   },
  ];

  const currentLabel = TABS.find(t => t.id === tab)?.label || "Dashboard";

  // active count in current attendance rows
  const attActiveNow = attRows.filter(r => r.status === "Active").length;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@500;600;700;800&family=Inter:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: ${T.bg}; min-height: 100vh; }
        ::placeholder { color: ${T.textMuted}; font-size: 13px; }
        select option { background: #fff; color: ${T.textPrimary}; }
        input[type=date]::-webkit-calendar-picker-indicator { cursor: pointer; opacity: .5; }

        .card { transition: border-color .2s, box-shadow .2s, transform .2s; }
        .card:hover { border-color: ${T.brandMid} !important; box-shadow: 0 4px 24px rgba(79,70,229,.08) !important; transform: translateY(-1px); }

        .inp { transition: border-color .18s, box-shadow .18s; }
        .inp:focus { border-color: ${T.brand} !important; box-shadow: 0 0 0 3px rgba(79,70,229,.1) !important; outline: none; background: #fff !important; }

        .att-inp:focus { border-color: ${T.brand} !important; box-shadow: 0 0 0 3px rgba(79,70,229,.1) !important; outline: none; background: #fff !important; }
        .att-row { transition: background .15s; }
        .att-row:hover { background: ${T.brandLight} !important; }
        .att-exp-btn { transition: filter .18s, transform .15s; cursor: pointer; border: none; font-family: inherit; }
        .att-exp-btn:hover { filter: brightness(1.08); transform: translateY(-1px); }
        .att-page-btn { transition: background .15s, border-color .15s; cursor: pointer; font-family: inherit; }
        .att-page-btn:hover:not(:disabled) { background: ${T.brandLight} !important; border-color: ${T.brandMid} !important; color: ${T.brand} !important; }
        .att-page-btn:disabled { opacity: .4; cursor: default; }

        .nav-btn { border: none; cursor: pointer; font-family: inherit; background: transparent; transition: all .16s; }
        .nav-btn:hover:not(.nav-active) { background: ${T.brandLight} !important; color: ${T.brand} !important; }

        .pri-btn { transition: filter .18s, transform .15s, box-shadow .18s; cursor: pointer; border: none; font-family: inherit; }
        .pri-btn:hover { filter: brightness(1.07); transform: translateY(-1px); box-shadow: 0 6px 20px rgba(79,70,229,.3); }
        .pri-btn:active { transform: translateY(0); filter: brightness(.97); }

        .logout-btn { transition: background .16s, color .16s; cursor: pointer; border: none; font-family: inherit; }
        .logout-btn:hover { background: ${T.redBg} !important; color: ${T.red} !important; }

        @keyframes fadeUp  { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes cardIn  { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes toastIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(24px) scale(.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes pulse   { 0%,100% { opacity: 1; } 50% { opacity: .4; } }

        .fade-up { animation: fadeUp .32s cubic-bezier(.22,1,.36,1) both; }
        .card-in  { animation: cardIn  .36s cubic-bezier(.22,1,.36,1) both; }
        textarea.inp { resize: vertical; }
        select.inp { appearance: none; }
        .recharts-cartesian-axis-tick text { font-family: 'Inter', sans-serif; font-size: 12px; fill: ${T.textMuted}; }
        .recharts-legend-item-text { font-family: 'Inter', sans-serif !important; font-size: 12px !important; color: ${T.textSecondary} !important; }
      `}</style>

      <div style={{ minHeight: "100vh", background: T.bg, fontFamily: "'Inter', sans-serif", color: T.textSecondary }}>

        {/* ── SIDEBAR ─────────────────────────────────────────────────────── */}
        <aside style={{ position: "fixed", left: 0, top: 0, bottom: 0, width: 238, background: T.sidebar, borderRight: `1px solid ${T.border}`, display: "flex", flexDirection: "column", zIndex: 100, boxShadow: "1px 0 0 0 #e8eaf0" }}>
          <div style={{ padding: "26px 22px 22px", borderBottom: `1px solid ${T.borderLight}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, flexShrink: 0, background: "linear-gradient(135deg, #4f46e5, #7c3aed)", display: "grid", placeItems: "center", boxShadow: "0 4px 14px rgba(79,70,229,.35)" }}>
                <LayoutDashboard size={18} color="#fff" strokeWidth={2} />
              </div>
              <div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, color: T.textPrimary, lineHeight: 1 }}>AdminPanel</div>
                <div style={{ fontSize: 10, color: T.textMuted, letterSpacing: ".1em", marginTop: 4, textTransform: "uppercase", fontWeight: 600 }}>Control Center</div>
              </div>
            </div>
          </div>
          <nav style={{ flex: 1, padding: "18px 12px", display: "flex", flexDirection: "column", gap: 2 }}>
            {["overview", "manage"].map(section => (
              <div key={section}>
                <div style={{ fontSize: 10, color: T.textMuted, letterSpacing: ".14em", textTransform: "uppercase", fontWeight: 700, padding: section === "manage" ? "18px 12px 8px" : "4px 12px 8px" }}>{section}</div>
                {TABS.filter(t => t.section === section).map(({ id, label, Icon }) => {
                  const active = tab === id;
                  return (
                    <button key={id} className={`nav-btn${active ? " nav-active" : ""}`} onClick={() => setTab(id)} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 12px", borderRadius: 9, textAlign: "left", color: active ? T.brand : T.textSecondary, background: active ? T.brandLight : "transparent", fontWeight: active ? 600 : 400, fontSize: 13.5, borderLeft: `3px solid ${active ? T.brand : "transparent"}` }}>
                      <Icon size={16} strokeWidth={active ? 2.2 : 1.8} color={active ? T.brand : T.textMuted} />
                      {label}
                      {active && <div style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: "50%", background: T.brand, flexShrink: 0 }} />}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>
          <div style={{ padding: "14px 12px", borderTop: `1px solid ${T.borderLight}` }}>
            <button className="logout-btn" onClick={handleLogout} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 12px", borderRadius: 9, color: T.textSecondary, background: "transparent", fontSize: 13.5, fontWeight: 500 }}>
              <LogOut size={15} strokeWidth={1.8} /> Sign Out
            </button>
          </div>
        </aside>

        {/* ── CONTENT ─────────────────────────────────────────────────────── */}
        <div style={{ marginLeft: 238, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
          <header style={{ position: "sticky", top: 0, zIndex: 50, height: 64, padding: "0 36px", display: "flex", alignItems: "center", justifyContent: "space-between", background: T.header, borderBottom: `1px solid ${T.border}`, backdropFilter: "blur(16px)", boxShadow: "0 1px 0 0 #e8eaf0" }}>
            <div>
              <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 17, color: T.textPrimary, lineHeight: 1 }}>{currentLabel}</h1>
              <p style={{ fontSize: 11.5, color: T.textMuted, marginTop: 3 }}>{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #4f46e5, #7c3aed)", display: "grid", placeItems: "center", boxShadow: "0 2px 10px rgba(79,70,229,.3)" }}>
                <Shield size={15} color="#fff" strokeWidth={2} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.textPrimary, lineHeight: 1 }}>Administrator</div>
                <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>Super Admin</div>
              </div>
            </div>
          </header>

          <main style={{ padding: "30px 36px 64px", flex: 1 }}>

            {/* ══ DASHBOARD ══════════════════════════════════════════════════ */}
            {tab === "dashboard" && (
              <div className="fade-up">
                {/* KPI row */}
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 26 }}>
                  <KpiCard Icon={Users}      label="Total Users"  value={users.length} color="#4f46e5" bgColor="#eef2ff" />
                  <KpiCard Icon={ListTodo}   label="Total Tasks"  value={tasks.length} color="#0891b2" bgColor="#ecfeff" />
                  <KpiCard Icon={CheckCheck} label="Completed"    value={done}         color={T.green}  bgColor={T.greenBg}  sub={`${completionRate}% rate`} />
                  <KpiCard Icon={TrendingUp} label="In Progress"  value={inProg}       color={T.yellow} bgColor={T.yellowBg} />
                  <KpiCard Icon={Clock}      label="Pending"      value={pend}         color={T.slate}  bgColor={T.slateBg}  />
                </div>

                {/* row 1 – pie + priority bar */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>
                  <ChartCard title="Task Status Breakdown" subtitle="Distribution of tasks by current status">
                    {statusPieData.length === 0 ? (
                      <div style={{ height: 240, display: "grid", placeItems: "center", color: T.textMuted, fontSize: 13 }}>No task data yet</div>
                    ) : (
                      <ResponsiveContainer width="100%" height={240}>
                        <PieChart>
                          <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={3} dataKey="value">
                            {statusPieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} strokeWidth={0} />)}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                          <Legend iconType="circle" iconSize={8} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                    <div style={{ textAlign: "center", marginTop: 8 }}>
                      <span style={{ fontSize: 13, color: T.textMuted }}>Completion rate: </span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: T.green }}>{completionRate}%</span>
                    </div>
                  </ChartCard>

                  <ChartCard title="Tasks by Priority" subtitle="Number of tasks at each priority level">
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={priorityBarData} barSize={36} margin={{ top: 4, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={T.borderLight} vertical={false} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} />
                        <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(79,70,229,.05)" }} />
                        <Bar dataKey="count" name="Tasks" radius={[8, 8, 0, 0]}>
                          {priorityBarData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>
                </div>

                {/* row 2 – active users + tasks per user */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>

                  {/* ── Active Users Chart (replaces Weekly Task Activity) ── */}
                  <ChartCard title="Active Users" subtitle="Online status & task load per user">
                    {activeUsersData.length === 0 ? (
                      <div style={{ height: 220, display: "grid", placeItems: "center", color: T.textMuted, fontSize: 13 }}>No user data yet</div>
                    ) : (
                      <>
                        <ResponsiveContainer width="100%" height={180}>
                          <BarChart data={activeUsersData} barSize={22} margin={{ top: 4, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={T.borderLight} vertical={false} />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} />
                            <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(79,70,229,.05)" }} />
                            <Bar dataKey="tasks" name="Tasks" radius={[6, 6, 0, 0]}>
                              {activeUsersData.map((u, i) => (
                                <Cell key={i} fill={u.isActive ? T.green : T.brandMid} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                        {/* legend */}
                        <div style={{ display: "flex", gap: 18, marginTop: 12, fontSize: 12, color: T.textMuted, justifyContent: "center" }}>
                          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ width: 10, height: 10, borderRadius: 3, background: T.green, display: "inline-block" }} />
                            Active now
                          </span>
                          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ width: 10, height: 10, borderRadius: 3, background: T.brandMid, display: "inline-block" }} />
                            Offline
                          </span>
                        </div>
                        {/* active count badge */}
                        <div style={{ marginTop: 10, textAlign: "center" }}>
                          <span style={{ fontSize: 12, color: T.textMuted }}>Currently online: </span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: T.green }}>{activeUserIds.size} user{activeUserIds.size !== 1 ? "s" : ""}</span>
                        </div>
                      </>
                    )}
                  </ChartCard>

                  <ChartCard title="Tasks per User" subtitle="Total vs completed tasks by assignee">
                    {tasksByUser.length === 0 ? (
                      <div style={{ height: 220, display: "grid", placeItems: "center", color: T.textMuted, fontSize: 13 }}>No user task data yet</div>
                    ) : (
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={tasksByUser} barSize={14} barGap={3} margin={{ top: 4, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={T.borderLight} vertical={false} />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} />
                          <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
                          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(79,70,229,.05)" }} />
                          <Legend iconType="circle" iconSize={8} />
                          <Bar dataKey="total" name="Total"     fill="#c7d2fe" radius={[6, 6, 0, 0]} />
                          <Bar dataKey="done"  name="Completed" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </ChartCard>
                </div>

                {/* row 3 – stat tiles */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
                  {[
                    { label: "Admin Users",    value: admins,       color: "#7c3aed", bg: "#f5f3ff", desc: "Full system access"       },
                    { label: "Regular Users",  value: regularUsers, color: "#0891b2", bg: "#ecfeff", desc: "Standard access"           },
                    { label: "Avg Tasks/User", value: regularUsers ? (tasks.length / regularUsers).toFixed(1) : "—", color: T.green, bg: T.greenBg, desc: "Tasks per regular user" },
                  ].map(({ label, value, color, bg, desc }) => (
                    <div key={label} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "20px 22px", boxShadow: "0 1px 3px rgba(0,0,0,.04)" }}>
                      <div style={{ fontSize: 11, color: T.textMuted, letterSpacing: ".09em", textTransform: "uppercase", fontWeight: 600, marginBottom: 8 }}>{label}</div>
                      <div style={{ fontSize: 32, fontWeight: 700, color, fontFamily: "'Syne', sans-serif", lineHeight: 1 }}>{value}</div>
                      <div style={{ fontSize: 12, color: T.textMuted, marginTop: 6 }}>{desc}</div>
                      <div style={{ marginTop: 14, height: 4, background: bg, borderRadius: 99, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${Math.min(100, (Number(value) / Math.max(users.length, 1)) * 100)}%`, background: color, borderRadius: 99 }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ══ ATTENDANCE ═════════════════════════════════════════════════ */}
            {tab === "attendance" && (
              <div className="fade-up">
                <div style={{ marginBottom: 20 }}>
                  <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 19, color: T.textPrimary }}>Attendance Management</h2>
                  <p style={{ fontSize: 12.5, color: T.textMuted, marginTop: 3 }}>Track login/logout, active/offline status and working hours.</p>
                </div>

                {/* stat cards */}
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 20 }}>
                  <AttStatCard icon={Clock}    label={attFilters.date ? `${attFilters.date} Active` : "Today Overall"} value={fmtMin(attSummary.todayOverallMinutes || 0)} color="#0891b2" bg="#ecfeff" />
                  <AttStatCard icon={Calendar} label="Monthly Total"  value={fmtMin(attSummary.monthlyTotalMinutes || 0)} color={T.brand}  bg={T.brandLight} />
                  <AttStatCard icon={Activity} label="Active Now"     value={attActiveNow}              color={T.green} bg={T.greenBg} />
                  <AttStatCard icon={Users}    label="Records"        value={attPagination.total || 0}  color={T.slate} bg={T.slateBg} />
                  {attFilters.date && (
                    <AttStatCard icon={CheckCircle2} label={`${attFilters.date} Total`} value={selectedDayTotal || "0h 0m"} color={T.yellow} bg={T.yellowBg} />
                  )}
                </div>

                {/* main card */}
                <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,.04)", overflow: "hidden" }}>

                  {/* filter bar */}
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
                    <button onClick={handleExport} className="att-exp-btn"
                      style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 7, background: `linear-gradient(135deg, ${T.teal}, #0d9488)`, color: "#fff", borderRadius: 9, padding: "9px 16px", fontSize: 13, fontWeight: 700, fontFamily: "'Syne', sans-serif", boxShadow: "0 2px 8px rgba(15,118,110,.25)" }}>
                      <Download size={14} strokeWidth={2.2} /> Export Excel
                    </button>
                  </div>

                  {/* error */}
                  {attError && (
                    <div style={{ margin: "14px 22px 0", display: "flex", alignItems: "center", gap: 9, color: T.red, background: T.redBg, border: `1px solid ${T.redBorder}`, borderRadius: 9, padding: "10px 14px", fontSize: 12.5 }}>
                      <AlertCircle size={14} strokeWidth={2} />{attError}
                    </div>
                  )}

                  {/* table */}
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
                        {attLoading && (
                          <tr><td colSpan={6} style={{ textAlign: "center", padding: "40px 0", color: T.textMuted, fontSize: 13 }}>Loading records…</td></tr>
                        )}
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
                          const sm  = ATT_STATUS_META[row.status] || ATT_STATUS_META.Offline;
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
                                {isActive
                                  ? <span style={{ fontSize: 11, fontWeight: 600, color: "#0369a1", background: "#e0f2fe", padding: "3px 8px", borderRadius: 6 }}>Session Active</span>
                                  : fmtDateTime(row.logoutTime)}
                              </td>
                              <td style={{ padding: "13px 16px" }}>
                                <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13, color: isActive ? T.green : T.textPrimary }}>
                                  {fmtMin(min)}
                                </span>
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

                  {/* pagination */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 22px", borderTop: `1px solid ${T.borderLight}` }}>
                    <span style={{ fontSize: 12, color: T.textMuted }}>{attPagination.total || 0} record{attPagination.total !== 1 ? "s" : ""}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <button onClick={() => setAttPage(p => Math.max(1, p - 1))} disabled={attPage <= 1} className="att-page-btn"
                        style={{ width: 34, height: 34, borderRadius: 8, border: `1.5px solid ${T.border}`, background: "#fff", color: T.textSecondary, display: "grid", placeItems: "center" }}>
                        <ChevronLeft size={15} strokeWidth={2} />
                      </button>
                      <span style={{ fontSize: 12.5, color: T.textSecondary, fontWeight: 600, minWidth: 80, textAlign: "center" }}>
                        Page {attPage} / {attPagination.totalPages || 1}
                      </span>
                      <button onClick={() => setAttPage(p => Math.min(attPagination.totalPages || 1, p + 1))} disabled={attPage >= (attPagination.totalPages || 1)} className="att-page-btn"
                        style={{ width: 34, height: 34, borderRadius: 8, border: `1.5px solid ${T.border}`, background: "#fff", color: T.textSecondary, display: "grid", placeItems: "center" }}>
                        <ChevronRight size={15} strokeWidth={2} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ══ ALL TASKS ══════════════════════════════════════════════════ */}
            {tab === "tasks" && (
              <div className="fade-up">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                  <div>
                    <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 19, color: T.textPrimary }}>All Tasks</h2>
                    <p style={{ fontSize: 12.5, color: T.textMuted, marginTop: 3 }}>{tasks.length} task{tasks.length !== 1 ? "s" : ""} total</p>
                  </div>
                  <button className="pri-btn" onClick={() => setTab("createTask")} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", background: "linear-gradient(135deg, #4f46e5, #7c3aed)", color: "#fff", borderRadius: 10, fontSize: 13, fontWeight: 600 }}>
                    <Plus size={15} strokeWidth={2.5} /> New Task
                  </button>
                </div>
                {tasks.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "80px 0" }}>
                    <ClipboardList size={48} strokeWidth={1} color={T.textMuted} style={{ margin: "0 auto 16px", display: "block" }} />
                    <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 17, color: T.textSecondary }}>No tasks yet</p>
                    <p style={{ fontSize: 13, color: T.textMuted, marginTop: 6 }}>Create your first task to get started</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {tasks.map((task, i) => {
                      const sm = STATUS[task.status] || STATUS.pending;
                      const pm = PRIORITY[task.priority] || PRIORITY.medium;
                      const StatusIcon = sm.Icon;
                      return (
                        <div key={task._id} className="card card-in" style={{ background: T.card, border: `1.5px solid ${T.border}`, borderRadius: 14, padding: "18px 20px", animationDelay: `${i * 35}ms`, display: "flex", alignItems: "flex-start", boxShadow: "0 1px 3px rgba(0,0,0,.04)" }}>
                          <div style={{ width: 3, borderRadius: 99, background: pm.color, alignSelf: "stretch", marginRight: 16, flexShrink: 0, minHeight: 52 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap", marginBottom: task.description ? 5 : 10 }}>
                              <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: 14.5, color: T.textPrimary }}>{task.title}</h3>
                              <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 5, color: pm.color, background: pm.bg, border: `1px solid ${pm.border}`, letterSpacing: ".07em", textTransform: "uppercase" }}>{pm.label}</span>
                            </div>
                            {task.description && <p style={{ fontSize: 12.5, color: T.textMuted, lineHeight: 1.65, marginBottom: 12 }}>{task.description}</p>}
                            <div style={{ display: "flex", gap: 18, flexWrap: "wrap", fontSize: 12, color: T.textMuted, alignItems: "center" }}>
                              <span style={{ display: "flex", alignItems: "center", gap: 5 }}><User size={12} strokeWidth={1.8} />{task.assignedTo?.name || "Unassigned"}</span>
                              <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Calendar size={12} strokeWidth={1.8} />{task.dueDate ? new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "No due date"}</span>
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 14, flexShrink: 0 }}>
                            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600, padding: "6px 12px", borderRadius: 8, color: sm.color, background: sm.bg, border: `1px solid ${sm.border}` }}>
                              <StatusIcon size={12} strokeWidth={2} />{sm.label}
                            </span>
                            <IconBtn icon={Pencil} color="#4f46e5" bg="#eef2ff"  hoverBg="#c7d2fe" onClick={() => openEditTask(task)} title="Edit task" />
                            <IconBtn icon={Trash2} color={T.red}   bg={T.redBg} hoverBg={T.redBorder} onClick={() => setDeleteTask(task)} title="Delete task" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ══ CLIENTS ════════════════════════════════════════════════════ */}
            {tab === "clients" && (
              <div className="fade-up">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                  <div>
                    <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 19, color: T.textPrimary }}>Client Management</h2>
                    <p style={{ fontSize: 12.5, color: T.textMuted, marginTop: 3 }}>Overview of clients, proposals and payment reminders</p>
                  </div>
                  <button className="pri-btn" onClick={() => window.location.href = '/clients'} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", background: "linear-gradient(135deg, #4f46e5, #7c3aed)", color: "#fff", borderRadius: 10, fontSize: 13, fontWeight: 600 }}>
                    <Plus size={15} strokeWidth={2.5} /> Manage Clients
                  </button>
                </div>

                {/* KPI row */}
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 20 }}>
                  <KpiCard Icon={Building2}  label="Total Clients" value={clients.length} color="#16a34a" bgColor={T.greenBg} />
                  <KpiCard Icon={FileText}   label="Proposals"    value={proposals.length} color="#0891b2" bgColor="#ecfeff" />
                  <KpiCard Icon={DollarSign} label="Reminders"    value={reminders.length} color={T.brand} bgColor={T.brandLight} />
                  <KpiCard Icon={CheckCircle2} label="Active"     value={clients.filter(c => c.status === "active").length} color={T.yellow} bgColor={T.yellowBg} />
                </div>

                {/* Clients & Proposals Overview */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>
                  {/* Recent Clients */}
                  <ChartCard title="Recent Clients" subtitle={`${clients.length} total clients`}>
                    {clients.length === 0 ? (
                      <div style={{ textAlign: "center", padding: "40px 20px", color: T.textMuted, fontSize: 13 }}>No clients yet</div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {clients.slice(0, 5).map((client, i) => (
                          <div key={client._id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: i < 4 ? `1px solid ${T.borderLight}` : "none" }}>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 13, color: T.textPrimary }}>{client.clientName}</div>
                              <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>{client.email}</div>
                            </div>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 5, color: client.status === "active" ? T.green : T.slate, background: client.status === "active" ? T.greenBg : T.slateBg, border: `1px solid ${client.status === "active" ? "#bbf7d0" : "#e2e8f0"}` }}>
                              {client.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </ChartCard>

                  {/* Proposal Status */}
                  <ChartCard title="Proposal Status" subtitle={`${proposals.length} total proposals`}>
                    {proposals.length === 0 ? (
                      <div style={{ textAlign: "center", padding: "40px 20px", color: T.textMuted, fontSize: 13 }}>No proposals yet</div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {[("sent", T.brand), ("accepted", T.green), ("rejected", T.red), ("draft", T.slate)].map(([status, color]) => {
                          const count = proposals.filter(p => p.proposalStatus === status).length;
                          const percentage = proposals.length > 0 ? (count / proposals.length) * 100 : 0;
                          return count > 0 ? (
                            <div key={status} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <span style={{ minWidth: 60, fontSize: 12, fontWeight: 600, color: T.textSecondary, textTransform: "capitalize" }}>{status}</span>
                              <div style={{ flex: 1, height: 6, background: T.borderLight, borderRadius: 99, overflow: "hidden" }}>
                                <div style={{ height: "100%", width: `${percentage}%`, background: color, borderRadius: 99 }} />
                              </div>
                              <span style={{ fontSize: 12, fontWeight: 700, minWidth: 30, textAlign: "right", color }}>{count}</span>
                            </div>
                          ) : null;
                        })}
                      </div>
                    )}
                  </ChartCard>
                </div>

                {/* Quick Action */}
                <div style={{ background: T.brandLight, border: `1px solid ${T.brandMid}`, borderRadius: 16, padding: 24, textAlign: "center" }}>
                  <FileText size={32} color={T.brand} style={{ margin: "0 auto 12px", display: "block" }} />
                  <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: T.textPrimary, marginBottom: 8 }}>Manage All Client Operations</h3>
                  <p style={{ fontSize: 13, color: T.textSecondary, marginBottom: 16 }}>Create clients, send proposals, and manage payment reminders from the dedicated clients section.</p>
                  <button className="pri-btn" onClick={() => window.location.href = '/clients'} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 20px", background: T.brand, color: "#fff", borderRadius: 9, fontSize: 13, fontWeight: 600, transition: "all .2s", border: "none", cursor: "pointer" }}>
                    <Building2 size={14} strokeWidth={2.2} /> Go to Clients Dashboard
                  </button>
                </div>
              </div>
            )}

            {/* ══ ALL USERS ══════════════════════════════════════════════════ */}
            {tab === "users" && (
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
                            <IconBtn icon={Pencil} color="#4f46e5" bg="#eef2ff"  hoverBg="#c7d2fe" onClick={() => openEditUser(user)} title="Edit user" />
                            <IconBtn icon={Trash2} color={T.red}   bg={T.redBg} hoverBg={T.redBorder} onClick={() => setDeleteUser(user)} title="Delete user" />
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
                              {isAdmin ? "Admin" : "User"}
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
            )}

            {/* ══ SALARY ═════════════════════════════════════════════════════ */}
            {tab === "salary" && (
              <div className="fade-up">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                  <div>
                    <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 19, color: T.textPrimary }}>Salary Management</h2>
                    <p style={{ fontSize: 12.5, color: T.textMuted, marginTop: 3 }}>Send automated salary slips to employee email addresses.</p>
                  </div>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: T.brand, background: T.brandLight, border: `1px solid ${T.brandMid}`, borderRadius: 999, padding: "8px 12px" }}>
                    {users.filter(u => u.role === "user").length} employee{users.filter(u => u.role === "user").length !== 1 ? "s" : ""}
                  </div>
                </div>

                {users.filter(u => u.role === "user").length === 0 ? (
                  <div style={{ textAlign: "center", padding: "80px 0" }}>
                    <Briefcase size={48} strokeWidth={1} color={T.textMuted} style={{ margin: "0 auto 16px", display: "block" }} />
                    <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 17, color: T.textSecondary }}>No employees available</p>
                    <p style={{ fontSize: 13, color: T.textMuted, marginTop: 6 }}>Create a user account first to start sending salary slips.</p>
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
                    {users.filter(u => u.role === "user").map((user, i) => {
                      const initials = user.name ? user.name.trim().split(/\s+/).map(n => n[0]).join("").toUpperCase().slice(0, 2) : "??";

                      return (
                        <div key={user._id} className="card card-in" style={{ background: T.card, border: `1.5px solid ${T.border}`, borderRadius: 18, padding: "22px", animationDelay: `${i * 35}ms`, boxShadow: "0 1px 3px rgba(0,0,0,.04)" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: 18 }}>
                            <div style={{ width: 48, height: 48, borderRadius: "50%", flexShrink: 0, background: "linear-gradient(135deg, #0891b2, #06b6d4)", display: "grid", placeItems: "center", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, color: "#fff", boxShadow: "0 4px 14px rgba(8,145,178,.28)" }}>
                              {initials}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: 15, color: T.textPrimary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.name}</div>
                              <div style={{ fontSize: 12, color: T.textMuted, marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.email}</div>
                            </div>
                          </div>

                          <button className="pri-btn" onClick={() => openPaySalary(user)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 14px", borderRadius: 11, background: "linear-gradient(135deg, #0f766e, #0891b2)", color: "#fff", fontSize: 13.5, fontWeight: 700, fontFamily: "'Syne', sans-serif" }}>
                            <Briefcase size={15} strokeWidth={2} /> Pay Salary
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ══ CREATE TASK ════════════════════════════════════════════════ */}
            {tab === "createTask" && (
              <div className="fade-up" style={{ maxWidth: 620 }}>
                <div style={{ marginBottom: 26 }}>
                  <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 20, color: T.textPrimary }}>Create New Task</h2>
                  <p style={{ fontSize: 13, color: T.textMuted, marginTop: 4 }}>Fill in the details below to assign a new task</p>
                </div>
                <div style={{ background: T.card, border: `1.5px solid ${T.border}`, borderRadius: 18, padding: "30px", boxShadow: "0 2px 8px rgba(0,0,0,.05)" }}>
                  <form onSubmit={handleCreateTask}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                      <FormField label="Task Title" span2>
                        <div style={{ position: "relative" }}><FieldIcon icon={ClipboardList} /><input className="inp" style={baseInp} type="text" placeholder="Enter task title" value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} required /></div>
                      </FormField>
                      <FormField label="Assign To">
                        <div style={{ position: "relative" }}><FieldIcon icon={User} /><select className="inp" style={{ ...baseInp, appearance: "none" }} value={taskForm.assignedTo} onChange={e => setTaskForm({ ...taskForm, assignedTo: e.target.value })}><option value="">Select a user</option>{users.filter(u => u.role === "user").map(u => <option key={u._id} value={u._id}>{u.name}</option>)}</select></div>
                      </FormField>
                      <FormField label="Due Date">
                        <div style={{ position: "relative" }}><FieldIcon icon={Calendar} /><input className="inp" style={baseInp} type="date" value={taskForm.dueDate} onChange={e => setTaskForm({ ...taskForm, dueDate: e.target.value })} /></div>
                      </FormField>
                      <FormField label="Priority" span2>
                        <div style={{ position: "relative" }}><FieldIcon icon={AlertCircle} /><select className="inp" style={{ ...baseInp, appearance: "none" }} value={taskForm.priority} onChange={e => setTaskForm({ ...taskForm, priority: e.target.value })}><option value="low">Low Priority</option><option value="medium">Medium Priority</option><option value="high">High Priority</option></select></div>
                      </FormField>
                      <FormField label="Description" span2>
                        <textarea className="inp" style={{ ...baseInpNoIcon, minHeight: 96 }} placeholder="Optional task description…" value={taskForm.description} onChange={e => setTaskForm({ ...taskForm, description: e.target.value })} />
                      </FormField>
                    </div>
                    <button className="pri-btn" type="submit" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", background: "linear-gradient(135deg, #4f46e5, #7c3aed)", color: "#fff", borderRadius: 11, padding: "13px", fontSize: 14, fontWeight: 700, fontFamily: "'Syne', sans-serif", letterSpacing: ".03em" }}>
                      <Plus size={16} strokeWidth={2.5} /> Create Task
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* ══ CREATE USER ════════════════════════════════════════════════ */}
            {tab === "createUser" && (
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
                        <div style={{ position: "relative" }}><FieldIcon icon={Shield} /><select className="inp" style={{ ...baseInp, appearance: "none" }} value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value })}><option value="user">User</option><option value="admin">Admin</option></select></div>
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
                    <button className="pri-btn" type="submit" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", background: "linear-gradient(135deg, #0891b2, #4f46e5)", color: "#fff", borderRadius: 11, padding: "13px", fontSize: 14, fontWeight: 700, fontFamily: "'Syne', sans-serif", letterSpacing: ".03em" }}>
                      <UserPlus size={16} strokeWidth={2} /> Create User
                    </button>
                  </form>
                </div>
              </div>
            )}

          </main>
        </div>

        {/* ── TOAST ─────────────────────────────────────────────────────────── */}
        {toast && (
          <div style={{ position: "fixed", bottom: 26, right: 26, zIndex: 9999, background: "#fff", border: `1.5px solid ${toast.ok ? T.greenBorder : T.redBorder}`, borderRadius: 13, padding: "14px 18px", fontWeight: 500, fontSize: 13.5, animation: "toastIn .26s cubic-bezier(.22,1,.36,1) both", display: "flex", alignItems: "center", gap: 11, boxShadow: "0 8px 32px rgba(0,0,0,.12)", maxWidth: 340 }}>
            {toast.ok ? <CheckCircle2 size={17} strokeWidth={2} color={T.green} /> : <AlertCircle size={17} strokeWidth={2} color={T.red} />}
            <span style={{ flex: 1, color: T.textPrimary }}>{toast.msg}</span>
            <button onClick={() => setToast(null)} style={{ background: "none", border: "none", cursor: "pointer", color: T.textMuted, display: "flex", padding: 0 }}><X size={14} strokeWidth={2} /></button>
          </div>
        )}

        {/* ── EDIT TASK MODAL ─────────────────────────────────────────────── */}
        {editTask && (
          <Modal title="Edit Task" onClose={() => setEditTask(null)}>
            <form onSubmit={handleUpdateTask}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                <FormField label="Task Title" span2><div style={{ position: "relative" }}><FieldIcon icon={ClipboardList} /><input className="inp" style={baseInp} type="text" placeholder="Task title" value={editTaskForm.title} onChange={e => setEditTaskForm({ ...editTaskForm, title: e.target.value })} required /></div></FormField>
                <FormField label="Assign To"><div style={{ position: "relative" }}><FieldIcon icon={User} /><select className="inp" style={{ ...baseInp, appearance: "none" }} value={editTaskForm.assignedTo} onChange={e => setEditTaskForm({ ...editTaskForm, assignedTo: e.target.value })}><option value="">Unassigned</option>{users.filter(u => u.role === "user").map(u => <option key={u._id} value={u._id}>{u.name}</option>)}</select></div></FormField>
                <FormField label="Due Date"><div style={{ position: "relative" }}><FieldIcon icon={Calendar} /><input className="inp" style={baseInp} type="date" value={editTaskForm.dueDate} onChange={e => setEditTaskForm({ ...editTaskForm, dueDate: e.target.value })} /></div></FormField>
                <FormField label="Priority"><div style={{ position: "relative" }}><FieldIcon icon={AlertCircle} /><select className="inp" style={{ ...baseInp, appearance: "none" }} value={editTaskForm.priority} onChange={e => setEditTaskForm({ ...editTaskForm, priority: e.target.value })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></div></FormField>
                <FormField label="Status" span2><div style={{ position: "relative" }}><FieldIcon icon={Activity} /><select className="inp" style={{ ...baseInp, appearance: "none" }} value={editTaskForm.status} onChange={e => setEditTaskForm({ ...editTaskForm, status: e.target.value })}><option value="pending">Pending</option><option value="in-progress">In Progress</option><option value="completed">Completed</option></select></div></FormField>
                <FormField label="Description" span2><textarea className="inp" style={{ ...baseInpNoIcon, minHeight: 80 }} placeholder="Optional description…" value={editTaskForm.description} onChange={e => setEditTaskForm({ ...editTaskForm, description: e.target.value })} /></FormField>
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setEditTask(null)} style={{ padding: "9px 18px", borderRadius: 9, border: `1.5px solid ${T.border}`, background: "#fff", color: T.textSecondary, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
                <button className="pri-btn" type="submit" style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 20px", background: "linear-gradient(135deg, #4f46e5, #7c3aed)", color: "#fff", borderRadius: 9, fontSize: 13, fontWeight: 700, fontFamily: "'Syne', sans-serif" }}>
                  <Save size={14} strokeWidth={2} /> Save Changes
                </button>
              </div>
            </form>
          </Modal>
        )}

        {/* ── EDIT USER MODAL ─────────────────────────────────────────────── */}
        {editUser && (
          <Modal title="Edit User" onClose={() => setEditUser(null)}>
            <form onSubmit={handleUpdateUser}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                <FormField label="Full Name"><div style={{ position: "relative" }}><FieldIcon icon={User} /><input className="inp" style={baseInp} type="text" placeholder="Full name" value={editUserForm.name} onChange={e => setEditUserForm({ ...editUserForm, name: e.target.value })} required /></div></FormField>
                <FormField label="Role"><div style={{ position: "relative" }}><FieldIcon icon={Shield} /><select className="inp" style={{ ...baseInp, appearance: "none" }} value={editUserForm.role} onChange={e => setEditUserForm({ ...editUserForm, role: e.target.value })}><option value="user">User</option><option value="admin">Admin</option></select></div></FormField>
                <FormField label="Email Address" span2><div style={{ position: "relative" }}><FieldIcon icon={Mail} /><input className="inp" style={baseInp} type="email" placeholder="Email" value={editUserForm.email} onChange={e => setEditUserForm({ ...editUserForm, email: e.target.value })} required /></div></FormField>
                <FormField label="New Password (optional)" span2>
                  <div style={{ position: "relative" }}>
                    <FieldIcon icon={Lock} />
                    <input className="inp" style={baseInp} type={showEditPw ? "text" : "password"} placeholder="Leave blank to keep current" value={editUserForm.password} onChange={e => setEditUserForm({ ...editUserForm, password: e.target.value })} />
                    <button type="button" onClick={() => setShowEditPw(p => !p)} style={{ position: "absolute", right: 13, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: T.textMuted, display: "flex", padding: 0 }}>
                      {showEditPw ? <EyeOff size={15} strokeWidth={1.8} /> : <Eye size={15} strokeWidth={1.8} />}
                    </button>
                  </div>
                </FormField>
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setEditUser(null)} style={{ padding: "9px 18px", borderRadius: 9, border: `1.5px solid ${T.border}`, background: "#fff", color: T.textSecondary, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
                <button className="pri-btn" type="submit" style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 20px", background: "linear-gradient(135deg, #0891b2, #4f46e5)", color: "#fff", borderRadius: 9, fontSize: 13, fontWeight: 700, fontFamily: "'Syne', sans-serif" }}>
                  <Save size={14} strokeWidth={2} /> Save Changes
                </button>
              </div>
            </form>
          </Modal>
        )}

        {/* ── PAY SALARY MODAL ───────────────────────────────────────────── */}
        {payUser && (
          <Modal title={`Pay Salary • ${payUser.name}`} onClose={() => !payingSalary && setPayUser(null)} width={640}>
            <form onSubmit={handlePaySalary}>
              <div style={{ marginBottom: 18, padding: "14px 16px", borderRadius: 12, background: T.brandLight, border: `1px solid ${T.brandMid}` }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.brand }}>Salary slip will be emailed to</div>
                <div style={{ fontSize: 14, color: T.textPrimary, marginTop: 5 }}>{payUser.email}</div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 18 }}>
                <FormField label="Salary Month">
                  <div style={{ position: "relative" }}><FieldIcon icon={Calendar} /><input className="inp" style={baseInp} type="month" value={salaryForm.salaryMonth} onChange={e => setSalaryForm({ ...salaryForm, salaryMonth: e.target.value })} required /></div>
                </FormField>
                <FormField label="Basic Salary">
                  <div style={{ position: "relative" }}><FieldIcon icon={Briefcase} /><input className="inp" style={baseInp} type="number" min="0" step="0.01" placeholder="50000" value={salaryForm.basicSalary} onChange={e => setSalaryForm({ ...salaryForm, basicSalary: e.target.value })} required /></div>
                </FormField>
                <FormField label="Home Allowance">
                  <div style={{ position: "relative" }}><FieldIcon icon={Briefcase} /><input className="inp" style={baseInp} type="number" min="0" step="0.01" placeholder="5000" value={salaryForm.homeAllowance} onChange={e => setSalaryForm({ ...salaryForm, homeAllowance: e.target.value })} /></div>
                </FormField>
                <FormField label="Travel Allowance">
                  <div style={{ position: "relative" }}><FieldIcon icon={Briefcase} /><input className="inp" style={baseInp} type="number" min="0" step="0.01" placeholder="3000" value={salaryForm.travelAllowance} onChange={e => setSalaryForm({ ...salaryForm, travelAllowance: e.target.value })} /></div>
                </FormField>
                <FormField label="Other Allowance">
                  <div style={{ position: "relative" }}><FieldIcon icon={Briefcase} /><input className="inp" style={baseInp} type="number" min="0" step="0.01" placeholder="2000" value={salaryForm.otherAllowance} onChange={e => setSalaryForm({ ...salaryForm, otherAllowance: e.target.value })} /></div>
                </FormField>
                <FormField label="Leaves">
                  <div style={{ position: "relative" }}><FieldIcon icon={Calendar} /><input className="inp" style={baseInp} type="number" min="0" step="1" placeholder="0" value={salaryForm.leaves} onChange={e => setSalaryForm({ ...salaryForm, leaves: e.target.value })} /></div>
                </FormField>
                <FormField label="PF">
                  <div style={{ position: "relative" }}><FieldIcon icon={Briefcase} /><input className="inp" style={baseInp} type="number" min="0" step="0.01" placeholder="1800" value={salaryForm.pf} onChange={e => setSalaryForm({ ...salaryForm, pf: e.target.value })} /></div>
                </FormField>
                <FormField label="Other Deductions">
                  <div style={{ position: "relative" }}><FieldIcon icon={Briefcase} /><input className="inp" style={baseInp} type="number" min="0" step="0.01" placeholder="500" value={salaryForm.deductions} onChange={e => setSalaryForm({ ...salaryForm, deductions: e.target.value })} /></div>
                </FormField>
                <FormField label="Auto Calculated In Hand" span2>
                  <div style={{ position: "relative" }}><FieldIcon icon={Briefcase} /><input className="inp" style={{ ...baseInp, background: "#eef2ff", color: T.brand, fontWeight: 700 }} type="text" value={fmtCurrency(salaryPreview.inHand)} readOnly /></div>
                </FormField>
              </div>

              <div style={{ marginBottom: 12, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                <div style={{ background: "#fff7ed", border: "1px solid #fdba74", borderRadius: 12, padding: "14px 16px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#c2410c", textTransform: "uppercase", letterSpacing: ".08em" }}>Leave Cut</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#c2410c", marginTop: 8, fontFamily: "'Syne', sans-serif" }}>
                    {fmtCurrency(salaryPreview.leaveDeduction)}
                  </div>
                </div>
                <div style={{ background: T.greenBg, border: `1px solid ${T.greenBorder}`, borderRadius: 12, padding: "14px 16px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.green, textTransform: "uppercase", letterSpacing: ".08em" }}>Allowances</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: T.green, marginTop: 8, fontFamily: "'Syne', sans-serif" }}>
                    {fmtCurrency(salaryPreview.totalAllowances)}
                  </div>
                </div>
                <div style={{ background: T.redBg, border: `1px solid ${T.redBorder}`, borderRadius: 12, padding: "14px 16px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.red, textTransform: "uppercase", letterSpacing: ".08em" }}>Deductions</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: T.red, marginTop: 8, fontFamily: "'Syne', sans-serif" }}>
                    {fmtCurrency(salaryPreview.totalDeductions)}
                  </div>
                </div>
                <div style={{ background: T.brandLight, border: `1px solid ${T.brandMid}`, borderRadius: 12, padding: "14px 16px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.brand, textTransform: "uppercase", letterSpacing: ".08em" }}>In Hand</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: T.brand, marginTop: 8, fontFamily: "'Syne', sans-serif" }}>
                    {fmtCurrency(salaryPreview.inHand)}
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 18, padding: "12px 14px", borderRadius: 12, background: "#fff", border: `1px solid ${T.borderLight}`, fontSize: 12.5, color: T.textSecondary, lineHeight: 1.65 }}>
                Final salary is auto-calculated using the selected month. Leave deduction = basic salary / {salaryPreview.daysInMonth} days × {salaryPreview.leaves} leave{salaryPreview.leaves !== 1 ? "s" : ""}.
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setPayUser(null)} disabled={payingSalary} style={{ padding: "9px 18px", borderRadius: 9, border: `1.5px solid ${T.border}`, background: "#fff", color: T.textSecondary, fontSize: 13, fontWeight: 600, cursor: payingSalary ? "default" : "pointer", fontFamily: "inherit", opacity: payingSalary ? 0.7 : 1 }}>Cancel</button>
                <button className="pri-btn" type="submit" disabled={payingSalary} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 20px", background: "linear-gradient(135deg, #0f766e, #0891b2)", color: "#fff", borderRadius: 9, fontSize: 13, fontWeight: 700, fontFamily: "'Syne', sans-serif", opacity: payingSalary ? 0.8 : 1 }}>
                  <Save size={14} strokeWidth={2} /> {payingSalary ? "Sending..." : "Pay & Send Slip"}
                </button>
              </div>
            </form>
          </Modal>
        )}

        {/* ── DELETE CONFIRMS ──────────────────────────────────────────────── */}
        {deleteTask && <ConfirmModal title="Delete Task" message={`Are you sure you want to delete "${deleteTask.title}"? This action cannot be undone.`} onConfirm={handleDeleteTask} onClose={() => setDeleteTask(null)} />}
        {deleteUser && <ConfirmModal title="Delete User" message={`Are you sure you want to delete the account for "${deleteUser.name}"? All their task assignments may be affected.`} onConfirm={handleDeleteUser} onClose={() => setDeleteUser(null)} />}

      </div>
    </>
  );
}
