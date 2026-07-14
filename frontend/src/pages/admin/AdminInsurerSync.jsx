import React, { useEffect, useState } from "react";
import client from "../../api/client";
import { Card, PrimaryBtn, SecondaryBtn, EmptyNote, Badge, HeroBanner } from "../../components/ui";

const STATUS_BADGE = {
  APPLIED: { color: "#1D8A5F", bg: "#DEF3E9" },
  VALIDATION_ERROR: { color: "#C6402A", bg: "#FBE4DE" },
  CREATED: { color: "#1D8A5F", bg: "#DEF3E9" },
  UPDATED: { color: "#1D4FA0", bg: "#E8EFFB" },
  SKIPPED: { color: "#B5790C", bg: "#FBF0D6" },
  ERROR: { color: "#C6402A", bg: "#FBE4DE" },
};

const apiBase = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

// Point 13, real version: a live, multi-call feed API (not a one-shot bulk
// upload). The insurer's own system authenticates with an API key and can
// POST a policy's fields at any time, in any order, across many separate
// calls — each call is validated against the matched Plan and permanently
// logged, whether it was applied or rejected.
export default function AdminInsurerSync() {
  const [fields, setFields] = useState([]);
  const [keys, setKeys] = useState([]);
  const [events, setEvents] = useState([]);
  const [newKeyLabel, setNewKeyLabel] = useState("");
  const [justCreatedKey, setJustCreatedKey] = useState(null);
  const [expandedEventId, setExpandedEventId] = useState(null);
  const [error, setError] = useState("");

  // bulk import (secondary, one-time onboarding tool)
  const [pasted, setPasted] = useState("");
  const [rows, setRows] = useState([]);
  const [bulkResults, setBulkResults] = useState(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  const load = async () => {
    const [fieldsRes, keysRes, eventsRes] = await Promise.all([
      client.get("/admin/insurer-sync/fields"),
      client.get("/admin/api-keys"),
      client.get("/admin/insurer-feed/events"),
    ]);
    setFields(fieldsRes.data.fields);
    setKeys(keysRes.data);
    setEvents(eventsRes.data);
  };
  useEffect(() => { load(); }, []);

  const activeKey = keys.find((k) => k.isActive);

  const createKey = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const { data } = await client.post("/admin/api-keys", { label: newKeyLabel });
      setJustCreatedKey(data);
      setNewKeyLabel("");
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not create key.");
    }
  };

  const toggleKey = async (k) => {
    await client.patch(`/admin/api-keys/${k.id}`, { isActive: !k.isActive });
    await load();
  };

  const sampleBody = JSON.stringify(
    {
      "Policy Number": "SALES-DEMO-0001",
      "Name of Insured": "Priyanshu Kumar",
      "Plan name": "Gold 500",
      "Policy Start Date": "2026-07-05",
      "Policy End Date": "2027-07-04",
      "Email id": "priyanshu.demo@example.com",
    },
    null,
    2
  );

  const curlExample = `curl -X POST ${apiBase}/insurer-feed/policies \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${activeKey?.key || "<your-api-key>"}" \\
  -d '${sampleBody.replace(/\n\s*/g, " ")}'`;

  // ---- bulk import (unchanged secondary tool) ----
  const parseBulk = () => {
    setError("");
    setBulkResults(null);
    const lines = pasted.trim().split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) { setError("Paste a header row plus at least one data row."); return; }
    const header = lines[0].split("\t").map((h) => h.trim());
    setRows(lines.slice(1).map((line) => {
      const cells = line.split("\t");
      const row = {};
      header.forEach((h, i) => { row[h] = cells[i]?.trim() ?? ""; });
      return row;
    }));
  };
  const runBulkSync = async () => {
    setBulkBusy(true);
    setError("");
    try {
      const { data } = await client.post("/admin/insurer-sync", { rows });
      setBulkResults(data.results);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Bulk sync failed.");
    } finally {
      setBulkBusy(false);
    }
  };

  return (
    <div>
      <HeroBanner title="Insurer Feed — Live API" subtitle="A real, multi-call integration point: the insurer's system posts policy fields as they become available, validated against the plan on every call." />

      <Card title="1. API Keys" subtitle="Generate a key and hand it to the insurer's integration team — this is what authenticates every feed call">
        <form onSubmit={createKey} style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div className="field" style={{ maxWidth: 280 }}>
            <label className="field-label"><span>Label</span></label>
            <input value={newKeyLabel} onChange={(e) => setNewKeyLabel(e.target.value)} placeholder="e.g. ITGI Insurer Feed" required />
          </div>
          <PrimaryBtn type="submit">Generate Key</PrimaryBtn>
        </form>

        {justCreatedKey && (
          <div className="login-error" style={{ background: "var(--brand-orange-soft)", color: "var(--brand-orange-dark)", marginBottom: 16 }}>
            Copy this now — it won't be shown in full again: <br />
            <code style={{ fontFamily: "var(--font-mono)", fontSize: 12.5 }}>{justCreatedKey.key}</code>
          </div>
        )}

        <table className="data-table">
          <thead><tr><th>Label</th><th>Key</th><th>Status</th><th>Created</th><th></th></tr></thead>
          <tbody>
            {keys.map((k) => (
              <tr key={k.id}>
                <td>{k.label}</td>
                <td style={{ fontFamily: "var(--font-mono)", fontSize: 11.5 }}>{k.key.slice(0, 12)}…{k.key.slice(-4)}</td>
                <td>{k.isActive ? <Badge color="#1D8A5F" bg="#DEF3E9">Active</Badge> : <Badge color="#667085" bg="#EEF0F4">Revoked</Badge>}</td>
                <td>{new Date(k.createdAt).toLocaleDateString()}</td>
                <td><SecondaryBtn onClick={() => toggleKey(k)}>{k.isActive ? "Revoke" : "Reactivate"}</SecondaryBtn></td>
              </tr>
            ))}
          </tbody>
        </table>
        {error && <p style={{ color: "var(--danger)", fontSize: 12.5, marginTop: 10 }}>{error}</p>}
      </Card>

      <Card title="2. How the insurer calls it" subtitle="Real endpoint — POST once per available field-set, any time, in any order. Same Policy Number merges into the existing record.">
        <p style={{ fontSize: 12.5, marginBottom: 10 }}>
          Endpoint: <code style={{ fontFamily: "var(--font-mono)" }}>POST {apiBase}/insurer-feed/policies</code>
        </p>
        <p style={{ fontSize: 12.5, marginBottom: 10 }}>
          Body: a single JSON object using any subset of these field names (send only what's known so far — later calls can add the rest):
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
          {fields.map((f) => <Badge key={f} color="#1D4FA0" bg="#E8EFFB">{f}</Badge>)}
        </div>
        <pre style={{ background: "#0E2C5C", color: "#E8EFFB", padding: 14, borderRadius: 10, fontSize: 11.5, overflowX: "auto", fontFamily: "var(--font-mono)" }}>
{curlExample}
        </pre>
        <p style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 10 }}>
          If "Sum Insured" is sent and exceeds the matched Plan's maximum, or "Plan name" doesn't match a configured
          plan, the call is rejected with <code>422</code> and a structured <code>errors[]</code> array — nothing is
          written. A new policy starts as <strong>DRAFT</strong> (hidden from Customer/Agent portals) until enough
          fields have arrived across calls to activate it.
        </p>
      </Card>

      <Card title="3. Feed Event Log" subtitle="Permanent history of every call the live feed has received — applied or rejected">
        {events.length === 0 ? (
          <EmptyNote text="No feed calls received yet — try the curl example above." />
        ) : (
          <table className="data-table">
            <thead><tr><th>Policy Number</th><th>Status</th><th>Applied Fields</th><th>API Key</th><th>When</th><th></th></tr></thead>
            <tbody>
              {events.map((ev) => (
                <React.Fragment key={ev.id}>
                  <tr>
                    <td style={{ fontFamily: "monospace" }}>{ev.policyNumber || "—"}</td>
                    <td><Badge {...STATUS_BADGE[ev.status]}>{ev.status.replace("_", " ")}</Badge></td>
                    <td style={{ fontSize: 11.5 }}>{ev.appliedFields?.join(", ") || "—"}</td>
                    <td>{ev.apiKey?.label || "—"}</td>
                    <td>{new Date(ev.createdAt).toLocaleString()}</td>
                    <td><SecondaryBtn onClick={() => setExpandedEventId(expandedEventId === ev.id ? null : ev.id)}>{expandedEventId === ev.id ? "Hide" : "Details"}</SecondaryBtn></td>
                  </tr>
                  {expandedEventId === ev.id && (
                    <tr>
                      <td colSpan={6}>
                        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", padding: "10px 0" }}>
                          <div style={{ flex: 1, minWidth: 240 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4 }}>Payload received</div>
                            <pre style={{ fontSize: 11, background: "#FAFBFD", padding: 10, borderRadius: 8, overflowX: "auto" }}>{JSON.stringify(ev.payload, null, 2)}</pre>
                          </div>
                          {ev.errors?.length > 0 && (
                            <div style={{ flex: 1, minWidth: 240 }}>
                              <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4 }}>Errors / Warnings</div>
                              <pre style={{ fontSize: 11, background: "#FBE4DE", padding: 10, borderRadius: 8, overflowX: "auto" }}>{JSON.stringify(ev.errors, null, 2)}</pre>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card title="4. Bulk Import (one-time onboarding tool)" subtitle="Separate from the live feed above — for loading many existing policies at once from a spreadsheet, not incremental updates">
        <textarea
          rows={5}
          style={{ width: "100%", fontFamily: "var(--font-mono)", fontSize: 11.5, border: "1px solid var(--line)", borderRadius: 8, padding: 10 }}
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
          placeholder="Paste tab-separated rows here (header row first, copied straight from Excel)…"
        />
        <div className="action-bar" style={{ marginTop: 12 }}>
          <button className="btn btn-secondary" onClick={parseBulk} disabled={!pasted.trim()}>Preview</button>
        </div>
        {rows.length > 0 && (
          <>
            <div style={{ overflowX: "auto", marginTop: 12 }}>
              <table className="data-table">
                <thead><tr>{Object.keys(rows[0]).map((h) => <th key={h}>{h}</th>)}</tr></thead>
                <tbody>{rows.map((r, i) => <tr key={i}>{Object.keys(rows[0]).map((h) => <td key={h}>{r[h]}</td>)}</tr>)}</tbody>
              </table>
            </div>
            <div className="action-bar" style={{ marginTop: 12 }}>
              <PrimaryBtn onClick={runBulkSync} disabled={bulkBusy}>{bulkBusy ? "Syncing…" : "Bulk Sync →"}</PrimaryBtn>
            </div>
          </>
        )}
        {bulkResults && (
          <table className="data-table" style={{ marginTop: 12 }}>
            <thead><tr><th>Policy Number</th><th>Status</th><th>Detail</th></tr></thead>
            <tbody>{bulkResults.map((r, i) => <tr key={i}><td style={{ fontFamily: "monospace" }}>{r.policyNumber}</td><td><Badge {...STATUS_BADGE[r.status]}>{r.status}</Badge></td><td>{r.reason || "—"}</td></tr>)}</tbody>
          </table>
        )}
      </Card>
    </div>
  );
}