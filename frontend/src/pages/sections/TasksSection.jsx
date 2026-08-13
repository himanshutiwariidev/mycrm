import React, { useEffect, useRef, useState } from "react";
import {
  ArrowRight, Briefcase, Calendar, CheckCircle2, ChevronDown, ClipboardList,
  FileText, Filter, MoreVertical, Pencil, Plus, Trash2, User,
} from "lucide-react";
import { PRIORITY, STATUS, T } from "./shared";
import { resolveDeliverableVisual } from "../../config/serviceVisuals";
import { columnsForUnit, formatDeliverableProgress, summarizeTaskDeliverables } from "../../config/deliverableUnits";

const AVATAR_PALETTE = ["#e8590c", "#0d9488", "#7c3aed", "#2563eb", "#db2777", "#ca8a04"];
const ROW_PALETTE = ["#2563eb", "#16a34a", "#7c3aed", "#ea580c", "#db2777", "#0d9488"];

function hashColor(str = "") {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

function initials(str = "") {
  return str.trim().slice(0, 2) || "??";
}

// STATUS.pending in shared.jsx points at undefined T.slate/T.slateBg tokens
// (a pre-existing gap there), which renders as an invisible badge — patched
// locally here rather than in shared.jsx to avoid touching every other page
// that imports STATUS.
function statusStyle(status) {
  const base = STATUS[status] || STATUS.pending;
  if (!status || status === "pending") {
    return { ...base, color: "#c2410c", bg: "#ffedd5", border: "#fed7aa" };
  }
  return base;
}

const FILTERS = [
  { id: "all", label: "All Statuses" },
  { id: "pending", label: "Pending" },
  { id: "in-progress", label: "In Progress" },
  { id: "completed", label: "Completed" },
];

function FilterMenu({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 16px", background: "#fff", border: `1.5px solid ${T.border}`, borderRadius: 10, fontSize: 13, fontWeight: 600, color: T.textSecondary, cursor: "pointer" }}
      >
        <Filter size={14} strokeWidth={2} /> Filter <ChevronDown size={13} strokeWidth={2} />
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, background: "#fff", border: `1.5px solid ${T.border}`, borderRadius: 12, boxShadow: "0 12px 32px rgba(0,0,0,.12)", padding: 6, minWidth: 170, zIndex: 20 }}>
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => { onChange(f.id); setOpen(false); }}
              style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 10px", borderRadius: 8, border: "none", background: value === f.id ? T.brandLight : "transparent", color: value === f.id ? T.brand : T.textSecondary, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function KebabMenu({ onDelete }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} style={{ position: "absolute", top: 14, right: 14 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        title="More actions"
        style={{ width: 28, height: 28, borderRadius: 7, border: "none", background: open ? T.inputBg : "transparent", color: T.textMuted, display: "grid", placeItems: "center", cursor: "pointer" }}
      >
        <MoreVertical size={15} strokeWidth={2} />
      </button>
      {open && (
        <div style={{ position: "absolute", top: 32, right: 0, background: "#fff", border: `1.5px solid ${T.border}`, borderRadius: 10, boxShadow: "0 12px 32px rgba(0,0,0,.14)", padding: 5, minWidth: 120, zIndex: 20 }}>
          <button onClick={() => { onDelete(); setOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "7px 9px", borderRadius: 7, border: "none", background: "transparent", color: T.red, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
            <Trash2 size={13} strokeWidth={2} /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

function StatCard({ Icon, label, value, sub, color }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      style={{ position: "relative", background: T.card, border: `1.5px solid ${T.border}`, borderRadius: 16, padding: "18px 20px", overflow: "hidden" }}
    >
      <div style={{ position: "absolute", top: -30, right: -30, width: 100, height: 100, borderRadius: "50%", background: color, opacity: 0.08, filter: "blur(2px)" }} />
      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", background: color, display: "grid", placeItems: "center", flexShrink: 0, boxShadow: `0 4px 12px ${color}55` }}>
          <Icon size={18} color="#fff" strokeWidth={2} />
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: T.textSecondary }}>{label}</span>
      </div>
      <div style={{ position: "relative", fontSize: 26, fontWeight: 700, color: T.textPrimary, fontFamily: "'Syne', sans-serif", lineHeight: 1 }}>{value}</div>
      <button
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{ position: "relative", display: "flex", alignItems: "center", gap: 4, marginTop: 8, background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 11.5, color, fontWeight: 600 }}
      >
        {sub} <ArrowRight size={12} strokeWidth={2.4} style={{ transform: hov ? "translateX(2px)" : "none", transition: "transform .15s" }} />
      </button>
    </div>
  );
}

