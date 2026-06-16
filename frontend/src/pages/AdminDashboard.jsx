import React from "react";
import { CheckCircle2, AlertCircle, LayoutDashboard, LogOut, Shield, X } from "lucide-react";
import DashboardSection from "./sections/DashboardSection";
import AttendanceSection from "./sections/AttendanceSection";
import TasksSection from "./sections/TasksSection";
import ClientsSection from "./sections/ClientsSection";
import ProjectsSection from "./sections/ProjectsSection";
import UsersSection from "./sections/UsersSection";
import SalarySection from "./sections/SalarySection";
import CreateTaskSection from "./sections/CreateTaskSection";
import CreateProjectSection from "./sections/CreateProjectSection";
import CreateUserSection from "./sections/CreateUserSection";
import DashboardModals from "./sections/DashboardModals";
import useAdminDashboard from "./sections/useAdminDashboard";
import { T } from "./sections/shared";

export default function AdminDashboard() {
  const {
    users, tasks, clients, projects, proposals, reminders,
    tab, setTab, toast, setToast, showPw, setShowPw,
    userForm, setUserForm, taskForm, setTaskForm, projectForm, setProjectForm, projectFormTab, setProjectFormTab, projectListTab, setProjectListTab,
    editTask, setEditTask, editTaskForm, setEditTaskForm,
    editUser, setEditUser, editUserForm, setEditUserForm, editProject, showEditPw, setShowEditPw,
    deleteTask, setDeleteTask, deleteUser, setDeleteUser, deleteProject, setDeleteProject,
    payUser, setPayUser, payingSalary, salaryForm, setSalaryForm, salaryPreview,
    attFilters, setAttFilters, attUsers, attError, attLoading, attRows,
    attPagination, attPage, setAttPage, selectedDayTotal, attSummary, attActiveNow,
    setAttFilter, computeRunning, handleExport,
    handleCreateUser, handleCreateTask, handleCreateProject, handleDownloadProjectsCsv,
    openCreateProject, openEditProject, cancelProjectForm,
    openEditTask, handleUpdateTask, handleDeleteTask,
    openEditUser, handleUpdateUser, handleDeleteUser,
    openPaySalary, handlePaySalary, handleDeleteProject, handleLogout,
    done, inProg, pend, completionRate, activeProjects, ongoingProjects,
    projectDueStats, projectAssignChartData, projectPlatformChartData, projectDueChartData,
    statusPieData, priorityBarData, activeUsersData, activeUserIds,
    tasksByUser, admins, regularUsers, TABS, currentLabel,
  } = useAdminDashboard();

  const renderSection = () => {
    switch (tab) {
      case "dashboard":
        return (
          <DashboardSection
            users={users}
            tasks={tasks}
            projects={projects}
            activeProjects={activeProjects}
            done={done}
            inProg={inProg}
            pend={pend}
            completionRate={completionRate}
            statusPieData={statusPieData}
            priorityBarData={priorityBarData}
            activeUsersData={activeUsersData}
            activeUserIds={activeUserIds}
            tasksByUser={tasksByUser}
            admins={admins}
            regularUsers={regularUsers}
          />
        );
      case "attendance":
        return (
          <AttendanceSection
            attFilters={attFilters}
            setAttFilter={setAttFilter}
            setAttFilters={setAttFilters}
            attUsers={attUsers}
            handleExport={handleExport}
            attError={attError}
            attLoading={attLoading}
            attRows={attRows}
            computeRunning={computeRunning}
            attPagination={attPagination}
            attPage={attPage}
            setAttPage={setAttPage}
            selectedDayTotal={selectedDayTotal}
            attSummary={attSummary}
            attActiveNow={attActiveNow}
          />
        );
      case "tasks":
        return <TasksSection tasks={tasks} setTab={setTab} openEditTask={openEditTask} setDeleteTask={setDeleteTask} />;
      case "clients":
        return <ClientsSection clients={clients} proposals={proposals} reminders={reminders} />;
      case "projects":
        return (
          <ProjectsSection
            projects={projects}
            openCreateProject={openCreateProject}
            handleDownloadProjectsCsv={handleDownloadProjectsCsv}
            projectAssignChartData={projectAssignChartData}
            projectPlatformChartData={projectPlatformChartData}
            projectDueChartData={projectDueChartData}
            ongoingProjects={ongoingProjects}
            setDeleteProject={setDeleteProject}
            openEditProject={openEditProject}
            activeProjectTab={projectListTab}
            setActiveProjectTab={setProjectListTab}
          />
        );
      case "users":
        return <UsersSection users={users} tasks={tasks} setTab={setTab} openEditUser={openEditUser} setDeleteUser={setDeleteUser} />;
      case "salary":
        return <SalarySection users={users} openPaySalary={openPaySalary} />;
      case "createTask":
        return <CreateTaskSection users={users} taskForm={taskForm} setTaskForm={setTaskForm} handleCreateTask={handleCreateTask} />;
      case "createProject":
        return (
          <CreateProjectSection
            projectForm={projectForm}
            setProjectForm={setProjectForm}
            projectFormTab={projectFormTab}
            setProjectFormTab={setProjectFormTab}
            handleCreateProject={handleCreateProject}
            cancelProjectForm={cancelProjectForm}
            isEditing={Boolean(editProject)}
          />
        );
      case "createUser":
        return (
          <CreateUserSection
            userForm={userForm}
            setUserForm={setUserForm}
            handleCreateUser={handleCreateUser}
            showPw={showPw}
            setShowPw={setShowPw}
          />
        );
      default:
        return null;
    }
  };

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
                    <button key={id} className={`nav-btn${active ? " nav-active" : ""}`} onClick={() => (id === "createProject" ? openCreateProject() : setTab(id))} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 12px", borderRadius: 9, textAlign: "left", color: active ? T.brand : T.textSecondary, background: active ? T.brandLight : "transparent", fontWeight: active ? 600 : 400, fontSize: 13.5, borderLeft: `3px solid ${active ? T.brand : "transparent"}` }}>
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
            {renderSection()}
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

        <DashboardModals
          users={users}
          editTask={editTask}
          setEditTask={setEditTask}
          editTaskForm={editTaskForm}
          setEditTaskForm={setEditTaskForm}
          handleUpdateTask={handleUpdateTask}
          editUser={editUser}
          setEditUser={setEditUser}
          editUserForm={editUserForm}
          setEditUserForm={setEditUserForm}
          showEditPw={showEditPw}
          setShowEditPw={setShowEditPw}
          handleUpdateUser={handleUpdateUser}
          payUser={payUser}
          setPayUser={setPayUser}
          payingSalary={payingSalary}
          salaryForm={salaryForm}
          setSalaryForm={setSalaryForm}
          salaryPreview={salaryPreview}
          handlePaySalary={handlePaySalary}
          deleteTask={deleteTask}
          setDeleteTask={setDeleteTask}
          handleDeleteTask={handleDeleteTask}
          deleteUser={deleteUser}
          setDeleteUser={setDeleteUser}
          handleDeleteUser={handleDeleteUser}
          deleteProject={deleteProject}
          setDeleteProject={setDeleteProject}
          handleDeleteProject={handleDeleteProject}
        />

      </div>
    </>
  );
}
