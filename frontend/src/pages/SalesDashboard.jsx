import React from "react";
import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import ClientsPage from "./ClientsPage";

export default function SalesDashboard() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await API.post("/users/logout");
    } catch {
      // ignore logout errors (local session will be cleared anyway)
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
          justifyContent: "flex-end",
          padding: "14px 18px",
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid rgba(0,0,0,0.06)",
        }}
      >
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

      <ClientsPage />
    </div>
  );
}


