import React, { useEffect, useState } from "react";
import API from "../services/api";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard, ClipboardList, LogOut, CheckCircle2,
  Clock, TrendingUp, Calendar, User, Shield, X,
  AlertCircle, CheckCheck, ListTodo, ChevronDown,
  CalendarDays, XCircle, Hourglass, FileText, Send,
  Briefcase,
} from "lucide-react";
import logo from "../assets/logo.png";
import { getAllClients, getWorkProgress } from "../services/clientApi";
import ClientTaskDetail from "../components/ClientTaskDetail";
import {
  PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { resolveDeliverableVisual } from "../config/serviceVisuals";
import { formatDeliverableAmount } from "../config/deliverableUnits";

// ─── shared theme (identical to AdminDashboard) ───────────────────────────────
const T = {
  bg:          "#f5f6fa",
  sidebar:     "#ffffff",
  card:        "#ffffff",
  header:      "rgba(255,255,255,0.92)",
  border:      "#e8eaf0",
  borderLight: "#f0f1f6",
  textPrimary:   "#0f172a",
  textSecondary: "#64748b",
  textMuted:     "#94a3b8",
  brand:         "#f7931e",
  brandLight:    "#fff4e6",
  brandMid:      "#fed7aa",
  inputBg:       "#f8f9fc",
  inputBorder:   "#e2e6ef",
  green:  "#16a34a",  greenBg:  "#f0fdf4",  greenBorder: "#bbf7d0",
  yellow: "#d97706",  yellowBg: "#fffbeb",  yellowBorder:"#fde68a",
  red:    "#dc2626",  redBg:    "#fef2f2",  redBorder:   "#fecaca",
  slate:  "#64748b",  slateBg:  "#f8fafc",  slateBorder: "#e2e8f0",
};

// The sidebar is a dark panel against an otherwise light dashboard (matches
// AdminDashboard), so it needs its own text/border/hover tokens rather than
// reusing the light-tuned T above. T.brand (orange) still pops fine on dark.
const SB = {
  bg: "#161a24",
  border: "rgba(255,255,255,0.07)",
  text: "#ffffff",
  muted: "#7b8496",
  hoverBg: "rgba(247,147,30,0.12)",
  activeBg: "rgba(247,147,30,0.16)",
};

// Each nav item's accent color is tuned for a light background; on the dark
// sidebar it reads as dim. Blending it partway toward white keeps the same
// hue but lifts it enough to pop.
function brighten(hex, amount = 0.35) {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = Math.round(((n >> 16) & 255) + (255 - ((n >> 16) & 255)) * amount);
  const g = Math.round(((n >> 8) & 255) + (255 - ((n >> 8) & 255)) * amount);
  const b = Math.round((n & 255) + (255 - (n & 255)) * amount);
  return `rgb(${r}, ${g}, ${b})`;
}

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

// Maps a Client's latest Work Progress status onto the same 3-bucket model used by
// plain Tasks (pending/in-progress/completed), so assigned client work counts toward
// the same Total/Done/Active/Pending stats shown across the dashboard.
const mapProgressToTaskStatus = (progressStatus) => {
  if (progressStatus === "Completed") return "completed";
  if (progressStatus === "In Progress") return "in-progress";
  return "pending"; // covers Pending / On Hold / Waiting for Client / no progress yet
};

const LEAVE_STATUS = {
  pending:  { label: "Pending",  color: T.yellow, bg: T.yellowBg, border: T.yellowBorder, Icon: Hourglass    },
  approved: { label: "Approved", color: T.green,  bg: T.greenBg,  border: T.greenBorder,  Icon: CheckCircle2 },
  rejected: { label: "Rejected", color: T.red,    bg: T.redBg,    border: T.redBorder,    Icon: XCircle      },
};

const PIE_COLORS = ["#16a34a", "#d97706", "#64748b"];
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
      minWidth: 0, borderRadius: 18, padding: "18px 18px 20px",
      background: bgColor, border: "none",
      boxShadow: "0 1px 2px rgba(0,0,0,.02)",
    }}>
      <div style={{ width: 44, height: 44, borderRadius: 13, flexShrink: 0, background: `${color}26`, display: "grid", placeItems: "center", marginBottom: 14 }}>
        <Icon size={19} color={color} strokeWidth={2} />
      </div>
      <div style={{ fontSize: 12.5, fontWeight: 600, color, marginBottom: 5, whiteSpace: "nowrap" }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: T.textPrimary, lineHeight: 1.1, fontFamily: "'Inter', sans-serif", whiteSpace: "nowrap" }}>{value}</div>
      {sub && <div style={{ fontSize: 10.5, color, marginTop: 5, fontWeight: 600 }}>{sub}</div>}
    </div>
  );
}

// ─── ChartCard ────────────────────────────────────────────────────────────────
function ChartCard({ title, subtitle, children, style = {} }) {
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,.04)", ...style }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: T.textPrimary }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: T.textMuted, marginTop: 3 }}>{subtitle}</div>}
      </div>
      {children}
    </div>
  );
}

// ─── CustomTooltip ────────────────────────────────────────────────────────────
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

