import React, { useCallback, useEffect, useState } from "react";
import client from "../api/client";
import { Card, SecondaryBtn, EmptyNote, Badge } from "./ui";

const DOC_TYPES = [
  "Claim Form", "Discharge Summary", "Hospital Bill", "Prescription",
  "Passport / Visa Copy", "FIR / Police Report", "Boarding Pass / Ticket",
  "Cancelled Cheque", "Death Certificate", "Others",
];

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

// Real disk-backed document upload/list, reused across all three portals.
// `claimId` is the only required prop; `canDelete` controls whether the
// current user sees a delete action on documents they didn't upload.
export default function DocumentUpload({ claimId, canUpload = true }) {
  const [docs, setDocs] = useState([]);
  const [docType, setDocType] = useState(DOC_TYPES[0]);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const { data } = await client.get(`/claims/${claimId}/documents`);
    setDocs(data);
  }, [claimId]);

  useEffect(() => { load(); }, [load]);

  const onUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
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

  const onDelete = async (doc) => {
    await client.delete(`/documents/${doc.id}`);
    await load();
  };

  return (
    <Card title="Documents" subtitle="Real files, stored on the server — not just form fields">
      {canUpload && (
        <form onSubmit={onUpload} style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 18 }}>
          <div className="field" style={{ maxWidth: 220 }}>
            <label className="field-label"><span>Document Type</span></label>
            <select value={docType} onChange={(e) => setDocType(e.target.value)}>
              {DOC_TYPES.map((t) => <option key={t}>{t}</option>)}
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
      {error && <p style={{ color: "var(--danger)", fontSize: 12.5, marginBottom: 12 }}>{error}</p>}

      {docs.length === 0 ? (
        <EmptyNote text="No documents uploaded yet." />
      ) : (
        <table className="data-table">
          <thead>
            <tr><th>File</th><th>Type</th><th>Uploaded By</th><th>Size</th><th></th></tr>
          </thead>
          <tbody>
            {docs.map((d) => {
              const rb = ROLE_BADGE[d.uploadedByRole] || {};
              return (
                <tr key={d.id}>
                  <td>{d.fileName}</td>
                  <td>{d.docType}</td>
                  <td>
                    {d.uploadedByName} <Badge color={rb.color} bg={rb.bg}>{d.uploadedByRole}</Badge>
                  </td>
                  <td>{formatSize(d.sizeBytes)}</td>
                  <td style={{ display: "flex", gap: 8 }}>
                    <a className="btn btn-secondary" href={d.url} target="_blank" rel="noopener noreferrer">Open</a>
                    <SecondaryBtn onClick={() => onDelete(d).catch((e) => setError(e.response?.data?.message || "Could not delete."))}>Delete</SecondaryBtn>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </Card>
  );
}