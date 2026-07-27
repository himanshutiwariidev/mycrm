import React from "react";
import {
  Activity, AlertCircle, Briefcase, Calendar, ClipboardList,
  Eye, EyeOff, Lock, Mail, Save, Shield, User,
} from "lucide-react";
import {
  ConfirmModal,
  FieldIcon,
  FormField,
  Modal,
  T,
  baseInp,
  baseInpNoIcon,
  fmtCurrency,
} from "./shared";

export default function DashboardModals({
  users,
  editTask,
  setEditTask,
  editTaskForm,
  setEditTaskForm,
  handleUpdateTask,
  editUser,
  setEditUser,
  editUserForm,
  setEditUserForm,
  showEditPw,
  setShowEditPw,
  handleUpdateUser,
  payUser,
  setPayUser,
  payingSalary,
  salaryForm,
  setSalaryForm,
  salaryPreview,
  handlePaySalary,
  deleteTask,
  setDeleteTask,
  handleDeleteTask,
  deleteUser,
  setDeleteUser,
  handleDeleteUser,
  deleteProject,
  setDeleteProject,
  handleDeleteProject,
}) {
  return (
    <>
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
              <button className="pri-btn" type="submit" style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 20px", background: "linear-gradient(135deg, #f7931e, #e8590c)", color: "#fff", borderRadius: 9, fontSize: 13, fontWeight: 700, fontFamily: "'Syne', sans-serif" }}>
                <Save size={14} strokeWidth={2} /> Save Changes
              </button>
            </div>
          </form>
        </Modal>
      )}

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
              <button className="pri-btn" type="submit" style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 20px", background: "linear-gradient(135deg, #f7931e, #e8590c)", color: "#fff", borderRadius: 9, fontSize: 13, fontWeight: 700, fontFamily: "'Syne', sans-serif" }}>
                <Save size={14} strokeWidth={2} /> Save Changes
              </button>
            </div>
          </form>
        </Modal>
      )}

      {payUser && (
        <Modal title={`Pay Salary • ${payUser.name}`} onClose={() => !payingSalary && setPayUser(null)} width={640}>
          <form onSubmit={handlePaySalary}>
            <div style={{ marginBottom: 18, padding: "14px 16px", borderRadius: 12, background: T.brandLight, border: `1px solid ${T.brandMid}` }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.brand }}>Salary slip will be emailed to</div>
              <div style={{ fontSize: 14, color: T.textPrimary, marginTop: 5 }}>{payUser.email}</div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 18 }}>
              <FormField label="Salary Month"><div style={{ position: "relative" }}><FieldIcon icon={Calendar} /><input className="inp" style={baseInp} type="month" value={salaryForm.salaryMonth} onChange={e => setSalaryForm({ ...salaryForm, salaryMonth: e.target.value })} required /></div></FormField>
              <FormField label="Basic Salary"><div style={{ position: "relative" }}><FieldIcon icon={Briefcase} /><input className="inp" style={baseInp} type="number" min="0" step="0.01" placeholder="50000" value={salaryForm.basicSalary} onChange={e => setSalaryForm({ ...salaryForm, basicSalary: e.target.value })} required /></div></FormField>
              <FormField label="Home Allowance"><div style={{ position: "relative" }}><FieldIcon icon={Briefcase} /><input className="inp" style={baseInp} type="number" min="0" step="0.01" placeholder="5000" value={salaryForm.homeAllowance} onChange={e => setSalaryForm({ ...salaryForm, homeAllowance: e.target.value })} /></div></FormField>
              <FormField label="Travel Allowance"><div style={{ position: "relative" }}><FieldIcon icon={Briefcase} /><input className="inp" style={baseInp} type="number" min="0" step="0.01" placeholder="3000" value={salaryForm.travelAllowance} onChange={e => setSalaryForm({ ...salaryForm, travelAllowance: e.target.value })} /></div></FormField>
              <FormField label="Other Allowance"><div style={{ position: "relative" }}><FieldIcon icon={Briefcase} /><input className="inp" style={baseInp} type="number" min="0" step="0.01" placeholder="2000" value={salaryForm.otherAllowance} onChange={e => setSalaryForm({ ...salaryForm, otherAllowance: e.target.value })} /></div></FormField>
              <FormField label="Leaves"><div style={{ position: "relative" }}><FieldIcon icon={Calendar} /><input className="inp" style={baseInp} type="number" min="0" step="1" placeholder="0" value={salaryForm.leaves} onChange={e => setSalaryForm({ ...salaryForm, leaves: e.target.value })} /></div></FormField>
              <FormField label="PF"><div style={{ position: "relative" }}><FieldIcon icon={Briefcase} /><input className="inp" style={baseInp} type="number" min="0" step="0.01" placeholder="1800" value={salaryForm.pf} onChange={e => setSalaryForm({ ...salaryForm, pf: e.target.value })} /></div></FormField>
              <FormField label="Other Deductions"><div style={{ position: "relative" }}><FieldIcon icon={Briefcase} /><input className="inp" style={baseInp} type="number" min="0" step="0.01" placeholder="500" value={salaryForm.deductions} onChange={e => setSalaryForm({ ...salaryForm, deductions: e.target.value })} /></div></FormField>
              <FormField label="Auto Calculated In Hand" span2><div style={{ position: "relative" }}><FieldIcon icon={Briefcase} /><input className="inp" style={{ ...baseInp, background: "#fff4e6", color: T.brand, fontWeight: 700 }} type="text" value={fmtCurrency(salaryPreview.inHand)} readOnly /></div></FormField>
            </div>

            <div style={{ marginBottom: 12, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
              {[
                ["Leave Cut", salaryPreview.leaveDeduction, "#c2410c", "#fff7ed", "#fdba74"],
                ["Allowances", salaryPreview.totalAllowances, T.green, T.greenBg, T.greenBorder],
                ["Deductions", salaryPreview.totalDeductions, T.red, T.redBg, T.redBorder],
                ["In Hand", salaryPreview.inHand, T.brand, T.brandLight, T.brandMid],
              ].map(([label, value, color, bg, border]) => (
                <div key={label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: "14px 16px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: ".08em" }}>{label}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color, marginTop: 8, fontFamily: "'Syne', sans-serif" }}>{fmtCurrency(value)}</div>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 18, padding: "12px 14px", borderRadius: 12, background: "#fff", border: `1px solid ${T.borderLight}`, fontSize: 12.5, color: T.textSecondary, lineHeight: 1.65 }}>
              Final salary is auto-calculated using the selected month. Leave deduction = basic salary / {salaryPreview.daysInMonth} days × {salaryPreview.leaves} leave{salaryPreview.leaves !== 1 ? "s" : ""}.
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setPayUser(null)} disabled={payingSalary} style={{ padding: "9px 18px", borderRadius: 9, border: `1.5px solid ${T.border}`, background: "#fff", color: T.textSecondary, fontSize: 13, fontWeight: 600, cursor: payingSalary ? "default" : "pointer", fontFamily: "inherit", opacity: payingSalary ? 0.7 : 1 }}>Cancel</button>
              <button className="pri-btn" type="submit" disabled={payingSalary} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 20px", background: "linear-gradient(135deg, #f7931e, #e8590c)", color: "#fff", borderRadius: 9, fontSize: 13, fontWeight: 700, fontFamily: "'Syne', sans-serif", opacity: payingSalary ? 0.8 : 1 }}>
                <Save size={14} strokeWidth={2} /> {payingSalary ? "Sending..." : "Pay & Send Slip"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleteTask && <ConfirmModal title="Delete Task" message={`Are you sure you want to delete "${deleteTask.title}"? This action cannot be undone.`} onConfirm={handleDeleteTask} onClose={() => setDeleteTask(null)} />}
      {deleteUser && <ConfirmModal title="Delete User" message={`Are you sure you want to delete the account for "${deleteUser.name}"? All their task assignments may be affected.`} onConfirm={handleDeleteUser} onClose={() => setDeleteUser(null)} />}
      {deleteProject && <ConfirmModal title="Delete Project" message={`Are you sure you want to delete "${deleteProject.companyName}"? This action cannot be undone.`} onConfirm={handleDeleteProject} onClose={() => setDeleteProject(null)} />}
    </>
  );
}
