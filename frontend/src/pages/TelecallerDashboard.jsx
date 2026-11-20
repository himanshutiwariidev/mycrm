import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { LogOut, LayoutDashboard, Users, History, CalendarCheck } from "lucide-react";
import API from "../services/api";
import logo from "../assets/logo.png";
import TelecallerOverview from "./telecaller/TelecallerOverview";
import LeadsSection from "./telecaller/LeadsSection";
import CallHistorySection from "./telecaller/CallHistorySection";
import BookedMeetingsSection from "./telecaller/BookedMeetingsSection";
import LeadFormModal from "./telecaller/LeadFormModal";
import LogCallModal from "./telecaller/LogCallModal";
import { Avatar } from "./telecaller/teleUi";
import "./SalesDashboard.css";

const VIEWS = [
  { id: "overview", label: "Overview", Icon: LayoutDashboard },
  { id: "leads", label: "Leads", Icon: Users },
  { id: "calls", label: "Call History", Icon: History },
  { id: "meetings", label: "Meetings", Icon: CalendarCheck },
];

/**
 * Telecaller panel: work a calling list, log every call with the client's
 * response, plan follow-ups, and book meetings for the sales team.
 */
export default function TelecallerDashboard() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const view = VIEWS.some((v) => v.id === params.get("view")) ? params.get("view") : "overview";
  const leadFilter = params.get("filter") || "all";
  const userName = localStorage.getItem("userName") || "";

  const [callLead, setCallLead] = useState(null);
  const [leadForm, setLeadForm] = useState(null); // {} = new, lead = edit
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey((k) => k + 1);

  const go = (id, extra = {}) => setParams({ view: id, ...extra }, { replace: true });

  const logout = async () => {
    try { await API.post("/users/logout"); } catch { /* log out locally regardless */ }
    localStorage.clear();
    navigate("/");
  };

  const shared = { refreshKey, onLogCall: setCallLead, onAddLead: () => setLeadForm({}), onEditLead: setLeadForm };

  return (
    <div style={{ minHeight: "100vh", background: "#f5f6fa" }}>
      <div style={{ position: "sticky", top: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 24px", background: "rgba(255,255,255,0.92)", backdropFilter: "blur(10px)", borderBottom: "1px solid #e8eaf0" }}>
        <img src={logo} alt="Bharat Bizmart" style={{ height: 30, width: "auto", display: "block" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Avatar name={userName} size={34} />
            <div style={{ lineHeight: 1.2 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{userName || "Telecaller"}</div>
              <div style={{ fontSize: 11.5, color: "#94a3b8" }}>Telecaller</div>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            title="Sign out"
            style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", border: "1px solid rgba(220,38,38,0.3)", background: "rgba(220,38,38,0.06)", color: "#dc2626", padding: "8px 12px", borderRadius: 10, fontWeight: 600, fontFamily: "inherit", fontSize: 13 }}
          >
            <LogOut size={15} /> Logout
          </button>
        </div>
      </div>

      <nav className="sales-tabs" aria-label="Telecaller sections">
        {VIEWS.map(({ id, label, Icon }) => (
          <button key={id} type="button" className={`sales-tab${view === id ? " active" : ""}`} aria-current={view === id ? "page" : undefined} onClick={() => go(id)}>
            <Icon size={15} strokeWidth={2} /> {label}
          </button>
        ))}
      </nav>

      <main className="sales-overview">
        {view === "overview" && <TelecallerOverview {...shared} userName={userName} onOpenLeads={(filter) => go("leads", { filter })} />}
        {view === "leads" && <LeadsSection {...shared} initialFilter={leadFilter} />}
        {view === "calls" && <CallHistorySection refreshKey={refreshKey} />}
        {view === "meetings" && <BookedMeetingsSection refreshKey={refreshKey} />}
      </main>

      {callLead && <LogCallModal lead={callLead} onClose={() => setCallLead(null)} onLogged={() => { setCallLead(null); refresh(); }} />}
      {leadForm && (
        <LeadFormModal
          lead={leadForm._id ? leadForm : null}
          onClose={() => setLeadForm(null)}
          onSaved={() => { setLeadForm(null); refresh(); }}
        />
      )}
    </div>
  );
}
