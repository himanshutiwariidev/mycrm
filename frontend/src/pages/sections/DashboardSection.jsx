import React from "react";
import { Users, ListTodo, Briefcase, CheckCheck, TrendingUp, Clock } from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { ChartCard, CustomTooltip, kpiGridStyle, KpiCard, PIE_COLORS, T } from "./shared";

export default function DashboardSection({
  users,
  tasks,
  totalTaskCount,
  projects,
/*   activeProjects, */
  done,
  inProg,
  pend,
  completionRate,
  statusPieData,
  priorityBarData,
  tasksByUser,
  admins,
  regularUsers,
}) {
  return (
    <div className="fade-up">
      <div style={{ ...kpiGridStyle, marginBottom: 26 }}>
        <KpiCard Icon={Users} label="Total Users" value={users.length} color="#f7931e" bgColor="#ffe2bd" />
        <KpiCard Icon={ListTodo} label="Total Tasks" value={totalTaskCount ?? tasks.length} color="#0891b2" bgColor="#d2fdff" />
{/*         <KpiCard Icon={Briefcase} label="Projects" value={projects.length} color="#0f766e" bgColor="#ccfbf1" sub={`${activeProjects} active`} />
 */}        <KpiCard Icon={CheckCheck} label="Completed" value={done} color={T.green} bgColor={T.greenBg} sub={`${completionRate}% rate`} />
        <KpiCard Icon={TrendingUp} label="In Progress" value={inProg} color={T.yellow} bgColor={T.yellowBg} />
        <KpiCard Icon={Clock} label="Pending" value={pend} color={T.pink} bgColor={T.pinkbg} />
      </div>

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
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(247, 147, 30,.05)" }} />
              <Bar dataKey="count" name="Tasks" radius={[8, 8, 0, 0]}>
                {priorityBarData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>
        <ChartCard title="User Task Load" subtitle="Assigned tasks by team member">
          {tasksByUser.length === 0 ? (
            <div style={{ height: 220, display: "grid", placeItems: "center", color: T.textMuted, fontSize: 13 }}>No user data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={tasksByUser} barSize={26} margin={{ top: 4, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.borderLight} vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(247, 147, 30,.05)" }} />
                <Bar dataKey="total" name="Tasks" radius={[6, 6, 0, 0]}>
                  {tasksByUser.map((_, i) => <Cell key={i} fill={i % 2 === 0 ? T.brand : T.brandMid} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
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
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(247, 147, 30,.05)" }} />
                <Legend iconType="circle" iconSize={8} />
                <Bar dataKey="total" name="Total" fill="#fed7aa" radius={[6, 6, 0, 0]} />
                <Bar dataKey="done" name="Completed" fill="#f7931e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {[
          { label: "Admin Users", value: admins, color: "#e8590c", bg: "#f5f3ff", desc: "Full system access" },
          { label: "Regular Users", value: regularUsers, color: "#0891b2", bg: "#ecfeff", desc: "Standard access" },
          { label: "Avg Tasks/User", value: regularUsers ? ((totalTaskCount ?? tasks.length) / regularUsers).toFixed(1) : "—", color: T.green, bg: T.greenBg, desc: "Tasks per regular user" },
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
  );
}
