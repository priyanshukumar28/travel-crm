import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import client from "../../api/client";
import { Card, PrimaryBtn, EmptyNote } from "../../components/ui";
import CoverageItemsEditor from "../../components/CoverageItemsEditor";
import { FALLBACK_COVER_NAMES, MEDICAL_SUB_COVERS, CLAIM_CATEGORIES, CATEGORY_LABELS } from "../../lib/catalog";

export default function AgentNewClaim() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [policy, setPolicy] = useState(null);
  const [coverNameCatalog, setCoverNameCatalog] = useState(FALLBACK_COVER_NAMES);
  const [claimCategory, setClaimCategory] = useState("TRAVEL");
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [coverageItems, setCoverageItems] = useState([]);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    client.get("/plans/cover-names").then(({ data }) => setCoverNameCatalog(data)).catch(() => {});
  }, []);

  const search = async () => {
    if (!query.trim()) return;
    const { data } = await client.get(`/policies/search?q=${encodeURIComponent(query)}`);
    setResults(data);
  };

  const selectPolicy = (p) => {
    setPolicy(p);
    setSelectedMemberIds([]);
    onPickCategory("TRAVEL");
  };

  const toggleMember = (id) =>
    setSelectedMemberIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const onPickCategory = (cat) => {
    setClaimCategory(cat);
    setCoverageItems([{ category: cat, coverageName: (coverNameCatalog[cat] || [])[0] || "", subCoverName: null, initialReserve: "" }]);
  };

  const createOnBehalf = async () => {
    if (!policy || !coverageItems.length) return;
    setError("");
    try {
      const { data: claim } = await client.post("/claims", {
        policyId: policy.id,
        claimCategory,
        memberIds: selectedMemberIds,
        coverageItems,
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
                  <td><button className="btn btn-secondary" onClick={() => selectPolicy(p)}>Select</button></td>
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
              <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 8 }}>Insured Member(s) — only members on this policy can be selected</div>
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
            <PrimaryBtn onClick={createOnBehalf} disabled={!coverageItems.some((i) => i.coverageName)}>
              Create & Open Intimation →
            </PrimaryBtn>
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