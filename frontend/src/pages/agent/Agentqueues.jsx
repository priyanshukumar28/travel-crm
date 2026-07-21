import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import client from "../../api/client";
import { Card, ClaimRow, EmptyNote, HeroBanner, Badge } from "../../components/ui";

const BUCKET_ORDER = ["Documents Yet to Receive", "Reminder 1", "Reminder 2", "Reminder 3", "Reminder 4", "Deficient Claim", "Under Observation", "Closed"];
const BUCKET_BADGE = {
  "Documents Yet to Receive": { color: "#B5790C", bg: "#FBF0D6" },
  "Reminder 1": { color: "#B5790C", bg: "#FBF0D6" },
  "Reminder 2": { color: "#B5790C", bg: "#FBF0D6" },
  "Reminder 3": { color: "#C6402A", bg: "#FBE4DE" },
  "Reminder 4": { color: "#C6402A", bg: "#FBE4DE" },
  "Deficient Claim": { color: "#C6402A", bg: "#FBE4DE" },
  "Under Observation": { color: "#1D4FA0", bg: "#E8EFFB" },
  "Closed": { color: "#667085", bg: "#EEF0F4" },
};

// Point 15 — the operational queue view: every claim bucketed by its TAT/
// escalation state, matching the client's exact bucket names.
export default function AgentQueues() {
  const [buckets, setBuckets] = useState({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    client.get("/claims/queues").then(({ data }) => { setBuckets(data); setLoading(false); });
  }, []);

  if (loading) return <EmptyNote text="Loading queues…" />;

  return (
    <div>
      <HeroBanner title="Claims Queue System" subtitle="Documents yet to receive → Reminder 1-4 → Deficient Claim, alongside claims under normal observation." />
      {BUCKET_ORDER.map((bucket) => {
        const claims = buckets[bucket] || [];
        if (claims.length === 0) return null;
        const b = BUCKET_BADGE[bucket];
        return (
          <Card key={bucket} title={<span>{bucket} <Badge color={b.color} bg={b.bg}>{claims.length}</Badge></span>}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {claims.map((c) => <ClaimRow key={c.id} claim={c} onClick={() => navigate(`/agent/claims/${c.id}`)} />)}
            </div>
          </Card>
        );
      })}
      {Object.values(buckets).every((c) => c.length === 0) && <EmptyNote text="No claims in any queue yet." />}
    </div>
  );
}