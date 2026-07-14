import React, { useEffect, useState } from "react";
import client from "../../api/client";
import { Card, PrimaryBtn, SecondaryBtn, EmptyNote, HeroBanner } from "../../components/ui";

const BLANK_COVERAGE = { category: "TRAVEL", coverageName: "", subCoverName: "", sumInsured: "", subLimitText: "", deductible: "" };
const CATEGORIES = ["MEDICAL", "NON_MEDICAL", "TRAVEL", "PERSONAL_ACCIDENT"];

// Point 5: "add the creation of a plan" — 12 real plans (Bronze/Silver/
// Senior/Gold/Platinum) are seeded from travel_crm_Sub_Limits.xlsx, and this
// page lets Admin add further plans/coverage rows the same way, so plan
// creation is a real, repeatable workflow rather than a one-off seed.
export default function AdminPlans() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [coverages, setCoverages] = useState([{ ...BLANK_COVERAGE }]);
  const [expandedId, setExpandedId] = useState(null);

  const load = async () => {
    setLoading(true);
    const { data } = await client.get("/admin/plans");
    setPlans(data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const setCoverage = (i, k, v) => setCoverages((cs) => cs.map((c, idx) => (idx === i ? { ...c, [k]: v } : c)));
  const addRow = () => setCoverages((cs) => [...cs, { ...BLANK_COVERAGE }]);
  const removeRow = (i) => setCoverages((cs) => cs.filter((_, idx) => idx !== i));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await client.post("/admin/plans", { name, description, coverages: coverages.filter((c) => c.coverageName) });
      setShowForm(false);
      setName("");
      setDescription("");
      setCoverages([{ ...BLANK_COVERAGE }]);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not create plan.");
    }
  };

  return (
    <div>
      <HeroBanner title="Plan Catalog" subtitle="Real plans and sub-limits, seeded from travel_crm_Sub_Limits.xlsx — add new ones the same way." />

      <Card
        title="Create Plan"
        right={<PrimaryBtn onClick={() => setShowForm((s) => !s)}>{showForm ? "Cancel" : "+ New Plan"}</PrimaryBtn>}
      >
        {showForm && (
          <form onSubmit={submit}>
            <div className="grid-2" style={{ marginBottom: 16 }}>
              <div className="field"><label className="field-label"><span>Plan Name</span></label><input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Diamond 1500" /></div>
              <div className="field"><label className="field-label"><span>Description</span></label><input value={description} onChange={(e) => setDescription(e.target.value)} /></div>
            </div>

            <h4 style={{ fontSize: 13, marginBottom: 8 }}>Coverages</h4>
            {coverages.map((c, i) => (
              <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
                <div className="field" style={{ width: 140 }}>
                  <label className="field-label"><span>Category</span></label>
                  <select value={c.category} onChange={(e) => setCoverage(i, "category", e.target.value)}>
                    {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div className="field" style={{ flex: 2, minWidth: 200 }}>
                  <label className="field-label"><span>Coverage Name</span></label>
                  <input value={c.coverageName} onChange={(e) => setCoverage(i, "coverageName", e.target.value)} />
                </div>
                <div className="field" style={{ flex: 1, minWidth: 160 }}>
                  <label className="field-label"><span>Sub-Cover (medical only)</span></label>
                  <input value={c.subCoverName} onChange={(e) => setCoverage(i, "subCoverName", e.target.value)} />
                </div>
                <div className="field" style={{ width: 110 }}>
                  <label className="field-label"><span>Sum Insured</span></label>
                  <input type="number" value={c.sumInsured} onChange={(e) => setCoverage(i, "sumInsured", e.target.value)} />
                </div>
                <div className="field" style={{ flex: 1, minWidth: 160 }}>
                  <label className="field-label"><span>Sub-Limit Text</span></label>
                  <input value={c.subLimitText} onChange={(e) => setCoverage(i, "subLimitText", e.target.value)} placeholder="e.g. USD 1500 Per Day up to 30 Days" />
                </div>
                <SecondaryBtn onClick={() => removeRow(i)}>Remove</SecondaryBtn>
              </div>
            ))}
            <SecondaryBtn onClick={addRow}>+ Add Coverage Row</SecondaryBtn>

            {error && <p style={{ color: "var(--danger)", fontSize: 12.5, margin: "12px 0 0" }}>{error}</p>}
            <div className="action-bar" style={{ marginTop: 16 }}>
              <PrimaryBtn type="submit">Create Plan</PrimaryBtn>
            </div>
          </form>
        )}
      </Card>

      <Card title="All Plans">
        {loading ? (
          <EmptyNote text="Loading…" />
        ) : plans.length === 0 ? (
          <EmptyNote text="No plans yet." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {plans.map((p) => (
              <div key={p.id} className="group">
                <summary
                  onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                  style={{ cursor: "pointer", padding: "13px 16px", background: "#FAFBFD", display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 13.5 }}
                >
                  <span>{p.name} <span style={{ fontWeight: 400, color: "var(--muted)" }}>· {p.coverages.length} coverages</span></span>
                  <span>{expandedId === p.id ? "▴" : "▾"}</span>
                </summary>
                {expandedId === p.id && (
                  <table className="data-table">
                    <thead><tr><th>Category</th><th>Cover</th><th>Sub-Cover</th><th>Sum Insured</th><th>Sub-Limit</th></tr></thead>
                    <tbody>
                      {p.coverages.map((c) => (
                        <tr key={c.id}><td>{c.category}</td><td>{c.coverageName}</td><td>{c.subCoverName || "—"}</td><td>{c.sumInsured}</td><td>{c.subLimitText || "—"}</td></tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
