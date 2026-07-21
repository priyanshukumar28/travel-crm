import React from "react";
import { NavLink } from "react-router-dom";
import { Luggage, Plus, ShieldCheck, Settings, Users, Mail, FileText, RefreshCw, ListChecks, BarChart3 } from "lucide-react";

const NAV = {
  CUSTOMER: [
    { to: "/customer", label: "My Policy & Claims", Icon: Luggage },
  ],
  AGENT: [
    { to: "/agent", label: "Claims Queue", Icon: Luggage },
    { to: "/agent/queues", label: "TAT / Escalation Queues", Icon: ListChecks },
    { to: "/agent/new", label: "New Claim (Intimate)", Icon: Plus },
  ],
  INSURER: [
    { to: "/insurer", label: "Assessment Queue", Icon: ShieldCheck },
  ],
  SUPER_ADMIN: [
    { to: "/admin", label: "Policies & Coverage", Icon: Settings },
    { to: "/admin/plans", label: "Plans", Icon: FileText },
    { to: "/admin/document-requirements", label: "Document Requirements", Icon: FileText },
    { to: "/admin/insurer-sync", label: "Insurer Sync", Icon: RefreshCw },
    { to: "/admin/reports", label: "Reports & MIS Export", Icon: BarChart3 },
    { to: "/admin/users", label: "Users", Icon: Users },
    { to: "/admin/notifications", label: "Notification Outbox", Icon: Mail },
  ],
};

export default function Sidebar({ role }) {
  const items = NAV[role] || [];
  return (
    <aside className="sidebar">
      <div className="sidebar-logo"><img src="/logo.png" alt="Across Assist" /></div>
      <nav className="sidebar-nav">
        {items.map(({ to, label, Icon }) => (
          <NavLink key={to} to={to} end className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}>
            <span className="dot" />
            <Icon size={17} strokeWidth={2} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}