// Extra (non-Deliverable/Platform/Progress) column cell renderers, keyed by
// the column label columnsForUnit() can produce for a given unit.
function extraCell(col, d) {
  const meta = d.metadata || {};
  const fmtBudget = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
  switch (col) {
    case "Budget":
      return meta.budget ? fmtBudget(meta.budget) : "—";
    case "Campaigns":
      return meta.campaigns ?? d.quantity;
    case "Pages":
      return meta.pages ?? d.quantity;
    case "Screens":
      return meta.screens ?? d.quantity;
    case "Keywords":
      return meta.keywords ?? d.quantity;
    case "Quantity":
      return `${d.quantity}${d.frequency && d.frequency !== "one-time" ? `/${d.frequency}` : ""}`;
    default:
      return null;
  }
}

function DeliverablesTable({ deliverables }) {
  const columns = columnsForUnit(deliverables[0]?.unit);
  const extraColumns = columns.filter((c) => !["Deliverable", "Platform", "Progress"].includes(c));

  return (
    <div style={{ marginTop: 14, marginBottom: 14, border: `1px solid ${T.borderLight}`, borderRadius: 12, overflow: "hidden" }}>
      <div style={{ padding: "10px 14px 0" }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: T.textPrimary, marginBottom: 8 }}>Deliverables Overview</div>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 480 }}>
          <thead>
            <tr>
              {columns.map((h) => (
                <th key={h} style={{ textAlign: h === "Platform" ? "center" : "left", padding: "6px 14px", fontSize: 10.5, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: 0.4 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {deliverables.map((d, idx) => {
              const visual = resolveDeliverableVisual(d.title, d.categoryId);
              const VisualIcon = visual.Icon;
              const rowColor = ROW_PALETTE[idx % ROW_PALETTE.length];
              const delivered = d.delivered || 0;
              const quantity = d.quantity || 0;
              const pct = quantity ? Math.min(100, Math.round((delivered / quantity) * 100)) : 0;
              return (
                <tr key={d._id || idx} style={{ borderTop: `1px solid ${T.borderLight}` }}>
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: `${visual.bg}`.startsWith("linear") ? visual.bg : `${visual.bg}22`, display: "grid", placeItems: "center", flexShrink: 0 }}>
                        <VisualIcon size={13} color={visual.bg.startsWith("linear") ? "#fff" : visual.bg} />
                      </div>
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: T.textPrimary, whiteSpace: "nowrap" }}>{d.title}</span>
                    </div>
                  </td>
                  <td style={{ padding: "10px 14px", textAlign: "center" }}>
                    <div style={{ width: 26, height: 26, borderRadius: "50%", background: visual.bg, display: "grid", placeItems: "center", margin: "0 auto" }}>
                      <VisualIcon size={13} color="#fff" />
                    </div>
                  </td>
                  {extraColumns.filter((c) => c !== "Quantity").map((col) => (
                    <td key={col} style={{ padding: "10px 14px" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: rowColor, background: `${rowColor}1a`, borderRadius: 6, padding: "3px 10px", whiteSpace: "nowrap" }}>
                        {extraCell(col, d)}
                      </span>
                    </td>
                  ))}
                  <td style={{ padding: "10px 14px", minWidth: 150 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1, height: 6, background: T.inputBg, borderRadius: 99, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: rowColor, borderRadius: 99 }} />
                      </div>
                      <span style={{ fontSize: 11, color: T.textMuted, whiteSpace: "nowrap" }}>{formatDeliverableProgress(d)}</span>
                    </div>
                  </td>
                  {extraColumns.includes("Quantity") && (
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: rowColor, background: `${rowColor}1a`, borderRadius: 6, padding: "3px 10px", whiteSpace: "nowrap" }}>
                        {extraCell("Quantity", d)}
                      </span>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TaskCard({ task, openEditTask, setDeleteTask }) {
  const sm = statusStyle(task.status);
  const StatusIcon = sm.Icon;
  const isContractTask = !!task.contractId;
  const clientName = task.clientId?.clientName || "";
  const contractName = task.contractId?.projectName || "";
  const avatarLabel = isContractTask ? (clientName || task.title) : task.title;
  const color = hashColor(avatarLabel);
  const displayTitle = clientName && task.title?.startsWith(`${clientName}: `) ? task.title.slice(clientName.length + 2) : task.title;
  const { count, label: totalsLabel, amount: totalsAmount } = summarizeTaskDeliverables(task.deliverables);
  const pm = PRIORITY[task.priority] || PRIORITY.medium;

  return (
    <div style={{ position: "relative", background: T.card, border: `1.5px solid ${T.border}`, borderRadius: 14, boxShadow: "0 1px 3px rgba(0,0,0,.04)", overflow: "hidden" }}>
      <div style={{ display: "flex" }}>
        <div style={{ width: 4, background: color, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0, display: "flex", gap: 16, padding: "18px 44px 18px 18px", flexWrap: "wrap" }}>
          <div style={{ width: 42, height: 42, borderRadius: 11, background: color, color: "#fff", display: "grid", placeItems: "center", fontSize: 14, fontWeight: 700, fontFamily: "'Syne', sans-serif", flexShrink: 0 }}>
            {initials(avatarLabel)}
          </div>

          <div style={{ flex: 1, minWidth: 260 }}>
            {isContractTask && clientName && (
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: T.textPrimary }}>{clientName}</div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: isContractTask ? 2 : 0 }}>
              <span style={{ fontSize: 13.5, fontWeight: 600, color: isContractTask ? T.textSecondary : T.textPrimary, fontFamily: isContractTask ? "inherit" : "'Syne', sans-serif" }}>{displayTitle}</span>
              {!isContractTask && (
                <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 5, color: pm.color, background: pm.bg, border: `1px solid ${pm.border}`, letterSpacing: ".07em", textTransform: "uppercase" }}>{pm.label}</span>
              )}
            </div>

            {isContractTask && (
              <div style={{ fontSize: 11.5, marginTop: 5, color: T.textMuted }}>
                Contract: <span style={{ color: T.brand, fontWeight: 600 }}>{clientName}</span>
                {contractName && <> &middot; <span style={{ color: T.brand, fontWeight: 600 }}>{contractName}</span></>}
              </div>
            )}
            {!isContractTask && task.description && (
              <p style={{ fontSize: 12.5, color: T.textMuted, lineHeight: 1.6, marginTop: 5 }}>{task.description}</p>
            )}

            {task.deliverables?.length > 0 && <DeliverablesTable deliverables={task.deliverables} />}

            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12, color: T.textMuted, alignItems: "center", marginTop: 12 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}><User size={12} strokeWidth={1.8} />{task.assignedTo?.name || "Unassigned"}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Calendar size={12} strokeWidth={1.8} />{task.dueDate ? new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "No due date"}</span>
            </div>
          </div>

          <div style={{ width: 158, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "stretch", gap: 8 }}>
            <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 11, fontWeight: 600, padding: "6px 10px", borderRadius: 8, color: sm.color, background: sm.bg, border: `1px solid ${sm.border}` }}>
              <StatusIcon size={12} strokeWidth={2} />{sm.label}
            </span>

            {count > 0 && (
              <div style={{ textAlign: "right", marginTop: 2 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: T.textPrimary }}>{count} Package{count !== 1 ? "s" : ""}</div>
                <div style={{ fontSize: 10.5, color: T.textMuted }}>Total Deliverables</div>
                <div style={{ fontSize: 15, fontWeight: 700, color, marginTop: 8 }}>{totalsAmount}</div>
                <div style={{ fontSize: 10.5, color: T.textMuted }}>{totalsLabel}</div>
              </div>
            )}

            <div style={{ marginTop: "auto", paddingTop: 6 }}>
              <button
                onClick={() => openEditTask(task)}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", padding: "9px 12px", borderRadius: 9, border: `1.5px solid ${T.border}`, background: "#fff", color: T.textSecondary, fontSize: 12.5, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}
              >
                <Pencil size={13} strokeWidth={2} /> Edit Task
              </button>
            </div>
          </div>
        </div>
      </div>
      <KebabMenu onDelete={() => setDeleteTask(task)} />
    </div>
  );
}