// ─── DeliverableProgressRow ────────────────────────────────────────────────────
// Lets the assignee record how much of a contract-generated deliverable they've
// completed so far — updates persist to the same Task document the admin sees,
// so progress made here shows up on the admin's Tasks page immediately.
function DeliverableProgressRow({ taskId, d, busy, onUpdate }) {
  const delivered = d.delivered || 0;
  const quantity = d.quantity || 0;
  const pct = quantity ? Math.min(100, Math.round((delivered / quantity) * 100)) : 0;
  const stepBtn = (disabled) => ({
    width: 26, height: 26, borderRadius: 7, border: `1.5px solid ${T.border}`,
    background: "#fff", color: T.textSecondary, fontSize: 14, fontWeight: 700,
    display: "grid", placeItems: "center", cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.4 : 1, fontFamily: "inherit",
  });

  const visual = resolveDeliverableVisual(d.title, d.categoryId);
  const VisualIcon = visual.Icon;
  const isGradient = visual.bg.startsWith("linear");

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px", background: T.inputBg, borderRadius: 9 }}>
      <div style={{ width: 28, height: 28, borderRadius: "50%", background: visual.bg, display: "grid", placeItems: "center", flexShrink: 0 }}>
        <VisualIcon size={13} color="#fff" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: T.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.title}</div>
        <div style={{ fontSize: 10.5, color: T.textMuted, marginTop: 2 }}>
          {formatDeliverableAmount(d)}
        </div>
        <div style={{ height: 5, background: "#e8eaf0", borderRadius: 99, marginTop: 6, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: isGradient ? T.brand : visual.bg, borderRadius: 99, transition: "width .2s" }} />
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 7, flexShrink: 0 }}>
        <button disabled={busy || delivered <= 0} onClick={() => onUpdate(taskId, d._id, Math.max(0, delivered - 1))} style={stepBtn(busy || delivered <= 0)}>−</button>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: T.textPrimary, minWidth: 42, textAlign: "center" }}>{busy ? "…" : `${delivered}/${quantity}`}</span>
        <button disabled={busy || delivered >= quantity} onClick={() => onUpdate(taskId, d._id, Math.min(quantity, delivered + 1))} style={stepBtn(busy || delivered >= quantity)}>+</button>
      </div>
    </div>
  );
}

