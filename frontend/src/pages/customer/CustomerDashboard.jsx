import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import client from "../../api/client";
import { Card, InfoTile, PrimaryBtn, ClaimRow, EmptyNote, HeroBanner } from "../../components/ui";
import CoverageItemsEditor from "../../components/CoverageItemsEditor";
import { FALLBACK_COVER_NAMES, MEDICAL_SUB_COVERS, CLAIM_CATEGORIES, CATEGORY_LABELS } from "../../lib/catalog";

export default function CustomerDashboard() {
  const [policies, setPolicies] = useState([]);
  const [claims, setClaims] = useState([]);
  const [coverNameCatalog, setCoverNameCatalog] = useState(FALLBACK_COVER_NAMES);
  const [loading, setLoading] = useState(true);

  const [claimCategory, setClaimCategory] = useState("TRAVEL");
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [coverageItems, setCoverageItems] = useState([]);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    const [{ data: p }, { data: c }, catalogRes] = await Promise.all([
      client.get("/policies/mine"),
      client.get("/claims"),
      client.get("/plans/cover-names").catch(() => null),
    ]);
    setPolicies(p);
    setClaims(c);
    if (catalogRes?.data) setCoverNameCatalog(catalogRes.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const policy = policies[0];

  const toggleMember = (id) =>
    setSelectedMemberIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  // Point 2/3/4: switching the top-level category resets the coverage table
  // to one empty row in that category, ready to pick a cover name for it.
  const onPickCategory = (cat) => {
    setClaimCategory(cat);
    setCoverageItems([{ category: cat, coverageName: (coverNameCatalog[cat] || [])[0] || "", subCoverName: null, initialReserve: "" }]);
  };

  const submitInitiate = async () => {
    if (!coverageItems.length) return;
    setError("");
    try {
      const { data: claim } = await client.post("/claims", {
        policyId: policy.id,
        claimCategory,
        memberIds: selectedMemberIds,
        coverageItems,
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
            <tr><th>Category</th><th>Coverage Name</th><th>Sum Insured</th><th>Sub-Limit</th></tr>
          </thead>
          <tbody>
            {policy.coverages.map((c) => (
              <tr key={c.id}>
                <td>{CATEGORY_LABELS[c.category] || c.category}</td>
                <td>{c.name}{c.subCoverName ? ` — ${c.subCoverName}` : ""}</td>
                <td>{c.category === "MEDICAL" ? `USD ${c.sumInsured.toLocaleString()}` : `₹${c.sumInsured.toLocaleString()}`}</td>
                <td>{c.subLimitText || c.deductible || "N/A"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card title="Initiate Claim" subtitle="Point 2/4: choose a category, then select one or more coverages — each gets its own initial reserve">
        <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
          {CLAIM_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              className="btn"
              onClick={() => onPickCategory(cat)}
              style={{
                background: claimCategory === cat ? "var(--brand-blue)" : "#fff",
                color: claimCategory === cat ? "#fff" : "var(--ink)",
                border: claimCategory === cat ? "none" : "1px solid var(--line-strong)",
              }}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        {policy.members?.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 8 }}>Insured Member(s) this claim is for</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {policy.members.map((m) => (
                <label key={m.id} className={`checkbox-tile ${selectedMemberIds.includes(m.id) ? "selected" : ""}`}>
                  <input type="checkbox" checked={selectedMemberIds.includes(m.id)} onChange={() => toggleMember(m.id)} />
                  {m.name} {m.relationship ? `(${m.relationship})` : ""}
                </label>
              ))}
            </div>
          </div>
        )}

        {coverageItems.length > 0 && (
          <CoverageItemsEditor
            items={coverageItems}
            onChange={setCoverageItems}
            mode="select"
            coverNameCatalog={coverNameCatalog}
            medicalSubCovers={MEDICAL_SUB_COVERS}
            defaultCategory={claimCategory}
          />
        )}

        <div style={{ marginTop: 16 }}>
          <PrimaryBtn onClick={submitInitiate} disabled={!coverageItems.some((i) => i.coverageName)}>
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