import React from "react";
import AdminDashboard from "./AdminDashboard";

// Temporary reuse: AdminDashboard already renders role-specific tabs via useAdminDashboard().
// We keep a dedicated route component for HR.
export default function HrDashboard() {
  return <AdminDashboard />;
}