const PAGE_SIZE = 5;

function TaskGroup({ icon: Icon, iconColor, iconBg, title, subtitle, tasks, openEditTask, setDeleteTask, emptyMessage, linkLabel }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? tasks : tasks.slice(0, PAGE_SIZE);

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: iconBg, display: "grid", placeItems: "center", flexShrink: 0 }}>
          <Icon size={16} strokeWidth={2} color={iconColor} />
        </div>
        <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, color: T.textPrimary }}>{title}</h3>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11.5, color: T.textSecondary, fontWeight: 700, background: T.inputBg, padding: "4px 12px", borderRadius: 99 }}>{tasks.length} Task{tasks.length !== 1 ? "s" : ""}</span>
      </div>
      {subtitle && <p style={{ fontSize: 12, color: T.textMuted, marginLeft: 46, marginBottom: 14 }}>{subtitle}</p>}

      {tasks.length === 0 ? (
        <div style={{ padding: "24px 0", textAlign: "center", fontSize: 12.5, color: T.textMuted, border: `1.5px dashed ${T.border}`, borderRadius: 12 }}>
          {emptyMessage}
        </div>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {visible.map((task) => (
              <TaskCard key={task._id} task={task} openEditTask={openEditTask} setDeleteTask={setDeleteTask} />
            ))}
          </div>
          {tasks.length > PAGE_SIZE && (
            <button
              onClick={() => setExpanded((e) => !e)}
              style={{ display: "block", margin: "16px auto 0", background: "none", border: "none", color: T.brand, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
            >
              {expanded ? "Show less" : linkLabel} {!expanded && <ChevronDown size={13} strokeWidth={2.5} style={{ display: "inline", verticalAlign: "-2px" }} />}
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default function TasksSection({ tasks, setTab, openEditTask, setDeleteTask }) {
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = statusFilter === "all" ? tasks : tasks.filter((t) => (t.status || "pending") === statusFilter);
  const contractTasks = filtered.filter((t) => t.contractId);
  const manualTasks = filtered.filter((t) => !t.contractId);

  const totalCount = tasks.length;
  const contractCount = tasks.filter((t) => t.contractId).length;
  const manualCount = tasks.filter((t) => !t.contractId).length;
  const now = new Date();
  const completedThisMonth = tasks.filter((t) => {
    if (t.status !== "completed") return false;
    const d = new Date(t.updatedAt || t.createdAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  return (
    <div className="fade-up">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 21, color: T.textPrimary }}>All Tasks</h2>
          <p style={{ fontSize: 12.5, color: T.textMuted, marginTop: 3 }}>Track and manage all your tasks in one place</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <FilterMenu value={statusFilter} onChange={setStatusFilter} />
          <button className="pri-btn" onClick={() => setTab("createTask")} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", background: "linear-gradient(135deg, #f7931e, #e8590c)", color: "#fff", borderRadius: 10, fontSize: 13, fontWeight: 600 }}>
            <Plus size={15} strokeWidth={2.5} /> New Task
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 26 }}>
        <StatCard Icon={ClipboardList} label="Total Tasks" value={totalCount} sub="View all tasks" color="#7c3aed" />
        <StatCard Icon={Briefcase} label="Contract Tasks" value={contractCount} sub="Auto-generated from contracts" color="#e8590c" />
        <StatCard Icon={FileText} label="Manual Tasks" value={manualCount} sub="Created manually" color="#2563eb" />
        <StatCard Icon={CheckCircle2} label="Completed Tasks" value={completedThisMonth} sub="This month" color="#16a34a" />
      </div>

      {totalCount === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 0" }}>
          <ClipboardList size={48} strokeWidth={1} color={T.textMuted} style={{ margin: "0 auto 16px", display: "block" }} />
          <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 17, color: T.textSecondary }}>No tasks yet</p>
          <p style={{ fontSize: 13, color: T.textMuted, marginTop: 6 }}>Create your first task to get started</p>
        </div>
      ) : (
        <>
          <TaskGroup
            icon={Briefcase}
            iconColor="#e8590c"
            iconBg="#fff4e6"
            title="Contract Tasks / Auto-Generated"
            subtitle="Tasks automatically created from contract deliverables"
            tasks={contractTasks}
            openEditTask={openEditTask}
            setDeleteTask={setDeleteTask}
            emptyMessage="No contract-generated tasks"
            linkLabel="View all contract tasks"
          />
          <TaskGroup
            icon={FileText}
            iconColor="#7c3aed"
            iconBg="#ede9fe"
            title="Manual Tasks"
            subtitle="Tasks created directly on the Tasks page"
            tasks={manualTasks}
            openEditTask={openEditTask}
            setDeleteTask={setDeleteTask}
            emptyMessage="No manual tasks yet"
            linkLabel="View all manual tasks"
          />
        </>
      )}
    </div>
  );
}
