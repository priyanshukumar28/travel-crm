import React from "react";
import { InfoTile } from "./ui";

const RELATIONSHIP_OPTIONS = ["Self", "Father", "Mother", "Son", "Daughter", "Spouse", "Siblings", "In-Laws", "Others"];

// Point 3: shows EVERY member this claim was raised for (not a single
// dropdown) — Name is autofetched and fixed; Relationship with Insured is
// selectable per claimant (editable only where `editable` is passed, e.g.
// Agent view — Customer/Insurer see it read-only).
export default function ClaimantDetails({ claim, editable = false, onChangeRelationship }) {
  const members = (claim.memberIds || [])
    .map((id) => claim.policy?.members?.find((m) => m.id === id))
    .filter(Boolean);
  if (members.length === 0) return null;

  const relationships = claim.intimationData?.claimantRelationships || {};

  return (
    <details className="group" open>
      <summary>
        Claimant Details — {members.length} member(s)
        <span style={{ fontSize: 11, color: "var(--muted)" }}>▾</span>
      </summary>
      <div className="group-body">
        {members.map((m, i) => (
          <div key={m.id} className="info-tile">
            <div className="label">Claimant Member {i + 1} — Relationship with Insured</div>
            <div className="value" style={{ marginBottom: editable ? 8 : 0 }}>{m.name}</div>
            {editable ? (
              <select value={relationships[m.id] || m.relationship || ""} onChange={(e) => onChangeRelationship(m.id, e.target.value)}>
                <option value="">Select…</option>
                {RELATIONSHIP_OPTIONS.map((r) => <option key={r}>{r}</option>)}
              </select>
            ) : (
              <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 2 }}>{relationships[m.id] || m.relationship || "Not set"}</div>
            )}
          </div>
        ))}
        <InfoTile label="Claimant Email" value={claim.policy?.owner?.email} />
        <InfoTile label="Claimant Mobile" value={claim.policy?.owner?.phone} />
      </div>
    </details>
  );
}