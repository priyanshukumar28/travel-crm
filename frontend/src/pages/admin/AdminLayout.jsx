import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import TopBar from "../../components/TopBar";

export default function AdminLayout() {
  return (
    <div className="app-shell">
      <Sidebar role="SUPER_ADMIN" />
      <div className="main-col">
        <TopBar title="Admin — Policy & User Configuration" />
        <div className="content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}