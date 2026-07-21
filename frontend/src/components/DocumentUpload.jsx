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

// Point 22: no delete anywhere in this component — documents are permanent
// once uploaded. Re-uploading the same document type is fully allowed and
// just adds another row (see the version history note below the table).
export default function DocumentUpload({ claimId, canUpload = true }) {
  const [docs, setDocs] = useState([]);
  const [required, setRequired] = useState({ coverageNames: [], documents: [] });
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
    if (!docType && reqData.documents.length > 0) setDocType(reqData.documents[0].docType);
  }, [claimId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const docTypeOptions = required.documents.length > 0 ? required.documents.map((d) => d.docType) : ["Claim Form", "Others"];

  const onUpload = async (e) => {
    e.preventDefault();
    if (!file || !docType) return;
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("docType", docType);
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

  // Point 19: group multiple uploads of the same docType so re-uploads read
  // as a version history, not duplicate confusion.
  const grouped = docs.reduce((acc, d) => {
    (acc[d.docType] = acc[d.docType] || []).push(d);
    return acc;
  }, {});

  return (
    <Card
      title="Documents"
      subtitle={
        required.coverageNames.length > 0
          ? `Required documents are computed automatically from this claim's coverages: ${required.coverageNames.join(", ")}`
          : "Real files, stored on the server — permanent once uploaded"
      }
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

      {canUpload && (
        <form onSubmit={onUpload} style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 18 }}>
          <div className="field" style={{ maxWidth: 260 }}>
            <label className="field-label"><span>Document Type</span></label>
            <select value={docType} onChange={(e) => setDocType(e.target.value)}>
              {docTypeOptions.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="field" style={{ maxWidth: 280 }}>
            <label className="field-label"><span>File (PDF, JPG, PNG, DOC — max 15MB)</span></label>
            <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" onChange={(e) => setFile(e.target.files[0])} />
          </div>
          <button className="btn btn-primary" type="submit" disabled={!file || busy}>
            {busy ? "Uploading…" : "Upload"}
          </button>
        </form>
      )}
      <p style={{ fontSize: 11, color: "var(--muted)", marginBottom: 14 }}>
        Uploaded documents cannot be deleted. Uploading the same document type again adds a new version below it.
      </p>
      {error && <p style={{ color: "var(--danger)", fontSize: 12.5, marginBottom: 12 }}>{error}</p>}

      {docs.length === 0 ? (
        <EmptyNote text="No documents uploaded yet." />
      ) : (
        Object.entries(grouped).map(([type, versions]) => (
          <div key={type} style={{ marginBottom: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 12.5, marginBottom: 6 }}>
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
        ))
      )}
    </Card>
  );
}