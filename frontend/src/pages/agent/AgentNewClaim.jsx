import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import client from "../../api/client";
import { Card, PrimaryBtn, EmptyNote } from "../../components/ui";
import CoverageItemsEditor from "../../components/CoverageItemsEditor";
import { FALLBACK_COVER_NAMES, CLAIM_CATEGORIES, CATEGORY_LABELS } from "../../lib/catalog";

function blankGroup(cat, catalog) {
  return { claimCategory: cat, memberIds: [], coverageItems: [{ category: cat, coverageName: (catalog[cat] || [])[0] || "", subCoverName: null, currency: "USD", initialReserve: "", detail: {} }] };
}

export default function AgentNewClaim() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [policy, setPolicy] = useState(null);
  const [coverNameCatalog, setCoverNameCatalog] = useState(FALLBACK_COVER_NAMES);

  // The shared top-level Date of Loss field is gone — Date of Loss now lives
  // per coverage, inside each row's Loss Details panel.
  const [groups, setGroups] = useState([]);
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
    setGroups([blankGroup("TRAVEL", coverNameCatalog)]);
  };

  const addGroup = () => setGroups((g) => [...g, blankGroup("TRAVEL", coverNameCatalog)]);
  const removeGroup = (i) => setGroups((g) => g.filter((_, idx) => idx !== i));
  const setGroupCategory = (i, cat) => setGroups((g) => g.map((grp, idx) => {
    if (idx !== i) return grp;
    const hasRealData = grp.coverageItems.some((it) => it.coverageName && (it.initialReserve || Object.keys(it.detail || {}).length > 0));
    return {
      ...grp,
      claimCategory: cat,
      coverageItems: hasRealData ? grp.coverageItems : [{ category: cat, coverageName: (coverNameCatalog[cat] || [])[0] || "", subCoverName: null, currency: "USD", initialReserve: "", detail: {} }],
    };
  }));
  const toggleGroupMember = (i, id) => setGroups((g) => g.map((grp, idx) => idx === i ? { ...grp, memberIds: grp.memberIds.includes(id) ? grp.memberIds.filter((x) => x !== id) : [...grp.memberIds, id] } : grp));
  const setGroupCoverageItems = (i, items) => setGroups((g) => g.map((grp, idx) => (idx === i ? { ...grp, coverageItems: items } : grp)));

  const REQUIRED_LOSS_FIELDS = ["dateOfLoss", "countryOfLoss", "cityOfLoss", "zipcode", "regionOfLoss", "descriptionOfLoss"];

  const missingLossDetails = () => {
    for (const grp of groups) {
      for (const item of grp.coverageItems) {
        const missing = REQUIRED_LOSS_FIELDS.some((f) => !item.detail?.[f]);
        if (missing) return true;
      }
    }
    return false;
  };

  const createOnBehalf = async () => {
    if (!policy || groups.length === 0) return;
    setError("");
    if (missingLossDetails()) {
      setError("Please fill in Date, Country, City, Zipcode, Region and Description of Loss for every coverage — click \"Loss Details\" on each row.");
      return;
    }
    try {
      const { data } = await client.post("/claims", {
        policyId: policy.id,
        intimationData: {},
        claimGroups: groups,
      });
      navigate(`/agent/claims/${data.claims[0].id}`);
    } catch (err) {
      setError(err.response?.data?.message || "Could not create claim.");
    }
  };

  return (
    <div>
      <Card title="New Claim — Intimate on Behalf of Customer" subtitle="Search the customer's policy to begin">
        <div className="searchbar">
          <input placeholder="Search by policy number or holder name…" value={query} onChange={(e) => setQuery(e.target.value)} style={{ minWidth: 320 }} onKeyDown={(e) => e.key === "Enter" && search()} />
          <button className="btn btn-secondary" onClick={search}>Search</button>
        </div>
        {results.length > 0 && !policy && (
          <table className="data-table">
            <thead><tr><th></th><th>Policy Number</th><th>Holder</th><th>Plan</th></tr></thead>
            <tbody>
              {results.map((p) => (
                <tr key={p.id}>
                  <td><button className="btn btn-secondary" onClick={() => selectPolicy(p)}>Select</button></td>
                  <td>{p.policyNumber}</td><td>{p.owner?.name}</td><td>{p.planName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {policy && (
        <Card title={`Policy ${policy.policyNumber} — ${policy.owner?.name}`} subtitle={`Valid ${new Date(policy.startDate).toLocaleDateString()} – ${new Date(policy.endDate).toLocaleDateString()} — set Date of Loss for each coverage under its Loss Details`}>
          {groups.map((grp, i) => (
            <div key={i} className="group" style={{ marginBottom: 14 }}>
              <div style={{ padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {CLAIM_CATEGORIES.map((cat) => (
                      <button key={cat} type="button" className="btn" onClick={() => setGroupCategory(i, cat)}
                        style={{ background: grp.claimCategory === cat ? "var(--brand-blue)" : "#fff", color: grp.claimCategory === cat ? "#fff" : "var(--ink)", border: grp.claimCategory === cat ? "none" : "1px solid var(--line-strong)" }}>
                        {CATEGORY_LABELS[cat]}
                      </button>
                    ))}
                  </div>
                  <button className="btn btn-secondary" onClick={() => removeGroup(i)}>Remove</button>
                </div>

                {policy.members?.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Insured Member(s) — only members on this policy</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {policy.members.map((m) => (
                        <label key={m.id} className={`checkbox-tile ${grp.memberIds.includes(m.id) ? "selected" : ""}`}>
                          <input type="checkbox" checked={grp.memberIds.includes(m.id)} onChange={() => toggleGroupMember(i, m.id)} />
                          {m.name} {m.relationship ? `(${m.relationship})` : ""}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <CoverageItemsEditor items={grp.coverageItems} onChange={(items) => setGroupCoverageItems(i, items)} mode="select" coverNameCatalog={coverNameCatalog} defaultCategory={grp.claimCategory} />
              </div>
            </div>
          ))}
          <button className="btn btn-secondary" onClick={addGroup}>+ Add another claim (different member/category)</button>
          <div style={{ marginTop: 16 }}>
            <PrimaryBtn onClick={createOnBehalf}>
              Create {groups.length > 1 ? `${groups.length} Claims` : "Claim"} & Open →
            </PrimaryBtn>
          </div>
          {error && <p style={{ color: "var(--danger)", fontSize: 12.5, marginTop: 10 }}>{error}</p>}
        </Card>
      )}

      {!policy && results.length === 0 && <div style={{ marginTop: 16 }}><EmptyNote text="Search for a policy number to start a claim on the customer's behalf." /></div>}
    </div>
  );
}