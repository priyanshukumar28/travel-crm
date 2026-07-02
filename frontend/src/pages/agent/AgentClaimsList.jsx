import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import client from "../../api/client";
import { Card, ClaimRow, EmptyNote, PrimaryBtn, HeroBanner } from "../../components/ui";

export default function AgentClaimsList() {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    client.get("/claims").then(({ data }) => {
      setClaims(data);
      setLoading(false);
    });
  }, []);

  const filtered = claims.filter((c) =>
    !query ||
    c.claimNumber.toLowerCase().includes(query.toLowerCase()) ||
    c.policy?.policyNumber?.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <>
      <HeroBanner
        title="Claims Queue"
        subtitle="Validate intimations, register claims, and hand them off to the insurer — with a full trail at every stop."
      />
      <Card
        title="Claims Queue"
        subtitle="Every claim intimated by a customer or by you on their behalf"
        right={<PrimaryBtn onClick={() => navigate("/agent/new")}>+ New Claim</PrimaryBtn>}
      >
        <div className="searchbar">
          <input placeholder="Search claim number or policy number…" value={query} onChange={(e) => setQuery(e.target.value)} style={{ minWidth: 280 }} />
        </div>
        {loading ? (
          <EmptyNote text="Loading claims…" />
        ) : filtered.length === 0 ? (
          <EmptyNote text="No claims match your search." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map((c) => (
              <ClaimRow key={c.id} claim={c} onClick={() => navigate(`/agent/claims/${c.id}`)} />
            ))}
          </div>
        )}
      </Card>
    </>
  );
}