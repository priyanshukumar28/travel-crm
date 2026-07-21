import React from "react";
import { Card, HeroBanner, PrimaryBtn } from "../../components/ui";

const apiBase = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

// Points 19/20/21: exports as authenticated downloads (browser sends the
// JWT via a query param since <a download> can't set an Authorization
// header) — simplest reliable approach for a straight CSV download link.
function downloadUrl(path) {
  const token = localStorage.getItem("aa_token");
  return `${apiBase}${path}?token=${encodeURIComponent(token || "")}`;
}

export default function AdminReports() {
  return (
    <div>
      <HeroBanner title="Reports & MIS Export" subtitle="Point 19/20/21 — reserve change analysis, document activity, and a full MIS export." />

      <Card title="Reserve Analysis Export" subtitle="Every reserve/payable change ever made, who made it and when (point 14/20)">
        <PrimaryBtn onClick={() => window.open(downloadUrl("/reports/reserve-analysis.csv"), "_blank")}>Download Reserve Analysis (CSV)</PrimaryBtn>
      </Card>

      <Card title="MIS Export" subtitle="Full flattened claim + policy + coverage-item export (point 21) — generic column set until the client's exact MIS spreadsheet format is provided">
        <PrimaryBtn onClick={() => window.open(downloadUrl("/reports/mis.csv"), "_blank")}>Download MIS Export (CSV)</PrimaryBtn>
      </Card>

      <Card title="Document Activity" subtitle="Every upload is already logged per-claim in that claim's Activity Log & Remarks tab (point 19) — filtered to document events via GET /claims/:id/documents/activity">
        <p style={{ fontSize: 12.5, color: "var(--muted)" }}>
          Open any claim → Activity Log & Remarks tab to see its document upload history with uploader, filename and timestamp.
          A claim-scoped API (<code>GET /api/claims/:id/documents/activity</code>) is also available if you want to build a
          dedicated document-activity screen later.
        </p>
      </Card>
    </div>
  );
}