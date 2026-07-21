import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import client from "../api/client";
import { Card, ClaimRow, EmptyNote } from "./ui";

// Point 2: shows every sibling claim from the same multi-claim initiation
// (e.g. Member A — Medical, Member B — Travel filed together) so they're
// visible as a group instead of being invisible to each other once created.
export default function LinkedClaims({ claimId, basePath }) {
  const [siblings, setSiblings] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    client.get(`/claims/${claimId}/linked`).then(({ data }) => setSiblings(data));
  }, [claimId]);

  if (siblings === null) return null; // still loading — don't flash empty state
  if (siblings.length === 0) return null; // no siblings — don't clutter the page with an empty card

  return (
    <Card title="Linked Claims" subtitle="Filed together from the same claim initiation">
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {siblings.map((c) => (
          <ClaimRow key={c.id} claim={c} onClick={() => navigate(`${basePath}/${c.id}`)} />
        ))}
      </div>
    </Card>
  );
}