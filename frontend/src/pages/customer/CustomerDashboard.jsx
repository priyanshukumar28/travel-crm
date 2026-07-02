import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import client from "../../api/client";
import { Card, InfoTile, PrimaryBtn, ClaimRow, EmptyNote, HeroBanner } from "../../components/ui";

const CLAIM_TYPES = ["Travel Claim", "Medical Claim"];

export default function CustomerDashboard() {
  const [policies, setPolicies] = useState([]);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initiating, setInitiating] = useState(false);
  const [selectedCoverages, setSelectedCoverages] = useState([]);
  const [claimType, setClaimType] = useState(CLAIM_TYPES[0]);
  const [billAmount, setBillAmount] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    const [{ data: p }, { data: c }] = await Promise.all([
      client.get("/policies/mine"),
      client.get("/claims"),
    ]);
    setPolicies(p);
    setClaims(c);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const policy = policies[0];

  const toggleCoverage = (name) =>
    setSelectedCoverages((p) => (p.includes(name) ? p.filter((x) => x !== name) : [...p, name]));

  const submitInitiate = async () => {
    if (!selectedCoverages.length) return;
    setError("");
    try {
      const { data: claim } = await client.post("/claims", {
        policyId: policy.id,
        claimType: claimType === "Medical Claim" ? "MEDICAL" : "TRAVEL",
        coverages: selectedCoverages,
        intimationData: { expenseReserve: billAmount },
      });
      navigate(`/customer/claims/${claim.id}`);
    } catch (err) {
      setError(err.response?.data?.message || "Could not initiate claim.");
    }
  };

  if (loading) return <EmptyNote text="Loading your policy…" />;
  if (!policy) return <EmptyNote text="No policy found for this account." />;

  return (
    <div>
      <HeroBanner
        title={`Welcome back, ${policy.holderName?.split(" ")[0] || "traveller"}`}
        subtitle="Review your coverage, lodge a claim, and track it every step of the way — intimation through to payout."
      />

      <Card title="Review Policy Details" subtitle="Coverages shown are linked to your master policy">
        <div className="grid-2">
          <InfoTile label="Policy No." value={policy.policyNumber} />
          <InfoTile label="Plan" value={policy.planName} />
          <InfoTile label="Geographical Coverage" value={policy.geoCoverage} />
          <InfoTile label="Valid Till" value={new Date(policy.endDate).toLocaleDateString()} />
        </div>
      </Card>

      <Card title="Coverage & Sum Insured">
        <table className="data-table">
          <thead>
            <tr><th></th><th>Coverage Name</th><th>Sum Insured</th><th>Deductible</th></tr>
          </thead>
          <tbody>
            {policy.coverages.map((c) => (
              <tr key={c.id}>
                <td>
                  <input type="checkbox" checked={selectedCoverages.includes(c.name)} onChange={() => toggleCoverage(c.name)} />
                </td>
                <td>{c.name}</td>
                <td>₹{c.sumInsured.toLocaleString()}</td>
                <td>{c.deductible || "N/A"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ marginTop: 18, display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-end" }}>
          <div className="field" style={{ maxWidth: 220 }}>
            <label className="field-label"><span>Claim Type</span></label>
            <select value={claimType} onChange={(e) => setClaimType(e.target.value)}>
              {CLAIM_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="field" style={{ maxWidth: 220 }}>
            <label className="field-label"><span>Estimated Bill Amount</span></label>
            <input type="number" value={billAmount} onChange={(e) => setBillAmount(e.target.value)} placeholder="e.g. 1500" />
          </div>
          <PrimaryBtn onClick={submitInitiate} disabled={!selectedCoverages.length}>
            Initiate Claim →
          </PrimaryBtn>
        </div>
        {error && <p style={{ color: "var(--danger)", fontSize: 12.5, marginTop: 10 }}>{error}</p>}
      </Card>

      <Card title="My Claims">
        {claims.length === 0 ? (
          <EmptyNote text="No claims yet. Select coverages above to initiate one." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {claims.map((c) => (
              <ClaimRow key={c.id} claim={c} onClick={() => navigate(`/customer/claims/${c.id}`)} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}