// ─── StatusSelect ─────────────────────────────────────────────────────────────
function StatusSelect({ value, onChange }) {
  const s = STATUS[value] || STATUS.pending;
  return (
    <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <s.Icon size={13} color={s.color} strokeWidth={2} style={{ position: "absolute", left: 10, pointerEvents: "none", zIndex: 1 }} />
      <ChevronDown size={13} color={T.textMuted} strokeWidth={2} style={{ position: "absolute", right: 9, pointerEvents: "none", zIndex: 1 }} />
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          appearance: "none", cursor: "pointer",
          padding: "7px 32px 7px 30px",
          fontSize: 12, fontWeight: 600, borderRadius: 8,
          color: s.color, background: s.bg,
          border: `1.5px solid ${s.border}`,
          fontFamily: "inherit", outline: "none",
          transition: "border-color .18s, box-shadow .18s",
        }}
      >
        <option value="pending">Pending</option>
        <option value="in-progress">In Progress</option>
        <option value="completed">Completed</option>
      </select>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function UserDashboard() {
  const navigate = useNavigate();
  const [tasks, setTasks]   = useState([]);
  const [salarySlips, setSalarySlips] = useState([]);
  const [tab, setTab]       = useState("dashboard");
  const [toast, setToast]   = useState(null);
  const [updating, setUpdating] = useState(null); // taskId being updated
  const [updatingDeliverable, setUpdatingDeliverable] = useState(null); // deliverableId being updated
  const [leaves, setLeaves] = useState([]);
  const [leaveForm, setLeaveForm] = useState({ fromDate: "", toDate: "", reason: "" });
  const [submittingLeave, setSubmittingLeave] = useState(false);
  const [assignedClients, setAssignedClients] = useState([]);
  const [openClientTaskId, setOpenClientTaskId] = useState(null);

  // pull name from localStorage (set at login)
  const userName = localStorage.getItem("userName") || "User";
  const userInitials = userName.trim().split(/\s+/).map(n => n[0]).join("").toUpperCase().slice(0, 2);

  const showToast = (msg, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3500); };

  const fetchTasks = async () => {
    try { const { data } = await API.get("/tasks/my-tasks"); setTasks(data); }
    catch { showToast("Failed to fetch tasks", false); }
  };

  const fetchSalarySlips = async () => {
    try { const { data } = await API.get("/salary/my-slips"); setSalarySlips(data); }
    catch { showToast("Failed to fetch salary slips", false); }
  };

  const fetchLeaves = async () => {
    try { const { data } = await API.get("/leaves/my"); setLeaves(Array.isArray(data) ? data : []); }
    catch { showToast("Failed to fetch leave requests", false); }
  };

  // Clients assigned to this user via the admin's "Assign Task" action on the Client
  // Detail page — the backend already scopes /clients to assignedUser === me for role "user".
  const fetchAssignedClients = async () => {
    try {
      const { data } = await getAllClients();
      const clients = data.clients || [];
      const withStatus = await Promise.all(
        clients.map(async (c) => {
          try {
            const progRes = await getWorkProgress(c._id);
            const latest = progRes.data?.workProgress?.[0];
            return { ...c, _taskStatus: mapProgressToTaskStatus(latest?.status) };
          } catch {
            return { ...c, _taskStatus: "pending" };
          }
        })
      );
      setAssignedClients(withStatus);
    } catch {
      setAssignedClients([]);
    }
  };

  useEffect(() => { fetchTasks(); fetchSalarySlips(); fetchLeaves(); fetchAssignedClients(); }, []);

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    setSubmittingLeave(true);
    try {
      await API.post("/leaves", leaveForm);
      showToast("Leave request submitted");
      setLeaveForm({ fromDate: "", toDate: "", reason: "" });
      fetchLeaves();
    } catch (error) {
      showToast(error?.response?.data?.message || "Failed to submit leave request", false);
    } finally {
      setSubmittingLeave(false);
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    setUpdating(taskId);
    try {
await API.patch(
  `/tasks/update-status/${taskId}`,
  { status: newStatus },
  {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`
    }
  }
);      setTasks(prev => prev.map(t => t._id === taskId ? { ...t, status: newStatus } : t));
      showToast("Status updated");
    } catch {
      showToast("Failed to update status", false);
    } finally {
      setUpdating(null);
    }
  };

  const handleDeliverableUpdate = async (taskId, deliverableId, delivered) => {
    setUpdatingDeliverable(deliverableId);
    try {
      const { data } = await API.patch(`/tasks/${taskId}/deliverables/${deliverableId}`, { delivered });
      // The PATCH response's task.clientId/contractId are raw (unpopulated)
      // ObjectIds — merge in just the updated deliverables array so the
      // already-populated client/contract name in local state survives.
      setTasks(prev => prev.map(t => t._id === taskId ? { ...t, deliverables: data.task.deliverables } : t));
      showToast("Progress updated");
    } catch {
      showToast("Failed to update progress", false);
    } finally {
      setUpdatingDeliverable(null);
    }
  };

  const handleLogout = async () => {
    try {
      await API.post("/users/logout");
    } catch {}
    localStorage.clear();
    navigate("/");
  };

  // ── derived stats ──────────────────────────────────────────────────────────
  // "Total" spans both plain admin-created Tasks and clients assigned via the
  // Client Detail page's "Assign Task" action — both are real work assigned to
  // this user, so both must count toward Total/Done/Active/Pending everywhere.
  const total  = tasks.length + assignedClients.length;
  const done   = tasks.filter(t => t.status === "completed").length
    + assignedClients.filter(c => c._taskStatus === "completed").length;
  const inProg = tasks.filter(t => t.status === "in-progress").length
    + assignedClients.filter(c => c._taskStatus === "in-progress").length;
  const pend   = tasks.filter(t => !t.status || t.status === "pending").length
    + assignedClients.filter(c => c._taskStatus === "pending").length;
  const completionRate = total ? Math.round((done / total) * 100) : 0;

  const overdue = tasks.filter(t => {
    if (!t.dueDate || t.status === "completed") return false;
    return new Date(t.dueDate) < new Date();
  }).length;

  // ── chart data ─────────────────────────────────────────────────────────────
  const statusPieData = [
    { name: "Completed",   value: done   },
    { name: "In Progress", value: inProg },
    { name: "Pending",     value: pend   },
  ].filter(d => d.value > 0);

  const priorityBarData = [
    { name: "Low",    count: tasks.filter(t => t.priority === "low").length,    fill: T.green  },
    { name: "Medium", count: tasks.filter(t => t.priority === "medium").length, fill: T.yellow },
    { name: "High",   count: tasks.filter(t => t.priority === "high").length,   fill: T.red    },
  ];

  const TABS = [
    { id: "dashboard", label: "Dashboard",   Icon: LayoutDashboard },
    { id: "tasks",     label: "My Tasks",    Icon: ClipboardList   },
    { id: "leave",     label: "Apply Leave", Icon: CalendarDays    },
    { id: "salary",    label: "Salary",      Icon: Shield          },
  ];

  const currentLabel = TABS.find(t => t.id === tab)?.label || "Dashboard";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@500;600;700;800&family=Inter:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: ${T.bg}; min-height: 100vh; }
        select option { background: #fff; color: ${T.textPrimary}; }

        .task-card { transition: border-color .2s, box-shadow .2s, transform .2s; }
        .task-card:hover {
          border-color: ${T.brandMid} !important;
          box-shadow: 0 4px 24px rgba(247, 147, 30,.08) !important;
          transform: translateY(-1px);
        }

        .sidebar-nav { scrollbar-width: none; -ms-overflow-style: none; }
        .sidebar-nav::-webkit-scrollbar { display: none; }
        .nav-btn { border: none; cursor: pointer; font-family: inherit; background: transparent; transition: all .16s; }
        .nav-btn:hover:not(.nav-active) { background: ${SB.hoverBg} !important; color: ${T.brand} !important; }

        .logout-btn { transition: background .16s, color .16s; cursor: pointer; border: none; font-family: inherit; }
        .logout-btn:hover { background: rgba(220,38,38,0.15) !important; color: #f87171 !important; }

        .status-select:focus { border-color: ${T.brand}; box-shadow: 0 0 0 3px rgba(247, 147, 30,.1); outline: none; }

        @keyframes fadeUp  { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes cardIn  { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes toastIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }

        .fade-up { animation: fadeUp .32s cubic-bezier(.22,1,.36,1) both; }
        .card-in  { animation: cardIn  .36s cubic-bezier(.22,1,.36,1) both; }

        .recharts-cartesian-axis-tick text { font-family: 'Inter', sans-serif; font-size: 12px; fill: ${T.textMuted}; }
        .recharts-legend-item-text { font-family: 'Inter', sans-serif !important; font-size: 12px !important; color: ${T.textSecondary} !important; }
      `}</style>

      <div style={{ minHeight: "100vh", background: T.bg, fontFamily: "'Inter', sans-serif", color: T.textSecondary }}>

        {/* ── SIDEBAR ─────────────────────────────────────────────────────── */}
        <aside style={{
          position: "fixed", left: 0, top: 0, bottom: 0, width: 238,
          background: SB.bg, borderRight: `1px solid ${SB.border}`,
          display: "flex", flexDirection: "column", zIndex: 100,
          boxShadow: "2px 0 16px rgba(0,0,0,.18)",
        }}>
          {/* brand */}
          <div style={{ padding: "24px 22px 22px", borderBottom: `1px solid ${SB.border}` }}>
            <img src={logo} alt="Bharat Bizmart" style={{ height: 34, width: "auto", display: "block" }} />
            <div style={{ fontSize: 10, color: SB.muted, letterSpacing: ".1em", marginTop: 9, textTransform: "uppercase", fontWeight: 600 }}>Task Portal</div>
          </div>

          {/* nav */}
          <nav className="sidebar-nav" style={{ flex: "1 1 0%", minHeight: 0, overflowY: "auto", padding: "18px 12px", display: "flex", flexDirection: "column", gap: 2 }}>
            <div style={{ fontSize: 10, color: SB.muted, letterSpacing: ".14em", textTransform: "uppercase", fontWeight: 700, padding: "4px 12px 10px" }}>
              NAVIGATION
            </div>
            {TABS.map(({ id, label, Icon }) => {
              const active = tab === id;
              return (
                <button key={id} className={`nav-btn${active ? " nav-active" : ""}`} onClick={() => setTab(id)} style={{
                  display: "flex", alignItems: "center", gap: 10, width: "100%",
                  padding: "10px 12px", borderRadius: 9, textAlign: "left",
                  color: active ? T.brand : SB.text,
                  background: active ? SB.activeBg : "transparent",
                  fontWeight: active ? 600 : 400, fontSize: 13.5,
                  borderLeft: `3px solid ${active ? T.brand : "transparent"}`,
                }}>
                  <Icon size={16} strokeWidth={active ? 2.4 : 2} color={active ? brighten(T.brand) : brighten("#94a3b8")} />
                  {label}
                  {active && <div style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: "50%", background: T.brand, flexShrink: 0 }} />}
                </button>
              );
            })}

            {/* quick stats in sidebar */}
            <div style={{ marginTop: 24, padding: "0 4px" }}>
              <div style={{ fontSize: 10, color: SB.muted, letterSpacing: ".14em", textTransform: "uppercase", fontWeight: 700, padding: "4px 8px 12px" }}>QUICK STATS</div>
              {[
                { label: "Total Tasks",  value: total,  color: brighten(T.brand)  },
                { label: "Completed",    value: done,   color: brighten(T.green)  },
                { label: "In Progress",  value: inProg, color: brighten(T.yellow) },
                { label: "Pending",      value: pend,   color: SB.text  },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 8px", borderRadius: 8 }}>
                  <span style={{ fontSize: 13, color: SB.text }}>{label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color }}>{value}</span>
                </div>
              ))}
              {/* progress bar */}
              <div style={{ margin: "14px 8px 0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 11, color: SB.muted }}>
                  <span>Completion</span>
                  <span style={{ fontWeight: 700, color: brighten(T.green) }}>{completionRate}%</span>
                </div>
                <div style={{ height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 99, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${completionRate}%`, borderRadius: 99, background: "linear-gradient(90deg, #f7931e, #16a34a)", transition: "width .6s cubic-bezier(.22,1,.36,1)" }} />
                </div>
              </div>
            </div>
          </nav>

          {/* logout */}
          <div style={{ padding: "14px 12px", borderTop: `1px solid ${SB.border}` }}>
            <button className="logout-btn" onClick={handleLogout} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 12px", borderRadius: 9, color: SB.text, background: "transparent", fontSize: 13.5, fontWeight: 500 }}>
              <LogOut size={15} strokeWidth={1.8} /> Sign Out
            </button>
          </div>
        </aside>

        {/* ── CONTENT ─────────────────────────────────────────────────────── */}
        <div style={{ marginLeft: 238, minHeight: "100vh", display: "flex", flexDirection: "column" }}>

          {/* topbar */}
          <header style={{ position: "sticky", top: 0, zIndex: 50, height: 64, padding: "0 36px", display: "flex", alignItems: "center", justifyContent: "space-between", background: T.header, borderBottom: `1px solid ${T.border}`, backdropFilter: "blur(16px)", boxShadow: "0 1px 0 0 #e8eaf0" }}>
            <div>
              <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 17, color: T.textPrimary, lineHeight: 1 }}>{currentLabel}</h1>
              <p style={{ fontSize: 11.5, color: T.textMuted, marginTop: 3 }}>
                {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
              </p>
            </div>

            {/* user avatar */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #f7931e, #e8590c)", display: "grid", placeItems: "center", boxShadow: "0 2px 10px rgba(245,158,11,.3)", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13, color: "#fff" }}>
                {userInitials}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.textPrimary, lineHeight: 1 }}>{userName}</div>
                <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>Team Member</div>
              </div>
            </div>
          </header>

          <main style={{ padding: "30px 36px 64px", flex: 1 }}>

            {/* ══ DASHBOARD ══════════════════════════════════════════════════ */}
            {tab === "dashboard" && (
              <div className="fade-up">

                {/* KPI row */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14, marginBottom: 26 }}>
                  <KpiCard Icon={ListTodo}   label="Total Tasks"  value={total}  color="#f7931e" bgColor="#fff4e6" />
                  <KpiCard Icon={CheckCheck} label="Completed"    value={done}   color={T.green}  bgColor={T.greenBg}  sub={`${completionRate}% rate`} />
                  <KpiCard Icon={TrendingUp} label="In Progress"  value={inProg} color={T.yellow} bgColor={T.yellowBg} />
                  <KpiCard Icon={Clock}      label="Pending"      value={pend}   color={T.slate}  bgColor={T.slateBg}  />
                  <KpiCard Icon={AlertCircle} label="Overdue"     value={overdue} color={T.red}   bgColor={T.redBg}    sub={overdue ? "Needs attention" : "All on track"} />
                </div>

                {/* charts row */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>

                  {/* Status Pie */}
                  <ChartCard title="Task Status Breakdown" subtitle="Your tasks by current status">
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

                  {/* Priority Bar */}
                  <ChartCard title="Tasks by Priority" subtitle="Distribution across priority levels">
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={priorityBarData} barSize={36} margin={{ top: 4, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={T.borderLight} vertical={false} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} />
                        <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(247, 147, 30,.05)" }} />
                        <Bar dataKey="count" name="Tasks" radius={[8, 8, 0, 0]}>
                          {priorityBarData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>
                </div>

                {/* recent tasks preview */}
                <ChartCard title="Recent Tasks" subtitle="Your latest 3 assigned tasks">
                  {tasks.length === 0 ? (
                    <div style={{ padding: "30px 0", textAlign: "center", color: T.textMuted, fontSize: 13 }}>No tasks assigned yet</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {tasks.slice(0, 3).map((task) => {
                        const sm = STATUS[task.status] || STATUS.pending;
                        const pm = PRIORITY[task.priority] || PRIORITY.medium;
                        const StatusIcon = sm.Icon;
                        return (
                          <div key={task._id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 16px", background: T.bg, borderRadius: 12, border: `1px solid ${T.borderLight}` }}>
                            <div style={{ width: 3, alignSelf: "stretch", borderRadius: 99, background: pm.color, flexShrink: 0 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: 13.5, color: T.textPrimary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{task.title}</div>
                              <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 3, display: "flex", alignItems: "center", gap: 5 }}>
                                <Calendar size={11} strokeWidth={1.8} />
                                {task.dueDate ? new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "No due date"}
                              </div>
                            </div>
                            <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, padding: "5px 10px", borderRadius: 7, color: sm.color, background: sm.bg, border: `1px solid ${sm.border}`, flexShrink: 0 }}>
                              <StatusIcon size={11} strokeWidth={2} />{sm.label}
                            </span>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: "4px 9px", borderRadius: 5, color: pm.color, background: pm.bg, border: `1px solid ${pm.border}`, letterSpacing: ".07em", textTransform: "uppercase", flexShrink: 0 }}>
                              {pm.label}
                            </span>
                          </div>
                        );
                      })}
                      {tasks.length > 3 && (
                        <button onClick={() => setTab("tasks")} style={{ background: "none", border: "none", cursor: "pointer", color: T.brand, fontSize: 13, fontWeight: 600, padding: "8px 0 0", fontFamily: "inherit", textAlign: "left", display: "flex", alignItems: "center", gap: 5 }}>
                          View all {tasks.length} tasks →
                        </button>
                      )}
                    </div>
                  )}
                </ChartCard>
              </div>
            )}

            {/* ══ MY TASKS ═══════════════════════════════════════════════════ */}
            {tab === "tasks" && (
              <div className="fade-up">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                  <div>
                    <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 19, color: T.textPrimary }}>My Tasks</h2>
                    <p style={{ fontSize: 12.5, color: T.textMuted, marginTop: 3 }}>{total} task{total !== 1 ? "s" : ""} assigned to you</p>
                  </div>
                  {/* filter chips */}
                  <div style={{ display: "flex", gap: 8 }}>
                    {[
                      { label: `All (${total})`,        color: T.brand,  bg: T.brandLight  },
                      { label: `Done (${done})`,        color: T.green,  bg: T.greenBg     },
                      { label: `Active (${inProg})`,    color: T.yellow, bg: T.yellowBg    },
                      { label: `Pending (${pend})`,     color: T.slate,  bg: T.slateBg     },
                    ].map(({ label, color, bg }) => (
                      <span key={label} style={{ fontSize: 11.5, fontWeight: 600, padding: "5px 12px", borderRadius: 20, color, background: bg, border: `1px solid ${color}30` }}>{label}</span>
                    ))}
                  </div>
                </div>

                {tasks.length === 0 && assignedClients.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "80px 0" }}>
                    <ClipboardList size={48} strokeWidth={1} color={T.textMuted} style={{ margin: "0 auto 16px", display: "block" }} />
                    <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 17, color: T.textSecondary }}>No tasks assigned</p>
                    <p style={{ fontSize: 13, color: T.textMuted, marginTop: 6 }}>Check back later or contact your admin</p>
                  </div>
                ) : tasks.length === 0 ? null : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {tasks.map((task, i) => {
                      const sm = STATUS[task.status] || STATUS.pending;
                      const pm = PRIORITY[task.priority] || PRIORITY.medium;
                      const isOverdue = task.dueDate && task.status !== "completed" && new Date(task.dueDate) < new Date();

                      return (
                        <div key={task._id} className="task-card card-in" style={{
                          background: T.card, border: `1.5px solid ${T.border}`,
                          borderRadius: 16, padding: "20px 22px",
                          animationDelay: `${i * 35}ms`,
                          boxShadow: "0 1px 3px rgba(0,0,0,.04)",
                        }}>
                          <div style={{ display: "flex", alignItems: "flex-start", gap: 0 }}>
                            {/* priority accent bar */}
                            <div style={{ width: 3, borderRadius: 99, background: pm.color, alignSelf: "stretch", marginRight: 18, flexShrink: 0, minHeight: 52 }} />

                            <div style={{ flex: 1, minWidth: 0 }}>
                              {/* title row */}
                              <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap", marginBottom: 6 }}>
                                <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: 15, color: T.textPrimary }}>{task.title}</h3>
                                <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 5, color: pm.color, background: pm.bg, border: `1px solid ${pm.border}`, letterSpacing: ".07em", textTransform: "uppercase" }}>{pm.label}</span>
                                {isOverdue && (
                                  <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 5, color: T.red, background: T.redBg, border: `1px solid ${T.redBorder}`, letterSpacing: ".07em", textTransform: "uppercase" }}>Overdue</span>
                                )}
                              </div>

                              {/* contract/client origin */}
                              {task.contractId && (
                                <div style={{ fontSize: 11.5, color: T.textMuted, marginBottom: 10 }}>
                                  Contract: <span style={{ color: T.brand, fontWeight: 600 }}>{task.clientId?.clientName}</span>
                                  {task.contractId?.projectName && <> &middot; <span style={{ color: T.brand, fontWeight: 600 }}>{task.contractId.projectName}</span></>}
                                </div>
                              )}

                              {/* description */}
                              {!task.deliverables?.length && task.description && (
                                <p style={{ fontSize: 13, color: T.textMuted, lineHeight: 1.65, marginBottom: 14 }}>{task.description}</p>
                              )}

                              {/* deliverables progress */}
                              {task.deliverables?.length > 0 && (
                                <div style={{ marginBottom: 14 }}>
                                  <div style={{ fontSize: 11.5, fontWeight: 700, color: T.textSecondary, marginBottom: 7 }}>Deliverables Summary</div>
                                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                    {task.deliverables.map((d) => (
                                      <DeliverableProgressRow
                                        key={d._id}
                                        taskId={task._id}
                                        d={d}
                                        busy={updatingDeliverable === d._id}
                                        onUpdate={handleDeliverableUpdate}
                                      />
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* meta + status row */}
                              <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
                                <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: isOverdue ? T.red : T.textMuted, fontWeight: isOverdue ? 600 : 400 }}>
                                  <Calendar size={12} strokeWidth={1.8} />
                                  {task.dueDate
                                    ? new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                                    : "No due date"}
                                </span>
                                <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: T.textMuted }}>
                                  <User size={12} strokeWidth={1.8} />
                                  Assigned to you
                                </span>

                                {/* spacer */}
                                <div style={{ flex: 1 }} />

                                {/* status dropdown */}
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                  <span style={{ fontSize: 12, color: T.textMuted, fontWeight: 500 }}>Status:</span>
                                  <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
                                    {updating === task._id ? (
                                      <span style={{ fontSize: 12, color: T.textMuted, padding: "7px 14px" }}>Saving…</span>
                                    ) : (
                                      <>
                                        <sm.Icon size={13} color={sm.color} strokeWidth={2} style={{ position: "absolute", left: 10, pointerEvents: "none", zIndex: 1 }} />
                                        <ChevronDown size={13} color={T.textMuted} strokeWidth={2} style={{ position: "absolute", right: 9, pointerEvents: "none", zIndex: 1 }} />
                                        <select
                                          value={task.status || "pending"}
                                          onChange={e => handleStatusChange(task._id, e.target.value)}
                                          style={{
                                            appearance: "none", cursor: "pointer",
                                            padding: "7px 30px 7px 30px",
                                            fontSize: 12, fontWeight: 600, borderRadius: 8,
                                            color: sm.color, background: sm.bg,
                                            border: `1.5px solid ${sm.border}`,
                                            fontFamily: "inherit", outline: "none",
                                            transition: "border-color .18s",
                                          }}
                                        >
                                          <option value="pending">Pending</option>
                                          <option value="in-progress">In Progress</option>
                                          <option value="completed">Completed</option>
                                        </select>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {assignedClients.length > 0 && (
                  <div style={{ marginTop: 36 }}>
                    <div style={{ marginBottom: 16 }}>
                      <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 19, color: T.textPrimary }}>Assigned Client Work</h2>
                      <p style={{ fontSize: 12.5, color: T.textMuted, marginTop: 3 }}>Clients assigned to you — view scope of work, add remarks, and update progress.</p>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {assignedClients.map((client) => (
                        <div
                          key={client._id}
                          className="task-card card-in"
                          onClick={() => setOpenClientTaskId(client._id)}
                          style={{
                            background: T.card, border: `1.5px solid ${T.border}`,
                            borderRadius: 16, padding: "18px 22px",
                            boxShadow: "0 1px 3px rgba(0,0,0,.04)", cursor: "pointer",
                            display: "flex", alignItems: "center", gap: 14,
                          }}
                        >
                          <Briefcase size={18} color={T.brand} strokeWidth={2} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: 14.5, color: T.textPrimary }}>{client.clientName}</h3>
                            <p style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>
                              {client.companyName || client.projectName || "Client project"}
                            </p>
                          </div>
                          <span style={{ fontSize: 11.5, fontWeight: 600, color: T.brand }}>View details →</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ══ APPLY LEAVE ════════════════════════════════════════════════ */}
            {tab === "leave" && (
              <div className="fade-up">
                <div style={{ marginBottom: 20 }}>
                  <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 19, color: T.textPrimary }}>Apply Leave</h2>
                  <p style={{ fontSize: 12.5, color: T.textMuted, marginTop: 3 }}>Submit a leave request for your admin to review.</p>
                </div>

                <form onSubmit={handleApplyLeave} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: "22px", boxShadow: "0 1px 3px rgba(0,0,0,.04)", marginBottom: 26 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <label style={{ fontSize: 11.5, fontWeight: 600, color: T.textSecondary, letterSpacing: ".06em", textTransform: "uppercase" }}>From Date</label>
                      <input type="date" required value={leaveForm.fromDate} onChange={e => setLeaveForm(p => ({ ...p, fromDate: e.target.value }))} style={{ width: "100%", boxSizing: "border-box", background: T.inputBg, border: `1.5px solid ${T.inputBorder}`, borderRadius: 10, padding: "10px 14px", color: T.textPrimary, fontSize: 13.5, outline: "none", fontFamily: "inherit" }} />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <label style={{ fontSize: 11.5, fontWeight: 600, color: T.textSecondary, letterSpacing: ".06em", textTransform: "uppercase" }}>To Date</label>
                      <input type="date" required value={leaveForm.toDate} onChange={e => setLeaveForm(p => ({ ...p, toDate: e.target.value }))} style={{ width: "100%", boxSizing: "border-box", background: T.inputBg, border: `1.5px solid ${T.inputBorder}`, borderRadius: 10, padding: "10px 14px", color: T.textPrimary, fontSize: 13.5, outline: "none", fontFamily: "inherit" }} />
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 18 }}>
                    <label style={{ fontSize: 11.5, fontWeight: 600, color: T.textSecondary, letterSpacing: ".06em", textTransform: "uppercase" }}>Reason</label>
                    <textarea required rows={3} value={leaveForm.reason} onChange={e => setLeaveForm(p => ({ ...p, reason: e.target.value }))} placeholder="Briefly explain the reason for leave" style={{ width: "100%", boxSizing: "border-box", resize: "vertical", background: T.inputBg, border: `1.5px solid ${T.inputBorder}`, borderRadius: 10, padding: "10px 14px", color: T.textPrimary, fontSize: 13.5, outline: "none", fontFamily: "inherit" }} />
                  </div>
                  <button type="submit" disabled={submittingLeave} style={{ display: "flex", alignItems: "center", gap: 8, background: "linear-gradient(135deg, #f7931e, #e8590c)", color: "#fff", border: "none", borderRadius: 10, padding: "11px 20px", fontSize: 13.5, fontWeight: 700, fontFamily: "'Syne', sans-serif", cursor: submittingLeave ? "not-allowed" : "pointer", opacity: submittingLeave ? .7 : 1 }}>
                    <Send size={14} strokeWidth={2.2} /> {submittingLeave ? "Submitting…" : "Submit Request"}
                  </button>
                </form>

                <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: T.textPrimary, marginBottom: 14 }}>Your Requests</h3>

                {leaves.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "60px 0" }}>
                    <FileText size={40} strokeWidth={1} color={T.textMuted} style={{ margin: "0 auto 14px", display: "block" }} />
                    <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 15, color: T.textSecondary }}>No leave requests yet</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {leaves.map((leave) => {
                      const lm = LEAVE_STATUS[leave.status] || LEAVE_STATUS.pending;
                      return (
                        <div key={leave._id} className="task-card card-in" style={{ background: T.card, border: `1.5px solid ${T.border}`, borderRadius: 14, padding: "16px 20px", boxShadow: "0 1px 3px rgba(0,0,0,.04)" }}>
                          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5, fontWeight: 600, color: T.textPrimary }}>
                                <Calendar size={13} strokeWidth={1.8} color={T.textMuted} />
                                {new Date(leave.fromDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                {" — "}
                                {new Date(leave.toDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                              </div>
                              <p style={{ fontSize: 12.5, color: T.textMuted, marginTop: 6 }}>{leave.reason}</p>
                              {leave.adminComment && (
                                <p style={{ fontSize: 12, color: T.textSecondary, marginTop: 6, fontStyle: "italic" }}>Admin: {leave.adminComment}</p>
                              )}
                            </div>
                            <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, padding: "5px 10px", borderRadius: 7, color: lm.color, background: lm.bg, border: `1px solid ${lm.border}`, flexShrink: 0 }}>
                              <lm.Icon size={11} strokeWidth={2} />{lm.label}
                            </span>
                          </div>
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
                    <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 19, color: T.textPrimary }}>Salary Slips</h2>
                    <p style={{ fontSize: 12.5, color: T.textMuted, marginTop: 3 }}>View the salary slips emailed by your admin.</p>
                  </div>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: T.brand, background: T.brandLight, border: `1px solid ${T.brandMid}`, borderRadius: 999, padding: "8px 12px" }}>
                    {salarySlips.length} slip{salarySlips.length !== 1 ? "s" : ""}
                  </div>
                </div>

                {salarySlips.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "80px 0" }}>
                    <Shield size={48} strokeWidth={1} color={T.textMuted} style={{ margin: "0 auto 16px", display: "block" }} />
                    <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 17, color: T.textSecondary }}>No salary slips yet</p>
                    <p style={{ fontSize: 13, color: T.textMuted, marginTop: 6 }}>Your paid salary slips will appear here after admin sends them.</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {salarySlips.map((slip, i) => {
                      const totalAllowances = (Number(slip.homeAllowance) || 0) + (Number(slip.travelAllowance) || 0) + (Number(slip.otherAllowance) || 0);
                      const totalDeductions = (Number(slip.pf) || 0) + (Number(slip.deductions) || 0);

                      return (
                        <div key={slip._id} className="task-card card-in" style={{ background: T.card, border: `1.5px solid ${T.border}`, borderRadius: 18, padding: "22px", animationDelay: `${i * 35}ms`, boxShadow: "0 1px 3px rgba(0,0,0,.04)" }}>
                          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 16 }}>
                            <div>
                              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 18, color: T.textPrimary }}>{slip.salaryMonth}</div>
                              <div style={{ fontSize: 12.5, color: T.textMuted, marginTop: 4 }}>Slip No: {slip.slipNumber}</div>
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 700, padding: "6px 10px", borderRadius: 999, color: T.green, background: T.greenBg, border: `1px solid ${T.greenBorder}` }}>
                              Paid on {new Date(slip.paidAt || slip.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                            </span>
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
                            <div style={{ background: T.bg, border: `1px solid ${T.borderLight}`, borderRadius: 12, padding: "14px 12px" }}>
                              <div style={{ fontSize: 10.5, color: T.textMuted, textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 700 }}>Basic</div>
                              <div style={{ fontSize: 18, fontWeight: 700, color: T.textPrimary, marginTop: 8, fontFamily: "'Syne', sans-serif" }}>{fmtCurrency(slip.basicSalary)}</div>
                            </div>
                            <div style={{ background: T.greenBg, border: `1px solid ${T.greenBorder}`, borderRadius: 12, padding: "14px 12px" }}>
                              <div style={{ fontSize: 10.5, color: T.green, textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 700 }}>Allowances</div>
                              <div style={{ fontSize: 18, fontWeight: 700, color: T.green, marginTop: 8, fontFamily: "'Syne', sans-serif" }}>{fmtCurrency(totalAllowances)}</div>
                            </div>
                            <div style={{ background: T.redBg, border: `1px solid ${T.redBorder}`, borderRadius: 12, padding: "14px 12px" }}>
                              <div style={{ fontSize: 10.5, color: T.red, textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 700 }}>Deductions</div>
                              <div style={{ fontSize: 18, fontWeight: 700, color: T.red, marginTop: 8, fontFamily: "'Syne', sans-serif" }}>{fmtCurrency(totalDeductions)}</div>
                            </div>
                            <div style={{ background: T.brandLight, border: `1px solid ${T.brandMid}`, borderRadius: 12, padding: "14px 12px" }}>
                              <div style={{ fontSize: 10.5, color: T.brand, textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 700 }}>In Hand</div>
                              <div style={{ fontSize: 18, fontWeight: 700, color: T.brand, marginTop: 8, fontFamily: "'Syne', sans-serif" }}>{fmtCurrency(slip.inHand)}</div>
                            </div>
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
                            {[
                              { label: "Home", value: fmtCurrency(slip.homeAllowance) },
                              { label: "Travel", value: fmtCurrency(slip.travelAllowance) },
                              { label: "Other", value: fmtCurrency(slip.otherAllowance) },
                              { label: "PF", value: fmtCurrency(slip.pf) },
                              { label: "Leaves", value: Number(slip.leaves) || 0 },
                            ].map((item) => (
                              <div key={item.label} style={{ background: "#fff", border: `1px solid ${T.borderLight}`, borderRadius: 12, padding: "12px" }}>
                                <div style={{ fontSize: 10.5, color: T.textMuted, textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 700 }}>{item.label}</div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: T.textPrimary, marginTop: 7 }}>{item.value}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ══ MY CLIENTS ═════════════════════════════════════════════════ */}
            {tab === "clients" && (
              <div className="fade-up" style={{ margin: "-30px -36px -64px" }}>
                <ClientsPage />
              </div>
            )}

          </main>
        </div>

        {/* ── ASSIGNED CLIENT TASK DETAIL ──────────────────────────────────────── */}
        {openClientTaskId && (
          <div className="modal-overlay" onClick={() => setOpenClientTaskId(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <ClientTaskDetail clientId={openClientTaskId} onClose={() => setOpenClientTaskId(null)} />
            </div>
          </div>
        )}

        {/* ── TOAST ─────────────────────────────────────────────────────────── */}
        {toast && (
          <div style={{ position: "fixed", bottom: 26, right: 26, zIndex: 9999, background: "#fff", border: `1.5px solid ${toast.ok ? T.greenBorder : T.redBorder}`, borderRadius: 13, padding: "14px 18px", fontWeight: 500, fontSize: 13.5, animation: "toastIn .26s cubic-bezier(.22,1,.36,1) both", display: "flex", alignItems: "center", gap: 11, boxShadow: "0 8px 32px rgba(0,0,0,.12)", maxWidth: 340 }}>
            {toast.ok ? <CheckCircle2 size={17} strokeWidth={2} color={T.green} /> : <AlertCircle size={17} strokeWidth={2} color={T.red} />}
            <span style={{ flex: 1, color: T.textPrimary }}>{toast.msg}</span>
            <button onClick={() => setToast(null)} style={{ background: "none", border: "none", cursor: "pointer", color: T.textMuted, display: "flex", padding: 0 }}>
              <X size={14} strokeWidth={2} />
            </button>
          </div>
        )}

      </div>
    </>
  );
}
