import React, { useCallback, useEffect, useState } from "react";
import client from "../api/client";
import { Card, EmptyNote, Badge } from "./ui";

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const ROLE_BADGE = {
  CUSTOMER: { color: "#1D4FA0", bg: "#E8EFFB" },
  AGENT: { color: "#B5790C", bg: "#FBF0D6" },
  INSURER: { color: "#6D5BAF", bg: "#ECE8F8" },
  SUPER_ADMIN: { color: "#1D8A5F", bg: "#DEF3E9" },
};

// Point 8: documents are scoped to a specific coverage — same pattern as
// Loss Details. Upload requires picking which coverage the file is for, and
// the list below groups by coverage first, document type second.
export default function DocumentUpload({ claimId, canUpload = true, coverageItems = [] }) {
  const [docs, setDocs] = useState([]);
  const [required, setRequired] = useState({ coverageNames: [], documents: [] });
  const [coverageName, setCoverageName] = useState("");
  const [docType, setDocType] = useState("");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [{ data: docsData }, { data: reqData }] = await Promise.all([
      client.get(`/claims/${claimId}/documents`),
      client.get(`/claims/${claimId}/required-documents`),
    ]);
    setDocs(docsData);
    setRequired(reqData);
  }, [claimId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!coverageName && coverageItems.length > 0) setCoverageName(coverageItems[0].coverageName);
  }, [coverageItems, coverageName]);

  const docTypeOptions = required.documents.length > 0 ? required.documents.map((d) => d.docType) : ["Claim Form", "Others"];

  const onUpload = async (e) => {
    e.preventDefault();
    if (!file || !docType || !coverageName) return;
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("docType", docType);
      form.append("coverageName", coverageName);
      await client.post(`/claims/${claimId}/documents`, form);
      setFile(null);
      e.target.reset();
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  const missingCount = required.documents.filter((d) => !d.uploaded).length;

  // Group by coverage first, doc type second — re-uploads of the same type
  // still read as a version history within that coverage's section.
  const byCoverage = docs.reduce((acc, d) => {
    const key = d.coverageName || "Unassigned";
    acc[key] = acc[key] || {};
    (acc[key][d.docType] = acc[key][d.docType] || []).push(d);
    return acc;
  }, {});

  return (
    <>
      {coverageItems.length > 0 && (
        <Card title="Loss Details by Coverage" subtitle="For context while uploading — as filled in at intimation">
          {coverageItems.map((it, i) => {
            const d = it.detail || {};
            const hasAny = d.dateOfLoss || d.countryOfLoss || d.cityOfLoss || d.zipcode || d.regionOfLoss || d.descriptionOfLoss;
            return (
              <div key={i} style={{ padding: "10px 0", borderBottom: i < coverageItems.length - 1 ? "1px solid var(--line)" : "none" }}>
                <div style={{ fontWeight: 700, fontSize: 12.5, marginBottom: 6 }}>
                  {it.coverageName}{it.subCoverName ? ` — ${it.subCoverName}` : ""}
                </div>
                {hasAny ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: 12, color: "var(--muted)" }}>
                    {d.dateOfLoss && <span><strong style={{ color: "var(--ink)" }}>Date:</strong> {d.dateOfLoss}</span>}
                    {d.countryOfLoss && <span><strong style={{ color: "var(--ink)" }}>Country:</strong> {d.countryOfLoss}</span>}
                    {d.cityOfLoss && <span><strong style={{ color: "var(--ink)" }}>City:</strong> {d.cityOfLoss}</span>}
                    {d.zipcode && <span><strong style={{ color: "var(--ink)" }}>Zipcode:</strong> {d.zipcode}</span>}
                    {d.regionOfLoss && <span><strong style={{ color: "var(--ink)" }}>Region:</strong> {d.regionOfLoss}</span>}
                    {(d.alarmCenterName || d.alarmCenterRefNo) && <span><strong style={{ color: "var(--ink)" }}>Alarm Center:</strong> {d.alarmCenterName} {d.alarmCenterRefNo ? `(${d.alarmCenterRefNo})` : ""}</span>}
                    {d.descriptionOfLoss && <span style={{ flexBasis: "100%" }}><strong style={{ color: "var(--ink)" }}>Description:</strong> {d.descriptionOfLoss}</span>}
                  </div>
                ) : (
                  <span style={{ fontSize: 12, color: "var(--danger)" }}>No Loss Details filled in for this coverage yet.</span>
                )}
              </div>
            );
          })}
        </Card>
      )}

      <Card
        title="Documents"
        subtitle={required.coverageNames.length > 0 ? `Required documents by coverage: ${required.coverageNames.join(", ")}` : "Real files, stored on the server — permanent once uploaded"}
      >
        {required.documents.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 8, color: "var(--brand-blue-dark)" }}>
              Checklist — {required.documents.length - missingCount} of {required.documents.length} uploaded
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {required.documents.map((d) => (
                <Badge key={d.docType} color={d.uploaded ? "#1D8A5F" : "#B5790C"} bg={d.uploaded ? "#DEF3E9" : "#FBF0D6"}>
                  {d.uploaded ? "✓ " : "○ "}{d.docType}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {canUpload && coverageItems.length > 0 && (
          <form onSubmit={onUpload} style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 18 }}>
            <div className="field" style={{ maxWidth: 220 }}>
              <label className="field-label"><span>Coverage</span></label>
              <select value={coverageName} onChange={(e) => setCoverageName(e.target.value)}>
                {coverageItems.map((it, i) => <option key={i} value={it.coverageName}>{it.coverageName}</option>)}
              </select>
            </div>
            <div className="field" style={{ maxWidth: 240 }}>
              <label className="field-label"><span>Document Type</span></label>
              <select value={docType} onChange={(e) => setDocType(e.target.value)}>
                <option value="">Select…</option>
                {docTypeOptions.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="field" style={{ maxWidth: 260 }}>
              <label className="field-label"><span>File (PDF, JPG, PNG, DOC — max 15MB)</span></label>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" onChange={(e) => setFile(e.target.files[0])} />
            </div>
            <button className="btn btn-primary" type="submit" disabled={!file || !docType || busy}>
              {busy ? "Uploading…" : "Upload"}
            </button>
          </form>
        )}
        <p style={{ fontSize: 11, color: "var(--muted)", marginBottom: 14 }}>
          Uploaded documents cannot be deleted. Uploading the same document type again adds a new version.
        </p>
        {error && <p style={{ color: "var(--danger)", fontSize: 12.5, marginBottom: 12 }}>{error}</p>}

        {docs.length === 0 ? (
          <EmptyNote text="No documents uploaded yet." />
        ) : (
          Object.entries(byCoverage).map(([cov, types]) => (
            <div key={cov} style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 800, fontSize: 12.5, color: "var(--brand-blue-dark)", marginBottom: 8 }}>{cov}</div>
              {Object.entries(types).map(([type, versions]) => (
                <div key={type} style={{ marginBottom: 12, paddingLeft: 10 }}>
                  <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 6 }}>
                    {type} {versions.length > 1 && <Badge color="#B5790C" bg="#FBF0D6">{versions.length} versions</Badge>}
                  </div>
                  <table className="data-table">
                    <thead><tr><th>File</th><th>Uploaded By</th><th>Size</th><th>When</th><th></th></tr></thead>
                    <tbody>
                      {versions.map((d) => {
                        const rb = ROLE_BADGE[d.uploadedByRole] || {};
                        return (
                          <tr key={d.id}>
                            <td>{d.fileName}</td>
                            <td>{d.uploadedByName} <Badge color={rb.color} bg={rb.bg}>{d.uploadedByRole}</Badge></td>
                            <td>{formatSize(d.sizeBytes)}</td>
                            <td>{new Date(d.createdAt).toLocaleString()}</td>
                            <td><a className="btn btn-secondary" href={d.url} target="_blank" rel="noopener noreferrer">Open</a></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          ))
        )}
      </Card>
    </>
  );
}