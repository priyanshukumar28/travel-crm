import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import TopBar from "../../components/TopBar";

export default function InsurerLayout() {
  return (
    <div className="app-shell">
      <Sidebar role="INSURER" />
      <div className="main-col">
        <TopBar />
        <div className="content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
