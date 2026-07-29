import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import Login from "./pages/Login";
import AdminRecovery from "./pages/AdminRecovery";
import AdminDashboard from "./pages/AdminDashboard";
import UserDashboard from "./pages/UserDashboard";
import ClientsPage from "./pages/ClientsPage";
import ClientDetailPage from "./pages/ClientDetailPage";
import HrDashboard from "./pages/HrDashboard";
import SalesDashboard from "./pages/SalesDashboard";
import ClientDashboard from "./pages/ClientDashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import ContractBuilderPage from "./features/contract-builder/pages/ContractBuilderPage";


function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors />
      <Routes>

        <Route path="/" element={<Login />} />

        {/* Hidden admin credential-recovery page — deliberately not linked
            from Login or any nav. Unauthenticated by design: this is the
            entry point used precisely when there's no valid admin session. */}
        <Route path="/system/admin-recovery" element={<AdminRecovery />} />

        <Route
          path="/clients/:clientId/contracts/new"
          element={
            <ProtectedRoute roles={["admin", "sales", "user"]}>
              <ContractBuilderPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/clients/:clientId/contracts/:contractId/edit"
          element={
            <ProtectedRoute roles={["admin", "sales", "user"]}>
              <ContractBuilderPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/client/dashboard"
          element={
            <ProtectedRoute role="client">
              <ClientDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute role="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/clients"
          element={
            <ProtectedRoute roles={["admin", "sales", "user"]}>
              <ClientsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/clients/:clientId"
          element={
            <ProtectedRoute roles={["admin", "sales", "user"]}>
              <ClientDetailPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute role="user">
              <UserDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/hr"
          element={
            <ProtectedRoute role="hr">
              <HrDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/sales"
          element={
            <ProtectedRoute role="sales">
              <SalesDashboard />
            </ProtectedRoute>
          }
        />


      </Routes>
    </BrowserRouter>
  );
}

export default App;