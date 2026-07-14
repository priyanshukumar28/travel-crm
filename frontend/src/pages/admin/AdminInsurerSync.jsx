import React, { useEffect, useState } from "react";
import client from "../../api/client";
import { Card, PrimaryBtn, EmptyNote, Badge, HeroBanner } from "../../components/ui";

const STATUS_BADGE = {
  CREATED: { color: "#1D8A5F", bg: "#DEF3E9" },
  UPDATED: { color: "#1D4FA0", bg: "#E8EFFB" },
  SKIPPED: { color: "#B5790C", bg: "#FBF0D6" },
  ERROR: { color: "#C6402A", bg: "#FBE4DE" },
};

// Point 13: this is the "API integrated in the system" for the insurer's
// sales-data feed. Paste rows copied straight out of Format_-_Sales_Data.xlsx
// (select the header row + data rows in Excel, Ctrl+C, paste here — Excel
// copies as tab-separated text, which is exactly what this parses) and it
// posts to POST /api/admin/insurer-sync, the same endpoint a real insurer
// integration would call.
export default function AdminInsurerSync() {
  const [fields, setFields] = useState([]);
  const [pasted, setPasted] = useState("");
  const [rows, setRows] = useState([]);
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    client.get("/admin/insurer-sync/fields").then(({ data }) => setFields(data.fields));
  }, []);

  const parse = () => {
    setError("");
    setResults(null);
    const lines = pasted.trim().split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) {
      setError("Paste a header row plus at least one data row.");
      return;
    }
    const header = lines[0].split("\t").map((h) => h.trim());
    const parsedRows = lines.slice(1).map((line) => {
      const cells = line.split("\t");
      const row = {};
      header.forEach((h, i) => { row[h] = cells[i]?.trim() ?? ""; });
      return row;
    });
    setRows(parsedRows);
  };

  const runSync = async () => {
    setBusy(true);
    setError("");
    try {
      const { data } = await client.post("/admin/insurer-sync", { rows });
      setResults(data.results);
    } catch (err) {
      setError(err.response?.data?.message || "Sync failed.");
    } finally {
      setBusy(false);
    }
  };

  const loadSampleRow = () => {
    const sample = [
      fields.join("\t"),
      [
        "SALES-DEMO-0001", "01-07-2026", "New Delhi", "05-07-2026", "04-07-2027",
        "Priyanshu Kumar", "Gold 500", "P1234567", "Worldwide excluding US/Canada", "Individual",
        "France, Spain", "India", "500000", "N/A", "priyanshu.demo@example.com", "+91 9800000000", "Anita Kumar",
      ].join("\t"),
    ].join("\n");
    setPasted(sample);
  };

  return (
    <div>
      <HeroBanner title="Insurer Sales-Data Sync" subtitle="The exact feed format from Format_-_Sales_Data.xlsx — this is the real integration point for the insurer's policy feed." />

      <Card title="Expected Field Format" subtitle="17 columns, exactly as they appear in the insurer's spreadsheet">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {fields.map((f) => <Badge key={f} color="#1D4FA0" bg="#E8EFFB">{f}</Badge>)}
        </div>
      </Card>

      <Card title="Paste Sales Data" subtitle="Select the header row + data rows in Excel, copy (Ctrl+C), and paste directly below — tab-separated text pastes correctly here">
        <textarea
          rows={6}
          style={{ width: "100%", fontFamily: "var(--font-mono)", fontSize: 11.5, border: "1px solid var(--line)", borderRadius: 8, padding: 10 }}
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
          placeholder="Paste tab-separated rows here (header row first)…"
        />
        <div className="action-bar" style={{ marginTop: 12 }}>
          <button className="btn btn-secondary" onClick={loadSampleRow}>Load Sample Row</button>
          <button className="btn btn-secondary" onClick={parse} disabled={!pasted.trim()}>Preview</button>
        </div>
        {error && <p style={{ color: "var(--danger)", fontSize: 12.5, marginTop: 10 }}>{error}</p>}
      </Card>

      {rows.length > 0 && (
        <Card title={`Preview — ${rows.length} row(s)`}>
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead><tr>{Object.keys(rows[0]).map((h) => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>{Object.keys(rows[0]).map((h) => <td key={h}>{r[h]}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="action-bar" style={{ marginTop: 16 }}>
            <PrimaryBtn onClick={runSync} disabled={busy}>{busy ? "Syncing…" : "Sync to Policies →"}</PrimaryBtn>
          </div>
        </Card>
      )}

      {results && (
        <Card title="Sync Results">
          <table className="data-table">
            <thead><tr><th>Policy Number</th><th>Status</th><th>Detail</th></tr></thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={i}>
                  <td style={{ fontFamily: "monospace" }}>{r.policyNumber}</td>
                  <td><Badge {...STATUS_BADGE[r.status]}>{r.status}</Badge></td>
                  <td>{r.reason || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {rows.length === 0 && !results && (
        <EmptyNote text="Paste sales-data rows above and click Preview to get started." />
      )}
    </div>
  );
}