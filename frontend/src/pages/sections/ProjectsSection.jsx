import React from "react";
import { Briefcase, Clock, Download, Globe2, KeyRound, Pencil, Plus, Trash2 } from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  ChartCard, CustomTooltip, IconBtn, KpiCard, PROJECT_TAB_FIELDS, PROJECT_TABS, PROJECT_TYPES, PROJECT_STATUS, T, fmtShortDate,
} from "./shared";

export default function ProjectsSection({
  projects,
  openCreateProject,
  handleDownloadProjectsCsv,
  projectAssignChartData,
  projectPlatformChartData,
  projectDueChartData,
  ongoingProjects,
  setDeleteProject,
  openEditProject,
  activeProjectTab,
  setActiveProjectTab,
}) {
  const selectedProjectTab = activeProjectTab || "allProjects";
  const getProjectCategory = (project) => {
    if (project.projectCategory && project.projectCategory !== "allProjects") return project.projectCategory;
    if (project.assignTo || project.technology) return "ongoingProjects";
    return project.projectCategory || "allProjects";
  };
  const projectTabCounts = PROJECT_TABS.reduce((acc, tab) => {
    acc[tab.id] = projects.filter(project => getProjectCategory(project) === tab.id).length;
    return acc;
  }, {});
  const filteredProjects = projects.filter(project => getProjectCategory(project) === selectedProjectTab);
  const tableFields = selectedProjectTab === "allProjects"
    ? [...PROJECT_TAB_FIELDS.allProjects, { key: "status", label: "Status", type: "status" }]
    : selectedProjectTab === "credentials"
      ? [
        ...PROJECT_TAB_FIELDS.credentials,
        { key: "credentialType", label: "Type", type: "credentialColumn" },
        { key: "userId", label: "ID", type: "credentialColumn" },
        { key: "password", label: "Password", type: "credentialColumn" },
      ]
      : PROJECT_TAB_FIELDS[selectedProjectTab];
  const textCell = (value) => value || "-";
  const getCredentials = (project) => {
    if (project.credentials?.length) return project.credentials;
    if (project.credentialType || project.userId || project.password) {
      return [{ credentialType: project.credentialType, userId: project.userId, password: project.password }];
    }
    return [];
  };
  const renderCell = (project, field) => {
    if (field.type === "date") return fmtShortDate(project[field.key]);
    if (field.type === "credentialColumn") {
      const credentials = getCredentials(project);
      if (!credentials.length) return "-";
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {credentials.map((credential, index) => (
            <span key={index} style={{ color: field.key === "credentialType" ? T.textPrimary : T.textSecondary, fontWeight: field.key === "credentialType" ? 700 : 400 }}>
              {credential[field.key] || (field.key === "credentialType" ? "Credential" : "-")}
            </span>
          ))}
        </div>
      );
    }
    if (field.key === "status") {
      const sm = PROJECT_STATUS[project.status] || PROJECT_STATUS.Active;
      return (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, padding: "5px 10px", borderRadius: 8, color: sm.color, background: sm.bg, border: `1px solid ${sm.border}` }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: sm.color, flexShrink: 0 }} />
          {sm.label}
        </span>
      );
    }
    if (field.key === "businesstype") {
      const bt = PROJECT_TYPES[project.businesstype] || PROJECT_TYPES.Service;
      return (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, padding: "5px 10px", borderRadius: 8, color: bt.color, background: bt.bg, border: `1px solid ${bt.border}` }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: bt.color, flexShrink: 0 }} />
          {bt.label}
        </span>
      );
    }
    return textCell(project[field.key]);
  };

  return (
    <div className="fade-up">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 19, color: T.textPrimary }}>Project Management</h2>
          <p style={{ fontSize: 12.5, color: T.textMuted, marginTop: 3 }}>{projects.length} saved project{projects.length !== 1 ? "s" : ""}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={() => handleDownloadProjectsCsv(selectedProjectTab)}
            disabled={filteredProjects.length === 0}
            style={{
              display: "flex", alignItems: "center", gap: 7, padding: "9px 16px",
              background: filteredProjects.length === 0 ? T.slateBg : "#fff",
              color: filteredProjects.length === 0 ? T.textMuted : T.teal,
              border: `1.5px solid ${filteredProjects.length === 0 ? T.slateBorder : "#99f6e4"}`,
              borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: filteredProjects.length === 0 ? "not-allowed" : "pointer",
              fontFamily: "inherit",
            }}
          >
            <Download size={15} strokeWidth={2.2} /> Download CSV
          </button>
          <button className="pri-btn" onClick={openCreateProject} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", background: "linear-gradient(135deg, #0f766e, #0891b2)", color: "#fff", borderRadius: 10, fontSize: 13, fontWeight: 600 }}>
            <Plus size={15} strokeWidth={2.5} /> Add Project
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 20 }}>
        <KpiCard Icon={Briefcase} label="Live Projects" value={projectTabCounts.allProjects || 0} color="#0f766e" bgColor="#ccfbf1" />
        <KpiCard Icon={Clock} label="Ongoing Projects" value={ongoingProjects} color={T.green} bgColor={T.greenBg} />
        <KpiCard Icon={KeyRound} label="Credentials" value={projectTabCounts.credentials || 0} color="#d97706" bgColor="#fffbeb" />
        <KpiCard Icon={Globe2} label="Domain Details" value={projectTabCounts.domainDetails || 0} color="#0891b2" bgColor="#ecfeff" />
      </div>

      {projects.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>
          <ChartCard title="Project Assign To" subtitle="Project distribution by assignee">
            {projectAssignChartData.length === 0 ? (
              <div style={{ height: 240, display: "grid", placeItems: "center", color: T.textMuted, fontSize: 13 }}>No assigned project data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={projectAssignChartData} cx="50%" cy="50%" innerRadius={58} outerRadius={94} paddingAngle={3} dataKey="value">
                    {projectAssignChartData.map((entry, i) => <Cell key={i} fill={entry.fill} strokeWidth={0} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" iconSize={8} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Projects by Platform" subtitle="Platform split across saved projects">
            {projectPlatformChartData.length === 0 ? (
              <div style={{ height: 240, display: "grid", placeItems: "center", color: T.textMuted, fontSize: 13 }}>No platform data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={projectPlatformChartData} barSize={28} margin={{ top: 4, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.borderLight} vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(15,118,110,.06)" }} />
                  <Bar dataKey="count" name="Projects" radius={[8, 8, 0, 0]}>
                    {projectPlatformChartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Upcoming Due Dates" subtitle="Website and domain due items in the next 30 days" style={{ gridColumn: "1 / -1" }}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={projectDueChartData} barSize={34} margin={{ top: 4, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.borderLight} vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(79,70,229,.05)" }} />
                <Bar dataKey="count" name="Items" radius={[8, 8, 0, 0]}>
                  {projectDueChartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        {PROJECT_TABS.map(tab => {
          const isActive = selectedProjectTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveProjectTab(tab.id)}
              style={{
                padding: "9px 14px",
                borderRadius: 9,
                border: `1.5px solid ${isActive ? T.brandMid : T.border}`,
                background: isActive ? T.brandLight : "#fff",
                color: isActive ? T.brand : T.textSecondary,
                fontSize: 12.5,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {tab.label} ({projectTabCounts[tab.id] || 0})
            </button>
          );
        })}
      </div>

      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,.04)", overflow: "hidden" }}>
        {filteredProjects.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <Briefcase size={48} strokeWidth={1} color={T.textMuted} style={{ margin: "0 auto 16px", display: "block" }} />
            <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 17, color: T.textSecondary }}>No data saved in this tab yet</p>
            <p style={{ fontSize: 13, color: T.textMuted, marginTop: 6 }}>Use Add Project to save details for this project tab.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: Math.max(760, tableFields.length * 150), borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: T.bg }}>
                  {tableFields.map(field => (
                    <th key={field.key} style={{ textAlign: "left", padding: "11px 14px", borderBottom: `1px solid ${T.border}`, fontSize: 10.5, fontWeight: 700, letterSpacing: ".09em", textTransform: "uppercase", color: T.textMuted, whiteSpace: "nowrap" }}>{field.label}</th>
                  ))}
                  <th style={{ textAlign: "left", padding: "11px 14px", borderBottom: `1px solid ${T.border}`, fontSize: 10.5, fontWeight: 700, letterSpacing: ".09em", textTransform: "uppercase", color: T.textMuted, whiteSpace: "nowrap" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProjects.map((project, i) => (
                  <tr key={project._id} className="att-row" style={{ background: i % 2 === 0 ? "#fff" : T.bg, borderBottom: `1px solid ${T.borderLight}` }}>
                    {tableFields.map(field => (
                      <td key={field.key} style={{ padding: "13px 14px", color: field.key === "companyName" ? T.textPrimary : T.textSecondary, fontWeight: field.key === "companyName" ? 700 : 400, whiteSpace: "nowrap" }}>
                        {renderCell(project, field)}
                      </td>
                    ))}
                      <td style={{ padding: "13px 14px", whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <IconBtn icon={Pencil} color="#4f46e5" bg="#eef2ff" hoverBg="#c7d2fe" onClick={() => openEditProject(project)} title="Update project" />
                          <IconBtn icon={Trash2} color={T.red} bg={T.redBg} hoverBg={T.redBorder} onClick={() => setDeleteProject(project)} title="Delete project" />
                        </div>
                      </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
