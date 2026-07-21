import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import client from "../../api/client";
import { Card, PrimaryBtn, EmptyNote } from "../../components/ui";
import CoverageItemsEditor from "../../components/CoverageItemsEditor";
import { FALLBACK_COVER_NAMES, MEDICAL_SUB_COVERS, CLAIM_CATEGORIES, CATEGORY_LABELS, REGIONS, COUNTRIES, CURRENCY_BY_COUNTRY } from "../../lib/catalog";

function blankGroup(cat, catalog, suggestedCurrency) {
  return { claimCategory: cat, memberIds: [], coverageItems: [{ category: cat, coverageName: (catalog[cat] || [])[0] || "", subCoverName: null, currency: suggestedCurrency || "USD", initialReserve: "" }] };
}

export default function AgentNewClaim() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [policy, setPolicy] = useState(null);
  const [coverNameCatalog, setCoverNameCatalog] = useState(FALLBACK_COVER_NAMES);

  const [dateOfLoss, setDateOfLoss] = useState("");
  const [countryOfLoss, setCountryOfLoss] = useState("");
  const [cityOfLoss, setCityOfLoss] = useState("");
  const [zipcode, setZipcode] = useState("");
  const [regionOfLoss, setRegionOfLoss] = useState("");
  const [descriptionOfLoss, setDescriptionOfLoss] = useState("");
  const [dolError, setDolError] = useState("");

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

  const suggestedCurrency = CURRENCY_BY_COUNTRY[countryOfLoss] || "USD";

  const checkDateOfLoss = (value) => {
    setDateOfLoss(value);
    if (!policy || !value) { setDolError(""); return; }
    const d = new Date(value);
    if (d < new Date(policy.startDate) || d > new Date(policy.endDate)) {
      setDolError(`Policy is expired or not yet active for this date (valid ${new Date(policy.startDate).toLocaleDateString()} – ${new Date(policy.endDate).toLocaleDateString()}).`);
    } else setDolError("");
  };

  const addGroup = () => setGroups((g) => [...g, blankGroup("TRAVEL", coverNameCatalog, suggestedCurrency)]);
  const removeGroup = (i) => setGroups((g) => g.filter((_, idx) => idx !== i));
  const setGroupCategory = (i, cat) => setGroups((g) => g.map((grp, idx) => (idx === i ? { ...grp, claimCategory: cat, coverageItems: [{ category: cat, coverageName: (coverNameCatalog[cat] || [])[0] || "", subCoverName: null, currency: suggestedCurrency, initialReserve: "" }] } : grp)));
  const toggleGroupMember = (i, id) => setGroups((g) => g.map((grp, idx) => idx === i ? { ...grp, memberIds: grp.memberIds.includes(id) ? grp.memberIds.filter((x) => x !== id) : [...grp.memberIds, id] } : grp));
  const setGroupCoverageItems = (i, items) => setGroups((g) => g.map((grp, idx) => (idx === i ? { ...grp, coverageItems: items } : grp)));

  const createOnBehalf = async () => {
    if (!policy || dolError || groups.length === 0) return;
    setError("");
    try {
      const { data } = await client.post("/claims", {
        policyId: policy.id,
        intimationData: { dateOfLoss, countryOfLoss, cityOfLoss, zipcode, regionOfLoss, descriptionOfLoss },
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
        <>
          <Card title={`Policy ${policy.policyNumber} — ${policy.owner?.name}`} subtitle={`Valid ${new Date(policy.startDate).toLocaleDateString()} – ${new Date(policy.endDate).toLocaleDateString()}`}>
            <div className="grid-2">
              <div className="field">
                <label className="field-label"><span>Date of Loss *</span></label>
                <input type="date" value={dateOfLoss} onChange={(e) => checkDateOfLoss(e.target.value)} />
                {dolError && <span style={{ color: "var(--danger)", fontSize: 11.5 }}>{dolError}</span>}
              </div>
              <div className="field">
                <label className="field-label"><span>Country of Loss *</span></label>
                <select value={countryOfLoss} onChange={(e) => setCountryOfLoss(e.target.value)}>
                  <option value="">Select…</option>
                  {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="field"><label className="field-label"><span>City *</span></label><input value={cityOfLoss} onChange={(e) => setCityOfLoss(e.target.value)} /></div>
              <div className="field"><label className="field-label"><span>Zipcode *</span></label><input value={zipcode} onChange={(e) => setZipcode(e.target.value)} /></div>
              <div className="field">
                <label className="field-label"><span>Region of Loss *</span></label>
                <select value={regionOfLoss} onChange={(e) => setRegionOfLoss(e.target.value)}>
                  <option value="">Select…</option>
                  {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div className="field" style={{ marginTop: 12 }}>
              <label className="field-label"><span>Detailed Description of Claim *</span></label>
              <textarea rows={3} value={descriptionOfLoss} onChange={(e) => setDescriptionOfLoss(e.target.value)} />
            </div>
          </Card>

          <Card title="Claim(s)">
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

                  <CoverageItemsEditor items={grp.coverageItems} onChange={(items) => setGroupCoverageItems(i, items)} mode="select" coverNameCatalog={coverNameCatalog} medicalSubCovers={MEDICAL_SUB_COVERS} defaultCategory={grp.claimCategory} policyMembers={policy.members || []} />
                </div>
              </div>
            ))}
            <button className="btn btn-secondary" onClick={addGroup}>+ Add another claim (different member/category)</button>
            <div style={{ marginTop: 16 }}>
              <PrimaryBtn onClick={createOnBehalf} disabled={!!dolError || !dateOfLoss}>
                Create {groups.length > 1 ? `${groups.length} Claims` : "Claim"} & Open →
              </PrimaryBtn>
            </div>
            {error && <p style={{ color: "var(--danger)", fontSize: 12.5, marginTop: 10 }}>{error}</p>}
          </Card>
        </>
      )}

      {!policy && results.length === 0 && <div style={{ marginTop: 16 }}><EmptyNote text="Search for a policy number to start a claim on the customer's behalf." /></div>}
    </div>
  );
}