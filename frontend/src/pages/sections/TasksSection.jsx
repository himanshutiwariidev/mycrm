import React from "react";
import { Calendar, ClipboardList, Pencil, Plus, Trash2, User } from "lucide-react";
import { IconBtn, PRIORITY, STATUS, T } from "./shared";

export default function TasksSection({ tasks, setTab, openEditTask, setDeleteTask }) {
  const totalCount = tasks.length;

  return (
    <div className="fade-up">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 19, color: T.textPrimary }}>All Tasks</h2>
          <p style={{ fontSize: 12.5, color: T.textMuted, marginTop: 3 }}>{totalCount} task{totalCount !== 1 ? "s" : ""} total</p>
        </div>
        <button className="pri-btn" onClick={() => setTab("createTask")} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", background: "linear-gradient(135deg, #f7931e, #e8590c)", color: "#fff", borderRadius: 10, fontSize: 13, fontWeight: 600 }}>
          <Plus size={15} strokeWidth={2.5} /> New Task
        </button>
      </div>

      {totalCount === 0 ? (
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
                  <IconBtn icon={Pencil} color="#f7931e" bg="#fff4e6" hoverBg="#fed7aa" onClick={() => openEditTask(task)} title="Edit task" />
                  <IconBtn icon={Trash2} color={T.red} bg={T.redBg} hoverBg={T.redBorder} onClick={() => setDeleteTask(task)} title="Delete task" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
