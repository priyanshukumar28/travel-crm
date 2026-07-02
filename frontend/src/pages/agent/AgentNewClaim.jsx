import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import client from "../../api/client";
import { Card, PrimaryBtn, EmptyNote } from "../../components/ui";

const CLAIM_TYPES = [{ label: "Travel Claim", value: "TRAVEL" }, { label: "Medical Claim", value: "MEDICAL" }];

export default function AgentNewClaim() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [policy, setPolicy] = useState(null);
  const [claimType, setClaimType] = useState("TRAVEL");
  const [selectedCoverages, setSelectedCoverages] = useState([]);
  const [billAmount, setBillAmount] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const search = async () => {
    if (!query.trim()) return;
    const { data } = await client.get(`/policies/search?q=${encodeURIComponent(query)}`);
    setResults(data);
  };

  const toggleCoverage = (name) =>
    setSelectedCoverages((p) => (p.includes(name) ? p.filter((x) => x !== name) : [...p, name]));

  const createOnBehalf = async () => {
    if (!policy || !selectedCoverages.length) return;
    setError("");
    try {
      const { data: claim } = await client.post("/claims", {
        policyId: policy.id,
        claimType,
        coverages: selectedCoverages,
        intimationData: { expenseReserve: billAmount },
      });
      navigate(`/agent/claims/${claim.id}`);
    } catch (err) {
      setError(err.response?.data?.message || "Could not create claim.");
    }
  };

  return (
    <div>
      <Card title="New Claim — Intimate on Behalf of Customer" subtitle="Search the customer's policy to begin">
        <div className="searchbar">
          <input
            placeholder="Search by policy number or holder name…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ minWidth: 320 }}
            onKeyDown={(e) => e.key === "Enter" && search()}
          />
          <button className="btn btn-secondary" onClick={search}>Search</button>
        </div>

        {results.length > 0 && !policy && (
          <table className="data-table">
            <thead><tr><th></th><th>Policy Number</th><th>Holder</th><th>Plan</th></tr></thead>
            <tbody>
              {results.map((p) => (
                <tr key={p.id}>
                  <td><button className="btn btn-secondary" onClick={() => setPolicy(p)}>Select</button></td>
                  <td>{p.policyNumber}</td>
                  <td>{p.owner?.name}</td>
                  <td>{p.planName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {policy && (
        <Card title={`Policy ${policy.policyNumber} — ${policy.owner?.name}`}>
          <div style={{ marginBottom: 16 }}>
            <label className="field-label"><span>Claim Type</span></label>
            <select value={claimType} onChange={(e) => setClaimType(e.target.value)} style={{ maxWidth: 240, marginTop: 6 }}>
              {CLAIM_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <table className="data-table">
            <thead><tr><th></th><th>Coverage Name</th><th>Sum Insured</th></tr></thead>
            <tbody>
              {policy.coverages.map((c) => (
                <tr key={c.id}>
                  <td><input type="checkbox" checked={selectedCoverages.includes(c.name)} onChange={() => toggleCoverage(c.name)} /></td>
                  <td>{c.name}</td>
                  <td>₹{c.sumInsured.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: "flex", gap: 16, alignItems: "flex-end", marginTop: 16, flexWrap: "wrap" }}>
            <div className="field" style={{ maxWidth: 220 }}>
              <label className="field-label"><span>Estimated Bill Amount</span></label>
              <input type="number" value={billAmount} onChange={(e) => setBillAmount(e.target.value)} />
            </div>
            <PrimaryBtn onClick={createOnBehalf} disabled={!selectedCoverages.length}>Create & Open Intimation →</PrimaryBtn>
          </div>
          {error && <p style={{ color: "var(--danger)", fontSize: 12.5, marginTop: 10 }}>{error}</p>}
        </Card>
      )}

      {!policy && results.length === 0 && (
        <div style={{ marginTop: 16 }}>
          <EmptyNote text="Search for a policy number (e.g. POTBHI00100017114) to start a claim on the customer's behalf." />
        </div>
      )}
    </div>
  );
}
