import React from "react";
import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import ClientsPage from "./ClientsPage";
import logo from "../assets/logo.png";

export default function SalesDashboard() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await API.post("/users/logout");
    } catch {
      
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

      <ClientsPage />
    </div>
  );
}


