import React, { useEffect, useState } from "react";
import client from "../../api/client";
import { Card, PrimaryBtn, SecondaryBtn, EmptyNote, HeroBanner } from "../../components/ui";

// Point 1: every claim workspace's Documents tab reads this table live —
// editing a row here immediately changes what's required on any claim that
// selects that coverage, no code change involved.
export default function AdminDocumentRequirements() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [coverageName, setCoverageName] = useState("");
  const [docsText, setDocsText] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    const { data } = await client.get("/document-requirements");
    setRows(data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const editRow = (row) => {
    setCoverageName(row.coverageName);
    setDocsText(row.requiredDocuments.join("\n"));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    const requiredDocuments = docsText.split("\n").map((d) => d.trim()).filter(Boolean);
    try {
      await client.post("/admin/document-requirements", { coverageName, requiredDocuments });
      setCoverageName("");
      setDocsText("");
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not save.");
    }
  };

  const remove = async (row) => {
    await client.delete(`/admin/document-requirements/${row.id}`);
    await load();
  };

  return (
    <div>
      <HeroBanner title="Document Requirements" subtitle="Point 1: dynamic per-coverage document checklists — edit here, every claim's Documents tab updates instantly." />

      <Card title={coverageName ? `Editing: ${coverageName}` : "Add / Edit Requirement"}>
        <form onSubmit={submit}>
          <div className="grid-2" style={{ marginBottom: 12 }}>
            <div className="field">
              <label className="field-label"><span>Coverage Name (must match exactly)</span></label>
              <input required value={coverageName} onChange={(e) => setCoverageName(e.target.value)} placeholder="e.g. Medical Expenses" />
            </div>
          </div>
          <div className="field">
            <label className="field-label"><span>Required Documents — one per line</span></label>
            <textarea rows={6} value={docsText} onChange={(e) => setDocsText(e.target.value)} placeholder={"Claim form\nDischarge summary\n..."} />
          </div>
          {error && <p style={{ color: "var(--danger)", fontSize: 12.5, marginTop: 10 }}>{error}</p>}
          <div className="action-bar" style={{ marginTop: 12 }}>
            {coverageName && <SecondaryBtn onClick={() => { setCoverageName(""); setDocsText(""); }}>Clear</SecondaryBtn>}
            <PrimaryBtn type="submit">Save</PrimaryBtn>
          </div>
        </form>
      </Card>

      <Card title="All Coverage → Document Mappings">
        {loading ? (
          <EmptyNote text="Loading…" />
        ) : rows.length === 0 ? (
          <EmptyNote text="No document requirements configured yet." />
        ) : (
          <table className="data-table">
            <thead><tr><th>Coverage</th><th>Required Documents</th><th></th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 700 }}>{r.coverageName}</td>
                  <td style={{ fontSize: 12 }}>{r.requiredDocuments.join(", ")}</td>
                  <td style={{ display: "flex", gap: 8 }}>
                    <SecondaryBtn onClick={() => editRow(r)}>Edit</SecondaryBtn>
                    <SecondaryBtn onClick={() => remove(r)}>Delete</SecondaryBtn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}