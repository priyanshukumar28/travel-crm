import React, { useEffect, useState } from "react";
import client from "../../api/client";
import { Card, PrimaryBtn, SecondaryBtn, EmptyNote, Badge, HeroBanner } from "../../components/ui";

const BLANK_COVERAGE = { name: "", sumInsured: "", deductible: "N/A" };

export default function AdminPolicies() {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    policyNumber: "", holderName: "", ownerEmail: "", planName: "",
    claimType: "TRAVEL", startDate: "", endDate: "", issuanceDate: "",
    geoCoverage: "Worldwide", issuanceBranch: "",
  });
  const [coverages, setCoverages] = useState([{ ...BLANK_COVERAGE }]);

  const load = async () => {
    setLoading(true);
    const { data } = await client.get("/admin/policies");
    setPolicies(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setCoverage = (i, k, v) => setCoverages((cs) => cs.map((c, idx) => (idx === i ? { ...c, [k]: v } : c)));
  const addCoverageRow = () => setCoverages((cs) => [...cs, { ...BLANK_COVERAGE }]);
  const removeCoverageRow = (i) => setCoverages((cs) => cs.filter((_, idx) => idx !== i));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await client.post("/admin/policies", { ...form, coverages: coverages.filter((c) => c.name) });
      setShowForm(false);
      setForm({ policyNumber: "", holderName: "", ownerEmail: "", planName: "", claimType: "TRAVEL", startDate: "", endDate: "", issuanceDate: "", geoCoverage: "Worldwide", issuanceBranch: "" });
      setCoverages([{ ...BLANK_COVERAGE }]);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not create policy.");
    }
  };

  const toggleActive = async (policy) => {
    await client.patch(`/admin/policies/${policy.id}`, { isActive: !policy.isActive });
    await load();
  };

  return (
    <div>
      <HeroBanner
        title="Policy & Coverage Configuration"
        subtitle="This is the source of truth every Customer and Agent portal reads from — create policies, set coverage limits, manage accounts."
      />
      <Card
        title="Policy Configuration"
        subtitle="Create and manage master policies, coverages and sum insured — this is the source of truth every Customer/Agent portal reads from"
        right={<PrimaryBtn onClick={() => setShowForm((s) => !s)}>{showForm ? "Cancel" : "+ New Policy"}</PrimaryBtn>}
      >
        {showForm && (
          <form onSubmit={submit} style={{ marginTop: 8 }}>
            <div className="grid-2">
              <div className="field"><label className="field-label"><span>Policy Number</span></label><input required value={form.policyNumber} onChange={(e) => setF("policyNumber", e.target.value)} /></div>
              <div className="field"><label className="field-label"><span>Customer Email (created if new)</span></label><input required type="email" value={form.ownerEmail} onChange={(e) => setF("ownerEmail", e.target.value)} /></div>
              <div className="field"><label className="field-label"><span>Holder Name</span></label><input value={form.holderName} onChange={(e) => setF("holderName", e.target.value)} /></div>
              <div className="field"><label className="field-label"><span>Plan Name</span></label><input required value={form.planName} onChange={(e) => setF("planName", e.target.value)} /></div>
              <div className="field">
                <label className="field-label"><span>Claim Type</span></label>
                <select value={form.claimType} onChange={(e) => setF("claimType", e.target.value)}>
                  <option value="TRAVEL">Travel</option>
                  <option value="MEDICAL">Medical</option>
                </select>
              </div>
              <div className="field"><label className="field-label"><span>Geographical Coverage</span></label><input value={form.geoCoverage} onChange={(e) => setF("geoCoverage", e.target.value)} /></div>
              <div className="field"><label className="field-label"><span>Issuance Branch</span></label><input value={form.issuanceBranch} onChange={(e) => setF("issuanceBranch", e.target.value)} /></div>
              <div className="field"><label className="field-label"><span>Issuance Date</span></label><input type="date" value={form.issuanceDate} onChange={(e) => setF("issuanceDate", e.target.value)} /></div>
              <div className="field"><label className="field-label"><span>Start Date</span></label><input required type="date" value={form.startDate} onChange={(e) => setF("startDate", e.target.value)} /></div>
              <div className="field"><label className="field-label"><span>End Date</span></label><input required type="date" value={form.endDate} onChange={(e) => setF("endDate", e.target.value)} /></div>
            </div>

            <h4 style={{ marginTop: 20, marginBottom: 8, fontSize: 13 }}>Coverages</h4>
            {coverages.map((c, i) => (
              <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8, alignItems: "flex-end" }}>
                <div className="field" style={{ flex: 2 }}>
                  <label className="field-label"><span>Coverage Name</span></label>
                  <input value={c.name} onChange={(e) => setCoverage(i, "name", e.target.value)} placeholder="e.g. Emergency Medical Expenses" />
                </div>
                <div className="field" style={{ flex: 1 }}>
                  <label className="field-label"><span>Sum Insured</span></label>
                  <input type="number" value={c.sumInsured} onChange={(e) => setCoverage(i, "sumInsured", e.target.value)} />
                </div>
                <div className="field" style={{ flex: 1 }}>
                  <label className="field-label"><span>Deductible</span></label>
                  <input value={c.deductible} onChange={(e) => setCoverage(i, "deductible", e.target.value)} />
                </div>
                <SecondaryBtn onClick={() => removeCoverageRow(i)}>Remove</SecondaryBtn>
              </div>
            ))}
            <SecondaryBtn onClick={addCoverageRow}>+ Add Coverage Row</SecondaryBtn>

            {error && <p style={{ color: "var(--danger)", fontSize: 12.5, margin: "12px 0 0" }}>{error}</p>}
            <div className="action-bar" style={{ marginTop: 16 }}>
              <PrimaryBtn type="submit">Create Policy</PrimaryBtn>
            </div>
          </form>
        )}
      </Card>

      <Card title="All Policies">
        {loading ? (
          <EmptyNote text="Loading…" />
        ) : policies.length === 0 ? (
          <EmptyNote text="No policies configured yet." />
        ) : (
          <table className="data-table">
            <thead><tr><th>Policy Number</th><th>Holder</th><th>Plan</th><th>Coverages</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {policies.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontFamily: "monospace" }}>{p.policyNumber}</td>
                  <td>{p.owner?.name}<div style={{ fontSize: 11, color: "var(--muted)" }}>{p.owner?.email}</div></td>
                  <td>{p.planName}</td>
                  <td>{p.coverages.length}</td>
                  <td>{p.isActive ? <Badge color="#1D8A5F" bg="#DEF3E9">Active</Badge> : <Badge color="#667085" bg="#EEF0F4">Inactive</Badge>}</td>
                  <td><SecondaryBtn onClick={() => toggleActive(p)}>{p.isActive ? "Deactivate" : "Activate"}</SecondaryBtn></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}