import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import client from "../../api/client";
import { Card, InfoTile, PrimaryBtn, ClaimRow, EmptyNote, HeroBanner } from "../../components/ui";
import CoverageItemsEditor from "../../components/CoverageItemsEditor";
import { FALLBACK_COVER_NAMES, MEDICAL_SUB_COVERS, CLAIM_CATEGORIES, CATEGORY_LABELS, REGIONS, COUNTRIES, CURRENCY_BY_COUNTRY } from "../../lib/catalog";

function blankGroup(cat, catalog, suggestedCurrency) {
  return { claimCategory: cat, memberIds: [], coverageItems: [{ category: cat, coverageName: (catalog[cat] || [])[0] || "", subCoverName: null, currency: suggestedCurrency || "USD", initialReserve: "" }] };
}

export default function CustomerDashboard() {
  const [policies, setPolicies] = useState([]);
  const [claims, setClaims] = useState([]);
  const [coverNameCatalog, setCoverNameCatalog] = useState(FALLBACK_COVER_NAMES);
  const [loading, setLoading] = useState(true);

  // Shared "incident" details for this filing (point 6/9/10/13)
  const [dateOfLoss, setDateOfLoss] = useState("");
  const [countryOfLoss, setCountryOfLoss] = useState("");
  const [cityOfLoss, setCityOfLoss] = useState("");
  const [zipcode, setZipcode] = useState("");
  const [regionOfLoss, setRegionOfLoss] = useState("");
  const [descriptionOfLoss, setDescriptionOfLoss] = useState("");
  const [dolError, setDolError] = useState("");

  // Point 2 — one or more claim groups, each its own category/members/coverages.
  const [groups, setGroups] = useState([]);
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

  const checkDateOfLoss = (value) => {
    setDateOfLoss(value);
    if (!policy || !value) { setDolError(""); return; }
    const d = new Date(value);
    if (d < new Date(policy.startDate) || d > new Date(policy.endDate)) {
      setDolError(`Policy is expired or not yet active for this date (valid ${new Date(policy.startDate).toLocaleDateString()} – ${new Date(policy.endDate).toLocaleDateString()}).`); // point 6
    } else {
      setDolError("");
    }
  };

  const suggestedCurrency = CURRENCY_BY_COUNTRY[countryOfLoss] || "USD";

  const addGroup = () => setGroups((g) => [...g, blankGroup("TRAVEL", coverNameCatalog, suggestedCurrency)]);
  const removeGroup = (i) => setGroups((g) => g.filter((_, idx) => idx !== i));
  const setGroupCategory = (i, cat) => setGroups((g) => g.map((grp, idx) => (idx === i ? { ...grp, claimCategory: cat, coverageItems: [{ category: cat, coverageName: (coverNameCatalog[cat] || [])[0] || "", subCoverName: null, currency: suggestedCurrency, initialReserve: "" }] } : grp)));
  const setGroupMembers = (i, memberIds) => setGroups((g) => g.map((grp, idx) => (idx === i ? { ...grp, memberIds } : grp)));
  const toggleGroupMember = (i, id) => setGroups((g) => g.map((grp, idx) => idx === i ? { ...grp, memberIds: grp.memberIds.includes(id) ? grp.memberIds.filter((x) => x !== id) : [...grp.memberIds, id] } : grp));
  const setGroupCoverageItems = (i, items) => setGroups((g) => g.map((grp, idx) => (idx === i ? { ...grp, coverageItems: items } : grp)));

  const submitInitiate = async () => {
    if (dolError || groups.length === 0) return;
    setError("");
    try {
      const { data } = await client.post("/claims", {
        policyId: policy.id,
        intimationData: { dateOfLoss, countryOfLoss, cityOfLoss, zipcode, regionOfLoss, descriptionOfLoss },
        claimGroups: groups,
      });
      navigate(`/customer/claims/${data.claims[0].id}`);
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
        subtitle="Review your coverage, describe what happened, and file one or more claims against it — intimation through to payout."
      />

      <Card title="Review Policy Details" subtitle="Coverages shown are linked to your master policy">
        <div className="grid-2">
          <InfoTile label="Policy No." value={policy.policyNumber} />
          <InfoTile label="Plan" value={policy.planName} />
          <InfoTile label="Policy Start Date" value={new Date(policy.startDate).toLocaleDateString()} />
          <InfoTile label="Valid Till" value={new Date(policy.endDate).toLocaleDateString()} />
        </div>
      </Card>

      <Card title="Details of Loss" subtitle="Point 6/9/10/13 — this is the first thing you fill in; everything else is handled by our claims desk after you submit">
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
          <div className="field">
            <label className="field-label"><span>City *</span></label>
            <input value={cityOfLoss} onChange={(e) => setCityOfLoss(e.target.value)} placeholder="e.g. Paris" />
          </div>
          <div className="field">
            <label className="field-label"><span>Zipcode *</span></label>
            <input value={zipcode} onChange={(e) => setZipcode(e.target.value)} />
          </div>
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
          <textarea rows={3} value={descriptionOfLoss} onChange={(e) => setDescriptionOfLoss(e.target.value)} placeholder="What happened, when, and how it relates to your coverage…" />
        </div>
      </Card>

      <Card title="Claim(s)" subtitle="Point 2 — file separate claims for different insured members and categories from the same incident">
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
                <button className="btn btn-secondary" onClick={() => removeGroup(i)}>Remove this claim</button>
              </div>

              {policy.members?.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Insured Member(s) for this claim</div>
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

              <CoverageItemsEditor
                items={grp.coverageItems}
                onChange={(items) => setGroupCoverageItems(i, items)}
                mode="select"
                coverNameCatalog={coverNameCatalog}
                medicalSubCovers={MEDICAL_SUB_COVERS}
                defaultCategory={grp.claimCategory}
              />
            </div>
          </div>
        ))}

        <button className="btn btn-secondary" onClick={addGroup}>+ Add another claim (different member/category)</button>

        <div style={{ marginTop: 16 }}>
          <PrimaryBtn onClick={submitInitiate} disabled={!!dolError || groups.length === 0 || !dateOfLoss}>
            Initiate {groups.length > 1 ? `${groups.length} Claims` : "Claim"} →
          </PrimaryBtn>
        </div>
        {error && <p style={{ color: "var(--danger)", fontSize: 12.5, marginTop: 10 }}>{error}</p>}
      </Card>

      <Card title="My Claims">
        {claims.length === 0 ? (
          <EmptyNote text="No claims yet." />
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