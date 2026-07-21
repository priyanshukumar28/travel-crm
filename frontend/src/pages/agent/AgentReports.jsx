import React, { useState } from "react";
import { Card, HeroBanner, PrimaryBtn } from "../../components/ui";

const apiBase = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

function downloadUrl(path, params) {
  const token = localStorage.getItem("aa_token");
  const query = new URLSearchParams({ ...params, token: token || "" });
  return `${apiBase}${path}?${query.toString()}`;
}

// Agent-visible MIS export with a date range — pulls a batch of claims
// registered in that window instead of the whole database.
export default function AgentReports() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const downloadMIS = () => {
    window.open(downloadUrl("/reports/mis.csv", { ...(from ? { from } : {}), ...(to ? { to } : {}) }), "_blank");
  };

  return (
    <div>
      <HeroBanner title="Download MIS" subtitle="Export claim data for a date range in the client's exact MIS column format." />

      <Card title="MIS Export" subtitle="Pick a date range (optional — leave blank to export everything) and download">
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 16 }}>
          <div className="field" style={{ maxWidth: 200 }}>
            <label className="field-label"><span>From</span></label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="field" style={{ maxWidth: 200 }}>
            <label className="field-label"><span>To</span></label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <PrimaryBtn onClick={downloadMIS}>Download MIS (CSV)</PrimaryBtn>
        </div>
        <p style={{ fontSize: 11.5, color: "var(--muted)" }}>
          Includes every claim whose intimation date falls within the selected range, in the client's 56-column MIS layout.
        </p>
      </Card>

      <Card title="Reserve Analysis Export" subtitle="Every reserve/payable change ever made, who made it and when">
        <PrimaryBtn onClick={() => window.open(downloadUrl("/reports/reserve-analysis.csv", {}), "_blank")}>Download Reserve Analysis (CSV)</PrimaryBtn>
      </Card>
    </div>
  );
}