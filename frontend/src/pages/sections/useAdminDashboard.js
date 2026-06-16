import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Briefcase, Building2, ClipboardList, Clock,
  LayoutDashboard, Plus, UserPlus, Users,
} from "lucide-react";
import API from "../../services/api";
import {
  PROJECT_CHART_COLORS,
  PROJECT_EMPTY_FORM,
  PROJECT_TAB_FIELDS,
  PROJECT_TAB_LABELS,
  PRIORITY_COLORS,
  daysUntil,
  escapeCsvValue,
  fmtMin,
  formatCsvDate,
  listFromResponse,
} from "./shared";

export default function useAdminDashboard() {
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [tasksState, setTasks] = useState([]);
  const [clients, setClients] = useState([]);
  const [projectsState, setProjects] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [tab, setTab] = useState("dashboard");
  const [toast, setToast] = useState(null);
  const [showPw, setShowPw] = useState(false);

  const [userForm, setUserForm] = useState({ name: "", email: "", password: "", role: "user" });
  const [taskForm, setTaskForm] = useState({ title: "", description: "", assignedTo: "", priority: "medium", dueDate: "" });
  const [projectForm, setProjectForm] = useState(PROJECT_EMPTY_FORM);
  const [projectFormTab, setProjectFormTab] = useState("allProjects");
  const [projectListTab, setProjectListTab] = useState("allProjects");

  const [editTask, setEditTask] = useState(null);
  const [editTaskForm, setEditTaskForm] = useState({});
  const [editUser, setEditUser] = useState(null);
  const [editUserForm, setEditUserForm] = useState({});
  const [editProject, setEditProject] = useState(null);
  const [showEditPw, setShowEditPw] = useState(false);

  const [deleteTask, setDeleteTask] = useState(null);
  const [deleteUser, setDeleteUser] = useState(null);
  const [deleteProject, setDeleteProject] = useState(null);
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

  const tasks = Array.isArray(tasksState) ? tasksState : [];
  const projects = Array.isArray(projectsState) ? projectsState : [];

  const [attRows, setAttRows] = useState([]);
  const [attUsers, setAttUsers] = useState([]);
  const [attLoading, setAttLoading] = useState(false);
  const [attPage, setAttPage] = useState(1);
  const [attPagination, setAttPagination] = useState({ totalPages: 1, total: 0 });
  const [attSummary, setAttSummary] = useState({
    perDay: [],
    monthlyTotalMinutes: 0,
    todayOverallMinutes: 0,
    overallDate: "",
  });
  const [attTick, setAttTick] = useState(Date.now());
  const [attError, setAttError] = useState("");
  const [stopPolling, setStopPolling] = useState(false);
  const [attFilters, setAttFilters] = useState({
    date: "",
    userId: "",
    status: "",
    month: new Date().toISOString().slice(0, 7),
  });

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchUsers = async () => { try { const { data } = await API.get("/users"); setUsers(listFromResponse(data, "users")); } catch { /* dashboard keeps partial data when a widget fails */ } };
  const fetchTasks = async () => { try { const { data } = await API.get("/tasks"); setTasks(listFromResponse(data, "tasks")); } catch { /* dashboard keeps partial data when a widget fails */ } };
  const fetchClients = async () => { try { const { data } = await API.get("/clients"); setClients(listFromResponse(data, "clients")); } catch { /* dashboard keeps partial data when a widget fails */ } };
  const fetchProjects = async () => { try { const { data } = await API.get("/projects"); setProjects(listFromResponse(data, "projects")); } catch { /* dashboard keeps partial data when a widget fails */ } };
  const fetchProposals = async () => { try { const { data } = await API.get("/clients/proposals/all"); setProposals(listFromResponse(data, "proposals")); } catch { /* dashboard keeps partial data when a widget fails */ } };
  const fetchReminders = async () => { try { const { data } = await API.get("/clients/reminders/all"); setReminders(listFromResponse(data, "reminders")); } catch { /* dashboard keeps partial data when a widget fails */ } };

  useEffect(() => { fetchUsers(); fetchTasks(); fetchClients(); fetchProjects(); fetchProposals(); fetchReminders(); }, []);

  const attParams = useMemo(() => ({
    page: attPage,
    limit: 10,
    date: attFilters.date || undefined,
    userId: attFilters.userId || undefined,
    status: attFilters.status || undefined,
    month: attFilters.month || undefined,
  }), [attFilters, attPage]);

  const fetchAttUsers = async () => {
    try {
      const { data } = await API.get("/users");
      setAttUsers(listFromResponse(data, "users").filter(u => u.role === "user"));
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
      setAttError("");
      setStopPolling(false);
    } catch (err) {
      const s = err?.response?.status;
      if (s === 404) setAttError("Attendance API route not found. Restart backend.");
      else if (s === 401 || s === 403) { setAttError("Not authorized to view attendance."); setStopPolling(true); }
      else setAttError("Failed to load attendance records.");
      setAttRows([]);
    } finally {
      setAttLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const res = await API.get("/attendance/export/excel", { params: attParams, responseType: "blob" });
      const ct = res.headers?.["content-type"] || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      const ext = ct.includes("csv") ? "csv" : "xlsx";
      const url = window.URL.createObjectURL(new Blob([res.data], { type: ct }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendance-${new Date().toISOString().slice(0, 10)}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setAttError("Failed to export attendance.");
    }
  };

  useEffect(() => { fetchAttUsers(); }, []);
  useEffect(() => { fetchAttendance(); }, [attParams]);
  useEffect(() => { const id = setInterval(() => setAttTick(Date.now()), 1000); return () => clearInterval(id); }, []);

  useEffect(() => {
    if (stopPolling) return undefined;
    const pollId = setInterval(fetchAttendance, 15000);
    const io = typeof window !== "undefined" ? window.io : null;
    let socket = null;
    if (io) {
      socket = io("https://crm.cybertricksmedia.in", { transports: ["websocket"] });
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

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await API.post("/users", userForm);
      showToast("User created successfully");
      setUserForm({ name: "", email: "", password: "", role: "user" });
      fetchUsers();
    } catch (error) {
      showToast(error?.response?.data?.message || "Failed to create user", false);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      await API.post("/tasks", taskForm);
      showToast("Task created successfully");
      setTaskForm({ title: "", description: "", assignedTo: "", priority: "medium", dueDate: "" });
      fetchTasks();
    } catch {
      showToast("Failed to create task", false);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    const normalizedCredentials = (projectForm.credentials || [])
      .map(credential => ({
        credentialType: credential.credentialType || "",
        userId: credential.userId || "",
        password: credential.password || "",
      }))
      .filter(credential => credential.credentialType || credential.userId || credential.password);
    const payload = {
      ...projectForm,
      projectCategory: projectFormTab || projectForm.projectCategory || "allProjects",
      credentials: normalizedCredentials,
      credentialType: normalizedCredentials[0]?.credentialType || projectForm.credentialType || "",
      userId: normalizedCredentials[0]?.userId || projectForm.userId || "",
      password: normalizedCredentials[0]?.password || projectForm.password || "",
    };

    try {
      if (editProject) {
        await API.put(`/projects/${editProject._id}`, payload);
        showToast("Project updated successfully");
      } else {
        await API.post("/projects", payload);
        showToast("Project saved successfully");
      }
      setEditProject(null);
      setProjectForm(PROJECT_EMPTY_FORM);
      setProjectFormTab("allProjects");
      setProjectListTab(payload.projectCategory);
      fetchProjects();
      setTab("projects");
    } catch (error) {
      showToast(error?.response?.data?.message || (editProject ? "Failed to update project" : "Failed to save project"), false);
    }
  };

  const openCreateProject = () => {
    setEditProject(null);
    setProjectForm({ ...PROJECT_EMPTY_FORM, projectCategory: "allProjects" });
    setProjectFormTab("allProjects");
    setTab("createProject");
  };

  const openEditProject = (project) => {
    const toDateInput = (value) => {
      if (!value) return "";
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return "";
      return date.toISOString().slice(0, 10);
    };

    setEditProject(project);
    const projectCategory = project.projectCategory || "allProjects";
    const credentials = project.credentials?.length
      ? project.credentials.map(credential => ({
        credentialType: credential.credentialType || "",
        userId: credential.userId || "",
        password: credential.password || "",
      }))
      : [{ credentialType: project.credentialType || "", userId: project.userId || "", password: project.password || "" }];
    setProjectFormTab(projectCategory);
    setProjectForm({
      projectCategory,
      companyName: project.companyName || "",
      domain: project.domain || "",
      handoverdate: toDateInput(project.handoverdate),
      salesPerson: project.salesPerson || "",
      businesstype: project.businesstype || "",
      assignTo: project.assignTo || "",
      technology: project.technology || "",
      deployedDate: toDateInput(project.deployedDate),
      developer: project.developer || "",
      websiteDueDate: toDateInput(project.websiteDueDate),
      domainDueDate: toDateInput(project.domainDueDate),
      platform: project.platform || "",
      domainProvider: project.domainProvider || "",
      hostingProvider: project.hostingProvider || "",
      domainOwnership: project.domainOwnership || "",
      hostingOwnership: project.hostingOwnership || "",
      status: project.status || "Active",
      userId: project.userId || "",
      password: project.password || "",
      credentialType: project.credentialType || "",
      credentials,
    });
    setTab("createProject");
  };

  const cancelProjectForm = () => {
    setEditProject(null);
    setProjectForm(PROJECT_EMPTY_FORM);
    setProjectFormTab("allProjects");
    setTab("projects");
  };

  const handleDownloadProjectsCsv = (selectedProjectTab = "allProjects") => {
    const getProjectCategory = (project) => {
      if (project.projectCategory && project.projectCategory !== "allProjects") return project.projectCategory;
      if (project.assignTo || project.technology) return "ongoingProjects";
      return project.projectCategory || "allProjects";
    };
    const projectsToExport = projects.filter(project => getProjectCategory(project) === selectedProjectTab);
    const tabLabel = PROJECT_TAB_LABELS[selectedProjectTab] || "Projects";

    if (!projectsToExport.length) {
      showToast(`No ${tabLabel.toLowerCase()} available to export`, false);
      return;
    }

    const formatCredentialsForCsv = (project) => {
      const credentials = project.credentials?.length
        ? project.credentials
        : project.credentialType || project.userId || project.password
          ? [{ credentialType: project.credentialType, userId: project.userId, password: project.password }]
          : [];
      return credentials
        .map(credential => [credential.credentialType, credential.userId, credential.password].filter(Boolean).join(" - "))
        .filter(Boolean)
        .join(" | ");
    };
    const exportFields = [
      { key: "projectCategory", label: "Project Tab" },
      ...(PROJECT_TAB_FIELDS[selectedProjectTab] || PROJECT_TAB_FIELDS.allProjects),
      ...(selectedProjectTab === "allProjects" ? [{ key: "status", label: "Status" }] : []),
      ...(selectedProjectTab === "credentials" ? [{ key: "credentials", label: "Credentials" }] : []),
    ];

    const header = exportFields.map(field => escapeCsvValue(field.label)).join(",");
    const rows = projectsToExport.map(project => exportFields.map(field => {
      let rawValue = project[field.key];
      if (field.key === "projectCategory") rawValue = PROJECT_TAB_LABELS[project.projectCategory] || project.projectCategory;
      if (field.key === "credentials") rawValue = formatCredentialsForCsv(project);
      const value = field.type === "date" ? formatCsvDate(rawValue) : rawValue;
      return escapeCsvValue(value);
    }).join(","));
    const csv = [header, ...rows].join("\r\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${tabLabel.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    showToast(`${tabLabel} CSV downloaded`);
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

  const openEditUser = (user) => {
    setEditUser(user);
    setEditUserForm({ name: user.name || "", email: user.email || "", role: user.role || "user", password: "" });
    setShowEditPw(false);
  };

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

  const handleDeleteProject = async () => {
    try { await API.delete(`/projects/${deleteProject._id}`); showToast("Project deleted"); setDeleteProject(null); fetchProjects(); }
    catch { showToast("Failed to delete project", false); }
  };

  const handleLogout = async () => {
    try { await API.post("/users/logout"); } catch { /* local logout should continue if API logout fails */ }
    localStorage.clear();
    navigate("/");
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
    const daysInMonth = match ? new Date(Number(match[1]), Number(match[2]), 0).getDate() : 30;
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

  const done = tasks.filter(t => t.status === "completed").length;
  const inProg = tasks.filter(t => t.status === "in-progress").length;
  const pend = tasks.filter(t => !t.status || t.status === "pending").length;
  const admins = users.filter(u => u.role === "admin").length;
  const regularUsers = users.filter(u => u.role === "user").length;
  const completionRate = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const activeProjects = projects.filter(p => p.status === "Active").length;

  const getProjectCategory = (project) => {
    if (project.projectCategory && project.projectCategory !== "allProjects") return project.projectCategory;
    if (project.assignTo || project.technology) return "ongoingProjects";
    return project.projectCategory || "allProjects";
  };

  const ongoingProjects = projects.filter(project => getProjectCategory(project) === "ongoingProjects").length;

  const projectDueStats = projects.reduce((stats, project) => {
    const websiteDays = daysUntil(project.websiteDueDate);
    const domainDays = daysUntil(project.domainDueDate);
    if (websiteDays !== null && websiteDays < 0) stats.overdue += 1;
    if (domainDays !== null && domainDays < 0) stats.overdue += 1;
    if (websiteDays !== null && websiteDays >= 0 && websiteDays <= 30) stats.websiteDueSoon += 1;
    if (domainDays !== null && domainDays >= 0 && domainDays <= 30) stats.domainDueSoon += 1;
    return stats;
  }, { websiteDueSoon: 0, domainDueSoon: 0, overdue: 0 });

  const projectAssignChartData = Object.entries(
    projects.reduce((acc, project) => {
      const assignee = (project.assignTo || "").trim();
      if (!assignee) return acc;
      acc[assignee] = (acc[assignee] || 0) + 1;
      return acc;
    }, {})
  )
    .map(([name, value], i) => ({ name, value, fill: PROJECT_CHART_COLORS[i % PROJECT_CHART_COLORS.length] }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const projectPlatformChartData = Object.entries(
    projects.reduce((acc, project) => {
      const platform = (project.platform || project.technology || "").trim();
      if (!platform) return acc;
      acc[platform] = (acc[platform] || 0) + 1;
      return acc;
    }, {})
  )
    .map(([name, count], i) => ({ name, count, fill: PROJECT_CHART_COLORS[i % PROJECT_CHART_COLORS.length] }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const projectDueChartData = [
    { name: "Website Due", count: projectDueStats.websiteDueSoon, fill: "#0891b2" },
    { name: "Domain Due", count: projectDueStats.domainDueSoon, fill: "#d97706" },
    { name: "Overdue", count: projectDueStats.overdue, fill: "#dc2626" },
  ];

  const statusPieData = [
    { name: "Completed", value: done },
    { name: "In Progress", value: inProg },
    { name: "Pending", value: pend },
  ].filter(d => d.value > 0);

  const priorityBarData = [
    { name: "Low", count: tasks.filter(t => t.priority === "low").length, fill: PRIORITY_COLORS.low },
    { name: "Medium", count: tasks.filter(t => t.priority === "medium").length, fill: PRIORITY_COLORS.medium },
    { name: "High", count: tasks.filter(t => t.priority === "high").length, fill: PRIORITY_COLORS.high },
  ];

  const tasksByUser = users
    .filter(u => u.role === "user")
    .map(u => ({
      name: u.name?.split(" ")[0] || "?",
      total: tasks.filter(t => t.assignedTo?._id === u._id || t.assignedTo === u._id).length,
      done: tasks.filter(t => (t.assignedTo?._id === u._id || t.assignedTo === u._id) && t.status === "completed").length,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);

  const activeUserIds = new Set(attRows.filter(r => r.status === "Active").map(r => r.userId?._id || r.userId));
  const activeUsersData = users
    .filter(u => u.role === "user")
    .map(u => ({
      name: u.name?.split(" ")[0] || "?",
      isActive: activeUserIds.has(u._id),
      tasks: tasks.filter(t => t.assignedTo?._id === u._id || t.assignedTo === u._id).length,
    }))
    .sort((a, b) => b.isActive - a.isActive || b.tasks - a.tasks)
    .slice(0, 8);

  const role = localStorage.getItem("role") || "";

  const ROLE_TABS = {
    hr: [
      { id: "attendance", label: "Attendance", Icon: Clock, section: "overview" },
      { id: "users", label: "Users", Icon: Users, section: "overview" },
      { id: "salary", label: "Salary", Icon: Briefcase, section: "manage" },
      { id: "createUser", label: "New User", Icon: UserPlus, section: "manage" },
    ],
    sales: [
      { id: "clients", label: "Clients", Icon: Building2, section: "overview" },
    ],
  };

  const TABS = ROLE_TABS[role] || [
    // fallback to admin-like access if role is missing/unknown
    { id: "dashboard", label: "Dashboard", Icon: LayoutDashboard, section: "overview" },
    { id: "attendance", label: "Attendance", Icon: Clock, section: "overview" },
    { id: "tasks", label: "All Tasks", Icon: ClipboardList, section: "overview" },
    { id: "users", label: "All Users", Icon: Users, section: "overview" },
    { id: "clients", label: "Clients", Icon: Building2, section: "overview" },
    { id: "projects", label: "Projects", Icon: Briefcase, section: "overview" },
    { id: "salary", label: "Salary", Icon: Briefcase, section: "manage" },
    { id: "createTask", label: "New Task", Icon: Plus, section: "manage" },
    { id: "createProject", label: "New Project", Icon: Plus, section: "manage" },
    { id: "createUser", label: "New User", Icon: UserPlus, section: "manage" },
  ];

  const currentLabel = TABS.find(t => t.id === tab)?.label || "Dashboard";
  const attActiveNow = attRows.filter(r => r.status === "Active").length;

  return {
    users, tasks, clients, projects, proposals, reminders,
    tab, setTab, toast, setToast, showPw, setShowPw,
    userForm, setUserForm, taskForm, setTaskForm, projectForm, setProjectForm, projectFormTab, setProjectFormTab, projectListTab, setProjectListTab,
    editTask, setEditTask, editTaskForm, setEditTaskForm,
    editUser, setEditUser, editUserForm, setEditUserForm, editProject, setEditProject, showEditPw, setShowEditPw,
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
  };
}
