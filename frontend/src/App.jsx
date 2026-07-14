import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

import LoginPage from "./pages/LoginPage";

import CustomerDashboard from "./pages/customer/CustomerDashboard";
import CustomerClaimView from "./pages/customer/CustomerClaimView";

import AgentLayout from "./pages/agent/AgentLayout";
import AgentClaimsList from "./pages/agent/AgentClaimsList";
import AgentNewClaim from "./pages/agent/AgentNewClaim";
import AgentClaimWorkspace from "./pages/agent/AgentClaimWorkspace";

import InsurerLayout from "./pages/insurer/InsurerLayout";
import InsurerClaimsList from "./pages/insurer/InsurerClaimsList";
import InsurerClaimWorkspace from "./pages/insurer/InsurerClaimWorkspace";

import AdminLayout from "./pages/admin/AdminLayout";
import AdminPolicies from "./pages/admin/AdminPolicies";
import AdminPlans from "./pages/admin/AdminPlans";
import AdminDocumentRequirements from "./pages/admin/AdminDocumentRequirements";
import AdminInsurerSync from "./pages/admin/AdminInsurerSync";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminNotifications from "./pages/admin/AdminNotifications";

import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";

function CustomerLayout({ children }) {
  return (
    <div className="app-shell">
      <Sidebar role="CUSTOMER" />
      <div className="main-col">
        <TopBar />
        <div className="content">{children}</div>
      </div>
    </div>
  );
}

function ProtectedRoute({ roles, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/login" replace />;
  return children;
}

function homeForRole(role) {
  if (role === "SUPER_ADMIN") return "/admin";
  return `/${(role || "").toLowerCase()}`;
}

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={homeForRole(user.role)} replace /> : <LoginPage />} />

      <Route
        path="/customer"
        element={
          <ProtectedRoute roles={["CUSTOMER"]}>
            <CustomerLayout><CustomerDashboard /></CustomerLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/customer/claims/:id"
        element={
          <ProtectedRoute roles={["CUSTOMER"]}>
            <CustomerLayout><CustomerClaimView /></CustomerLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/agent"
        element={
          <ProtectedRoute roles={["AGENT", "SUPER_ADMIN"]}>
            <AgentLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AgentClaimsList />} />
        <Route path="new" element={<AgentNewClaim />} />
        <Route path="claims/:id" element={<AgentClaimWorkspace />} />
      </Route>

      <Route
        path="/insurer"
        element={
          <ProtectedRoute roles={["INSURER", "SUPER_ADMIN"]}>
            <InsurerLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<InsurerClaimsList />} />
        <Route path="claims/:id" element={<InsurerClaimWorkspace />} />
      </Route>

      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={["SUPER_ADMIN"]}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminPolicies />} />
        <Route path="plans" element={<AdminPlans />} />
        <Route path="document-requirements" element={<AdminDocumentRequirements />} />
        <Route path="insurer-sync" element={<AdminInsurerSync />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="notifications" element={<AdminNotifications />} />
      </Route>

      <Route path="*" element={<Navigate to={user ? homeForRole(user.role) : "/login"} replace />} />
    </Routes>
  );
}