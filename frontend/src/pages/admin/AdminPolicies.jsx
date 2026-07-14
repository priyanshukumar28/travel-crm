import React, { useEffect, useState } from "react";
import client from "../../api/client";
import { Card, PrimaryBtn, SecondaryBtn, EmptyNote, Badge, HeroBanner } from "../../components/ui";

const BLANK_MEMBER = { name: "", relationship: "Self", passportNumber: "", dob: "" };

export default function AdminPolicies() {
  const [policies, setPolicies] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    policyNumber: "", holderName: "", ownerEmail: "", planTemplateId: "",
    startDate: "", endDate: "", issuanceDate: "", issuancePlace: "",
    geoCoverage: "Worldwide", issuanceBranch: "", countryVisited: "", countryOfResidence: "",
    deductible: "", nomineeName: "",
  });
  const [members, setMembers] = useState([{ ...BLANK_MEMBER }]);

  const load = async () => {
    setLoading(true);
    const [{ data: pol }, { data: pl }] = await Promise.all([
      client.get("/admin/policies"),
      client.get("/admin/plans"),
    ]);
    setPolicies(pol);
    setPlans(pl);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setMember = (i, k, v) => setMembers((ms) => ms.map((m, idx) => (idx === i ? { ...m, [k]: v } : m)));
  const addMemberRow = () => setMembers((ms) => [...ms, { ...BLANK_MEMBER, relationship: "" }]);
  const removeMemberRow = (i) => setMembers((ms) => ms.filter((_, idx) => idx !== i));

  const selectedPlan = plans.find((p) => p.id === form.planTemplateId);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await client.post("/admin/policies", {
        ...form,
        members: members.filter((m) => m.name),
      });
      setShowForm(false);
      setForm({
        policyNumber: "", holderName: "", ownerEmail: "", planTemplateId: "",
        startDate: "", endDate: "", issuanceDate: "", issuancePlace: "",
        geoCoverage: "Worldwide", issuanceBranch: "", countryVisited: "", countryOfResidence: "",
        deductible: "", nomineeName: "",
      });
      setMembers([{ ...BLANK_MEMBER }]);
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
        subtitle="This is the source of truth every Customer and Agent portal reads from — issue policies against a plan, and manage insured members."
      />
      <Card
        title="Policy Configuration"
        subtitle="Point 5: policies are issued against a Plan (see Plans page to create new ones) — coverages and sub-limits are copied in automatically"
        right={<PrimaryBtn onClick={() => setShowForm((s) => !s)}>{showForm ? "Cancel" : "+ New Policy"}</PrimaryBtn>}
      >
        {showForm && (
          <form onSubmit={submit} style={{ marginTop: 8 }}>
            <div className="grid-2">
              <div className="field"><label className="field-label"><span>Policy Number</span></label><input required value={form.policyNumber} onChange={(e) => setF("policyNumber", e.target.value)} /></div>
              <div className="field"><label className="field-label"><span>Customer Email (created if new)</span></label><input required type="email" value={form.ownerEmail} onChange={(e) => setF("ownerEmail", e.target.value)} /></div>
              <div className="field"><label className="field-label"><span>Holder Name</span></label><input value={form.holderName} onChange={(e) => setF("holderName", e.target.value)} /></div>
              <div className="field">
                <label className="field-label"><span>Plan</span></label>
                <select required value={form.planTemplateId} onChange={(e) => setF("planTemplateId", e.target.value)}>
                  <option value="">Select a plan…</option>
                  {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="field"><label className="field-label"><span>Geographical Coverage</span></label><input value={form.geoCoverage} onChange={(e) => setF("geoCoverage", e.target.value)} /></div>
              <div className="field"><label className="field-label"><span>Issuance Branch</span></label><input value={form.issuanceBranch} onChange={(e) => setF("issuanceBranch", e.target.value)} /></div>
              <div className="field"><label className="field-label"><span>Issuance Place</span></label><input value={form.issuancePlace} onChange={(e) => setF("issuancePlace", e.target.value)} /></div>
              <div className="field"><label className="field-label"><span>Issuance Date</span></label><input type="date" value={form.issuanceDate} onChange={(e) => setF("issuanceDate", e.target.value)} /></div>
              <div className="field"><label className="field-label"><span>Start Date</span></label><input required type="date" value={form.startDate} onChange={(e) => setF("startDate", e.target.value)} /></div>
              <div className="field"><label className="field-label"><span>End Date</span></label><input required type="date" value={form.endDate} onChange={(e) => setF("endDate", e.target.value)} /></div>
              <div className="field"><label className="field-label"><span>Country to be Visited</span></label><input value={form.countryVisited} onChange={(e) => setF("countryVisited", e.target.value)} /></div>
              <div className="field"><label className="field-label"><span>Country of Residence</span></label><input value={form.countryOfResidence} onChange={(e) => setF("countryOfResidence", e.target.value)} /></div>
              <div className="field"><label className="field-label"><span>Deductible</span></label><input value={form.deductible} onChange={(e) => setF("deductible", e.target.value)} /></div>
              <div className="field"><label className="field-label"><span>Nominee Name</span></label><input value={form.nomineeName} onChange={(e) => setF("nomineeName", e.target.value)} /></div>
            </div>

            {selectedPlan && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>Coverages copied from "{selectedPlan.name}"</div>
                <table className="data-table">
                  <thead><tr><th>Category</th><th>Cover</th><th>Sub-Cover</th><th>Sum Insured</th><th>Sub-Limit</th></tr></thead>
                  <tbody>
                    {selectedPlan.coverages.map((c) => (
                      <tr key={c.id}><td>{c.category}</td><td>{c.coverageName}</td><td>{c.subCoverName || "—"}</td><td>{c.sumInsured}</td><td>{c.subLimitText || "—"}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <h4 style={{ marginTop: 20, marginBottom: 8, fontSize: 13 }}>Insured Members (point 12 — a claim can only be raised for these)</h4>
            {members.map((m, i) => (
              <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
                <div className="field" style={{ flex: 2, minWidth: 160 }}>
                  <label className="field-label"><span>Name</span></label>
                  <input value={m.name} onChange={(e) => setMember(i, "name", e.target.value)} placeholder="Full name" />
                </div>
                <div className="field" style={{ flex: 1, minWidth: 120 }}>
                  <label className="field-label"><span>Relationship</span></label>
                  <input value={m.relationship} onChange={(e) => setMember(i, "relationship", e.target.value)} placeholder="Self / Spouse / Child" />
                </div>
                <div className="field" style={{ flex: 1, minWidth: 140 }}>
                  <label className="field-label"><span>Passport Number</span></label>
                  <input value={m.passportNumber} onChange={(e) => setMember(i, "passportNumber", e.target.value)} />
                </div>
                <div className="field" style={{ flex: 1, minWidth: 140 }}>
                  <label className="field-label"><span>DOB</span></label>
                  <input type="date" value={m.dob} onChange={(e) => setMember(i, "dob", e.target.value)} />
                </div>
                <SecondaryBtn onClick={() => removeMemberRow(i)}>Remove</SecondaryBtn>
              </div>
            ))}
            <SecondaryBtn onClick={addMemberRow}>+ Add Member</SecondaryBtn>

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
            <thead><tr><th>Policy Number</th><th>Holder</th><th>Plan</th><th>Coverages</th><th>Members</th><th>Feed Status</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {policies.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontFamily: "monospace" }}>{p.policyNumber}</td>
                  <td>{p.owner?.name || <span style={{ color: "var(--muted)" }}>Pending owner</span>}<div style={{ fontSize: 11, color: "var(--muted)" }}>{p.owner?.email}</div></td>
                  <td>{p.planName}</td>
                  <td>{p.coverages.length}</td>
                  <td>{p.members?.length ?? 0}</td>
                  <td>{p.completionStatus === "ACTIVE" ? <Badge color="#1D8A5F" bg="#DEF3E9">Active</Badge> : <Badge color="#B5790C" bg="#FBF0D6">Draft (feed incomplete)</Badge>}</td>
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