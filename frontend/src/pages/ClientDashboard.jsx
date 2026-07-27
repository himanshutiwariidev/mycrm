import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Package, Wallet, LogOut, AlertTriangle, Building2, TrendingUp } from "lucide-react";
import { getMyProject, getWorkProgress } from "../services/clientApi";
import logo from "../assets/logo.png";
import "./ClientDashboard.css";

const STATUS_COLORS = {
  Pending: "#94a3b8",
  "In Progress": "#d97706",
  Completed: "#16a34a",
};

const PROGRESS_STATUS_COLORS = {
  "Pending": "#94a3b8",
  "In Progress": "#2563eb",
  "On Hold": "#d97706",
  "Waiting for Client": "#7c3aed",
  "Completed": "#16a34a",
};

export default function ClientDashboard() {
  const [data, setData] = useState(null);
  const [latestProgress, setLatestProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const response = await getMyProject();
        setData(response.data);
        const clientId = response.data?.client?.id;
        if (clientId) {
          try {
            const progressRes = await getWorkProgress(clientId);
            setLatestProgress(progressRes.data?.workProgress?.[0] || null);
          } catch {
            setLatestProgress(null);
          }
        }
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  if (loading) {
    return <div className="client-dashboard-loading">Loading your dashboard...</div>;
  }

  if (error) {
    return <div className="client-dashboard-loading">{error}</div>;
  }

  const projects = data?.projects || [];

  return (
    <div className="client-dashboard">
      <header className="client-dashboard-header">
        <div className="client-header-brand">
          <img src={logo} alt="Bharat Bizmart" className="client-header-logo" />
          <div className="client-header-divider" />
          <div>
            <h1>Welcome, {data?.client?.clientName}</h1>
            <p><Building2 size={13} strokeWidth={2} /> {data?.client?.companyName}</p>
          </div>
        </div>
        <button onClick={handleLogout}><LogOut size={15} strokeWidth={2} /> Sign Out</button>
      </header>

      {latestProgress && (
        <div className="client-project-card">
          <div className="client-card">
            <h3><TrendingUp size={15} strokeWidth={2} color="#f7931e" /> Latest Update</h3>
            <div className="client-deliverable-row">
              <div className="client-deliverable-top">
                <span>{latestProgress.title}</span>
                <span
                  className="client-status-pill"
                  style={{
                    color: PROGRESS_STATUS_COLORS[latestProgress.status] || "#94a3b8",
                    background: `${PROGRESS_STATUS_COLORS[latestProgress.status] || "#94a3b8"}1a`,
                  }}
                >
                  {latestProgress.status}
                </span>
              </div>
              {latestProgress.description && (
                <p className="client-dashboard-muted" style={{ margin: "4px 0 8px" }}>{latestProgress.description}</p>
              )}
              <div className="client-progress-bar">
                <div
                  className="client-progress-fill"
                  style={{ width: `${latestProgress.percentage || 0}%`, background: PROGRESS_STATUS_COLORS[latestProgress.status] || "#94a3b8" }}
                />
              </div>
              <div className="client-deliverable-meta">
                {latestProgress.percentage || 0}% complete · {new Date(latestProgress.createdAt).toLocaleDateString("en-IN")}
              </div>
            </div>
          </div>
        </div>
      )}

      {projects.length === 0 ? (
        <div className="client-dashboard-empty">No active projects yet.</div>
      ) : (
        projects.map((project) => {
          const isOverdue = project.isOverdue;
          const paidPercent = project.projectAmount > 0
            ? Math.min(100, Math.round((project.receivedAmount / project.projectAmount) * 100))
            : 0;

          return (
            <div className="client-project-card" key={project.id}>
              <h2>{project.projectName}</h2>

              <div className="client-card">
                <h3><Package size={15} strokeWidth={2} color="#f7931e" /> Scope of Work</h3>
                {!project.deliverables?.length ? (
                  <p className="client-dashboard-muted">No deliverables defined yet.</p>
                ) : (
                  <div className="client-deliverables">
                    {project.deliverables.map((item) => {
                      const isRecurring = item.frequency === "week" || item.frequency === "month";
                      const due = item.due ?? item.quantity;
                      const delivered = item.delivered || 0;
                      const pending = item.pending ?? Math.max(0, due - delivered);
                      const progress = due > 0 ? Math.min(100, Math.round((delivered / due) * 100)) : 0;

                      return (
                        <div className="client-deliverable-row" key={item._id}>
                          <div className="client-deliverable-top">
                            <span>
                              {item.title}
                              {isRecurring && <span className="client-frequency-badge">{item.quantity}/{item.frequency}</span>}
                            </span>
                            <span className="client-status-pill" style={{ color: STATUS_COLORS[item.status], background: `${STATUS_COLORS[item.status]}1a` }}>{item.status}</span>
                          </div>
                          <div className="client-progress-bar">
                            <div className="client-progress-fill" style={{ width: `${progress}%`, background: STATUS_COLORS[item.status] }} />
                          </div>
                          <div className="client-deliverable-meta">
                            Completed: {delivered} / {due} · Pending: {pending} ({progress}%)
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="client-card">
                <h3><Wallet size={15} strokeWidth={2} color="#f7931e" /> Payment Overview</h3>
                <div className="client-payment-grid">
                  <div>
                    <span className="client-payment-label">Project Amount</span>
                    <span className="client-payment-value">₹{(project.projectAmount || 0).toLocaleString("en-IN")}</span>
                  </div>
                  <div>
                    <span className="client-payment-label">Paid</span>
                    <span className="client-payment-value" style={{ color: "#16a34a" }}>₹{(project.receivedAmount || 0).toLocaleString("en-IN")}</span>
                  </div>
                  <div>
                    <span className="client-payment-label">Pending</span>
                    <span className="client-payment-value" style={{ color: "#d97706" }}>₹{(project.dueAmount || 0).toLocaleString("en-IN")}</span>
                  </div>
                  <div>
                    <span className="client-payment-label">Due Date</span>
                    <span className="client-payment-value">
                      {project.nextDueDate ? new Date(project.nextDueDate).toLocaleDateString("en-IN") : "N/A"}
                    </span>
                  </div>
                </div>
                <div className="client-progress-bar" style={{ marginTop: 14 }}>
                  <div className="client-progress-fill" style={{ width: `${paidPercent}%`, background: "linear-gradient(135deg, #f7931e, #e8590c)" }} />
                </div>
                <div className="client-deliverable-meta">{paidPercent}% Paid</div>
                {isOverdue && <span className="client-overdue-badge"><AlertTriangle size={12} strokeWidth={2.2} /> Payment Overdue</span>}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
