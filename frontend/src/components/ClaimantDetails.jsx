import React from "react";
import { InfoTile } from "./ui";

// Point 6: Claimant Member N Name + Relationship autofetched from the
// insured member(s) this claim was raised for. Email/Mobile use the
// policy holder's own primary contact — not per member.
export default function ClaimantDetails({ claim }) {
  const members = (claim.memberIds || [])
    .map((id) => claim.policy?.members?.find((m) => m.id === id))
    .filter(Boolean);
  if (members.length === 0) return null;

  return (
    <div className="grid-2" style={{ marginBottom: 16 }}>
      {members.map((m, i) => (
        <InfoTile key={m.id} label={`Claimant Member ${i + 1} Name`} value={`${m.name}${m.relationship ? ` (${m.relationship})` : ""}`} />
      ))}
      <InfoTile label="Claimant Email" value={claim.policy?.owner?.email} />
      <InfoTile label="Claimant Mobile" value={claim.policy?.owner?.phone} />
    </div>
  );
}