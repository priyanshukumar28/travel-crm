import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import client from "../../api/client";
import { Card, ClaimRow, EmptyNote, HeroBanner } from "../../components/ui";

export default function InsurerClaimsList() {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    client.get("/claims").then(({ data }) => {
      setClaims(data);
      setLoading(false);
    });
  }, []);

  return (
    <>
      <HeroBanner
        title="Assessment Queue"
        subtitle="Medical, personal accident and non-medical assessments — with full intimation and registration history alongside."
      />
      <Card title="Claims Received from Across Assist" subtitle="Assessment and final decisioning happen here">
        {loading ? (
          <EmptyNote text="Loading claims…" />
        ) : claims.length === 0 ? (
          <EmptyNote text="No claims have reached the Insurer stage yet." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {claims.map((c) => (
              <ClaimRow key={c.id} claim={c} onClick={() => navigate(`/insurer/claims/${c.id}`)} />
            ))}
          </div>
        )}
      </Card>
    </>
  );
}