import React, { useEffect } from "react";
import { LogOut, Users, CalendarCheck, Building2, MapPin, Headset, Navigation } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import API from "../services/api";
import ClientsPage from "./ClientsPage";
import SalesTeamSection from "./sections/SalesTeamSection";
import { ClientMeetingsPanel } from "./sections/AdminMeetingsHub";
import ClientVisitsSection from "./sections/ClientVisitsSection";
import TelecallingSection from "./sections/TelecallingSection";
import SalesVisitsSection from "./sections/SalesVisitsSection";
import logo from "../assets/logo.png";
import "./SalesDashboard.css";
import "./telecaller/telecaller.css";

// Sales manager: only the sales side of the CRM — the team, the client
// meetings telecallers book (which the manager assigns), the telecallers'
// records (read-only), clients and visits.
const VIEWS = [
  { id: "team", label: "Sales Team", Icon: Users },
  { id: "meetings", label: "Meetings", Icon: CalendarCheck },
  { id: "telecalling", label: "Telecalling", Icon: Headset },
  { id: "clients", label: "Clients", Icon: Building2 },
  { id: "myvisits", label: "My Visit Check-in", Icon: Navigation },
  { id: "visits", label: "Client Visits", Icon: MapPin },
];
const VIEW_KEY = "salesManagerView";

function readStoredView() {
  try {
    return sessionStorage.getItem(VIEW_KEY);
  } catch {
    return null;
  }
}

export default function SalesManagerDashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get("view") || readStoredView();
  const view = VIEWS.some((v) => v.id === requested) ? requested : "team";
  const unassignedFirst = searchParams.get("filter") === "unassigned";

  useEffect(() => {
    try {
      sessionStorage.setItem(VIEW_KEY, view);
    } catch {
      /* storage unavailable — tab just won't be remembered */
    }
  }, [view]);

  const setView = (id, extra = {}) => setSearchParams({ view: id, ...extra }, { replace: true });

  const handleLogout = async () => {
    try {
      await API.post("/users/logout");
    } catch {
      /* best-effort — log out locally even if the server call fails */
    }
    localStorage.clear();
    navigate("/");
  };

  return (
    <div>
      <div className="sm-header">
        <img src={logo} alt="Bharat Bizmart" style={{ height: 30, width: "auto", display: "block" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", lineHeight: 1.2 }}>{localStorage.getItem("userName") || "Sales Manager"}</div>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>Sales Manager</div>
          </div>
          <button type="button" onClick={handleLogout} className="sm-logout" title="Sign out">
            <LogOut size={16} strokeWidth={2} />
            Logout
          </button>
        </div>
      </div>

      <nav className="sales-tabs" aria-label="Sales manager sections">
        {VIEWS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            className={`sales-tab${view === id ? " active" : ""}`}
            aria-current={view === id ? "page" : undefined}
            onClick={() => setView(id)}
          >
            <Icon size={15} strokeWidth={2} />
            {label}
          </button>
        ))}
      </nav>

      {view === "team" && (
        <div className="sales-overview">
          <SalesTeamSection onOpenMeetings={() => setView("meetings", { filter: "unassigned" })} />
        </div>
      )}
      {view === "meetings" && (
        <div className="sales-overview">
          <div className="tc-page">
            <ClientMeetingsPanel key={unassignedFirst ? "unassigned" : "all"} startUnassigned={unassignedFirst} visitsBase="/sales-manager?view=myvisits" />
          </div>
        </div>
      )}
      {view === "telecalling" && (
        <div className="sales-overview">
          <TelecallingSection />
        </div>
      )}
      {view === "clients" && <ClientsPage />}
      {view === "myvisits" && (
        <div className="sales-overview">
          <SalesVisitsSection />
        </div>
      )}
      {view === "visits" && (
        <div className="sales-overview">
          <ClientVisitsSection />
        </div>
      )}
    </div>
  );
}
