import React from "react";
import { useAuth } from "../context/AuthContext";
import { Badge } from "./ui";
import { useNavigate } from "react-router-dom";

const ROLE_LABEL = { CUSTOMER: "Customer Portal", AGENT: "Agent Portal (AA)", INSURER: "Insurer Portal", SUPER_ADMIN: "Admin" };

export default function TopBar({ title }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const onLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="topbar">
      <div className="topbar-title">{title || ROLE_LABEL[user?.role]}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Badge color="#1D4FA0" bg="#E8EFFB">{user?.name}</Badge>
        <Badge color="#B5790C" bg="#FBF0D6">{ROLE_LABEL[user?.role]}</Badge>
        <button className="btn btn-secondary" onClick={onLogout}>Log out</button>
      </div>
    </div>
  );
}
