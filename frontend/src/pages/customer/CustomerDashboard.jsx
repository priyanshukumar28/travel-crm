import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import client from "../../api/client";
import { Card, InfoTile, PrimaryBtn, ClaimRow, EmptyNote, HeroBanner } from "../../components/ui";
import CoverageItemsEditor from "../../components/CoverageItemsEditor";
import { FALLBACK_COVER_NAMES, CLAIM_CATEGORIES, CATEGORY_LABELS } from "../../lib/catalog";

function blankGroup(cat, catalog) {
  return { claimCategory: cat, memberIds: [], coverageItems: [{ category: cat, coverageName: (catalog[cat] || [])[0] || "", subCoverName: null, currency: "USD", initialReserve: "", detail: {} }] };
}

export default function CustomerDashboard() {
  const [policies, setPolicies] = useState([]);
  const [claims, setClaims] = useState([]);
  const [coverNameCatalog, setCoverNameCatalog] = useState(FALLBACK_COVER_NAMES);
  const [loading, setLoading] = useState(true);

  // The shared top-level Date of Loss field is gone — Date of Loss now lives
  // per coverage, inside each row's Loss Details panel (see
  // CoverageItemsEditor), alongside Country/City/Zipcode/Region/Description.
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

  const addGroup = () => setGroups((g) => [...g, blankGroup("TRAVEL", coverNameCatalog)]);
  const removeGroup = (i) => setGroups((g) => g.filter((_, idx) => idx !== i));
  // Only replaces coverageItems with a fresh blank row if nothing real has
  // been entered yet — switching the category label must NEVER silently
  // wipe coverages or Loss Details the customer already filled in.
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

  // Point: Date of Loss is now required per coverage too, since it's the
  // only place it's captured — enforced the same way the other Loss Details
  // fields already are.
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

  const submitInitiate = async () => {
    if (groups.length === 0) return;
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
        subtitle="Review your coverage and file one or more claims against it — intimation through to payout."
      />

      <Card title="Review Policy Details" subtitle="Coverages shown are linked to your master policy">
        <div className="grid-2">
          <InfoTile label="Policy No." value={policy.policyNumber} />
          <InfoTile label="Plan" value={policy.planName} />
          <InfoTile label="Policy Issuance Date" value={new Date(policy.issuanceDate).toLocaleDateString()} />
          <InfoTile label="Policy Start Date" value={new Date(policy.startDate).toLocaleDateString()} />
          <InfoTile label="Policy End Date" value={new Date(policy.endDate).toLocaleDateString()} />
        </div>
      </Card>

      <Card title="Claim(s)" subtitle="File separate claims for different insured members and categories from the same incident — set Date of Loss for each coverage under its Loss Details">
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
                defaultCategory={grp.claimCategory}
              />
            </div>
          </div>
        ))}

        <button className="btn btn-secondary" onClick={addGroup}>+ Add another claim (different member/category)</button>

        <div style={{ marginTop: 16 }}>
          <PrimaryBtn onClick={submitInitiate} disabled={groups.length === 0}>
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