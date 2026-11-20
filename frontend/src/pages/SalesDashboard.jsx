import React, { useEffect } from "react";
import { LogOut, LayoutDashboard, Users, MapPin, CalendarCheck } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import API from "../services/api";
import ClientsPage from "./ClientsPage";
import SalesOverviewSection from "./sections/SalesOverviewSection";
import SalesVisitsSection from "./sections/SalesVisitsSection";
import SalesMeetingsSection from "./sections/SalesMeetingsSection";
import logo from "../assets/logo.png";
import "./SalesDashboard.css";

const VIEWS = [
  { id: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { id: "meetings", label: "Meetings", Icon: CalendarCheck },
  { id: "visits", label: "Visit Check-in", Icon: MapPin },
  { id: "clients", label: "My Clients", Icon: Users },
];
const VIEW_KEY = "salesDashboardView";

function readStoredView() {
  try {
    return sessionStorage.getItem(VIEW_KEY);
  } catch {
    return null;
  }
}

export default function SalesDashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  // ?view= wins; otherwise come back to whichever tab was last open this
  // session (e.g. after "Back" from a client page), defaulting to Dashboard.
  const requested = searchParams.get("view") || readStoredView();
  const view = VIEWS.some((v) => v.id === requested) ? requested : "dashboard";

  useEffect(() => {
    try {
      sessionStorage.setItem(VIEW_KEY, view);
    } catch {
      /* storage unavailable — tab just won't be remembered */
    }
  }, [view]);

  const setView = (id) => setSearchParams({ view: id }, { replace: true });

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
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 24px",
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid #e8eaf0",
          boxShadow: "0 1px 0 0 #e8eaf0",
        }}
      >
        <img src={logo} alt="Bharat Bizmart" style={{ height: 30, width: "auto", display: "block" }} />
        <button
          onClick={handleLogout}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            cursor: "pointer",
            border: "1px solid rgba(220,38,38,0.35)",
            background: "rgba(220,38,38,0.08)",
            color: "#dc2626",
            padding: "10px 14px",
            borderRadius: 10,
            fontWeight: 600,
            fontFamily: "inherit",
          }}
          title="Sign out"
        >
          <LogOut size={16} strokeWidth={2} />
          Logout
        </button>
      </div>

      <nav className="sales-tabs" aria-label="Sales sections">
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

      {view === "dashboard" && (
        <div className="sales-overview">
          <SalesOverviewSection />
        </div>
      )}
      {view === "meetings" && (
        <div className="sales-overview">
          <SalesMeetingsSection />
        </div>
      )}
      {view === "visits" && (
        <div className="sales-overview">
          <SalesVisitsSection />
        </div>
      )}
      {view === "clients" && <ClientsPage />}
    </div>
  );
}


