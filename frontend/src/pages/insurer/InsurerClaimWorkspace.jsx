import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import client from "../../api/client";
import DocumentUpload from "../../components/DocumentUpload";
import LinkedClaims from "../../components/LinkedClaims";
import CoverageItemsEditor from "../../components/CoverageItemsEditor";
import {
  INTIMATION_SCHEMA, REGISTRATION_SCHEMA,
  ASSESSMENT_CORE, ASSESSMENT_COMMON,
} from "../../lib/fieldSchemas";
import { FALLBACK_COVER_NAMES, MEDICAL_SUB_COVERS, CATEGORY_LABELS } from "../../lib/catalog";
import {
  Card, PrimaryBtn, SecondaryBtn, DangerBtn, EmptyNote,
  StageStepper, SchemaGroup, StatusBadge, Badge, memberNamesForClaim,
} from "../../components/ui";
import { SOURCE_META } from "../../lib/permissions";

const TABS = ["Assessment", "Coverage Items", "Documents", "Intimation (read-only)", "Registration (read-only)", "Activity Log & Remarks"];

export default function InsurerClaimWorkspace() {
  const { id } = useParams();
  const [claim, setClaim] = useState(null);
  const [tab, setTab] = useState("Assessment");
  const [remarks, setRemarks] = useState("");
  const [remarkText, setRemarkText] = useState("");
  const [validationErrors, setValidationErrors] = useState([]);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    const { data } = await client.get(`/claims/${id}`);
    setClaim(data);
  }, [id]);
  useEffect(() => { load(); }, [load]);

  if (!claim) return <EmptyNote text="Loading claim…" />;

  const setAssessmentField = (fid, v) => setClaim((c) => ({ ...c, assessmentData: { ...c.assessmentData, [fid]: v } }));
  const setCoverageItems = (items) => setClaim((c) => ({ ...c, coverageItems: items }));
  const saveAssessment = async () => client.patch(`/claims/${id}/assessment`, { assessmentData: claim.assessmentData });
  const saveCoverageItems = async () => {
    setValidationErrors([]);
    try {
      // Point 18: server validates payable against the policy's own sum
      // insured for Medical Expenses / Evacuation / Repatriation.
      await client.patch(`/claims/${id}/coverage-items`, { coverageItems: claim.coverageItems });
    } catch (err) {
      if (err.response?.status === 400 && err.response.data.errors) {
        setValidationErrors(err.response.data.errors);
      }
      throw err;
    }
  };

  const decide = async (decision) => {
    await saveAssessment();
    try { await saveCoverageItems(); } catch { return; }
    await client.post(`/claims/${id}/decision`, { decision, remarks });
    await load();
  };
  const submitRemark = async () => {
    if (!remarkText.trim()) return;
    await client.post(`/claims/${id}/remarks`, { message: remarkText.trim() });
    setRemarkText("");
    await load();
  };

  const editable = claim.stage === "ASSESSMENT";

  return (
    <div>
      <SecondaryBtn onClick={() => navigate("/insurer")}>← Back to Queue</SecondaryBtn>
      <div style={{ height: 14 }} />

      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 4 }}>
          <div>
            <div style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--brand-blue-dark)" }}>{claim.claimNumber}</div>
            <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{CATEGORY_LABELS[claim.claimCategory] || claim.claimCategory} · {claim.coverages.join(", ")}</div>
          </div>
          <StatusBadge status={claim.status} />
        </div>

        {memberNamesForClaim(claim).length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "10px 0 16px", padding: "10px 14px", background: "var(--brand-orange-soft)", borderRadius: "var(--radius-sm)" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--brand-orange-dark)" }}>Claim for:</span>
            {memberNamesForClaim(claim).map((m) => (
              <Badge key={m.id} color="#B5790C" bg="#FBF0D6">{m.name}{m.relationship ? ` (${m.relationship})` : ""}</Badge>
            ))}
          </div>
        )}

        <StageStepper stage={claim.stage} />

        <div className="tabs">
          {TABS.map((t) => (
            <button key={t} className={`tab-btn ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>

        {tab === "Assessment" && (
          <>
            {ASSESSMENT_CORE.map((g, i) => (
              <SchemaGroup key={g.title} group={g} data={claim.assessmentData} onChange={setAssessmentField} role="INSURER" stage="ASSESSMENT" defaultOpen={i === 0} />
            ))}
            <div className="empty-note" style={{ marginBottom: 14 }}>
              Per-coverage assessment details (GST %, Total Bill Amount, Deductible, Disallowed Amount, Type of
              Incident, % Disability, Max Allowable SI, etc.) are filled in on the <strong>Coverage Items</strong> tab —
              click "Details" on each coverage row there, since each coverage on this claim needs its own values.
            </div>
            {ASSESSMENT_COMMON.map((g) => <SchemaGroup key={g.title} group={g} data={claim.assessmentData} onChange={setAssessmentField} role="INSURER" stage="ASSESSMENT" />)}

            {validationErrors.length > 0 && (
              <div className="login-error" style={{ marginBottom: 14 }}>
                <strong>Sub-limit validation failed — nothing was saved:</strong>
                {validationErrors.map((e, i) => <div key={i}>{e}</div>)}
              </div>
            )}

            {editable ? (
              <Card title="Decision">
                <div className="field" style={{ maxWidth: 480, marginBottom: 12 }}>
                  <label className="field-label"><span>Remarks (shown to Agent / Customer if returned or rejected)</span></label>
                  <textarea rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
                </div>
                <div className="action-bar">
                  <SecondaryBtn onClick={() => saveCoverageItems().then(saveAssessment).catch(() => {})}>Save Draft</SecondaryBtn>
                  <SecondaryBtn onClick={() => decide("RETURNED")}>Return to Agent</SecondaryBtn>
                  <DangerBtn onClick={() => decide("REJECTED")}>Reject (Repudiate)</DangerBtn>
                  <PrimaryBtn onClick={() => decide("APPROVED")}>Approve →</PrimaryBtn>
                </div>
              </Card>
            ) : (
              <EmptyNote text={`Decision recorded: ${claim.status.replaceAll("_", " ")}`} />
            )}
          </>
        )}

        {tab === "Coverage Items" && (
          <Card title="Coverage Items" subtitle="Sub-limit, payable, GOP issue date and currency conversion per coverage">
            <CoverageItemsEditor items={claim.coverageItems || []} onChange={setCoverageItems} mode="review" coverNameCatalog={FALLBACK_COVER_NAMES} medicalSubCovers={MEDICAL_SUB_COVERS} />
            {validationErrors.length > 0 && (
              <div className="login-error" style={{ marginTop: 12 }}>{validationErrors.map((e, i) => <div key={i}>{e}</div>)}</div>
            )}
            {editable && (
              <div className="action-bar" style={{ marginTop: 16 }}>
                <SecondaryBtn onClick={() => saveCoverageItems().then(load).catch(() => {})}>Save Coverage Items</SecondaryBtn>
              </div>
            )}
          </Card>
        )}

        {tab === "Documents" && <DocumentUpload claimId={id} />}

        {tab === "Intimation (read-only)" && INTIMATION_SCHEMA.map((g) => (
          <SchemaGroup key={g.title} group={g} data={claim.intimationData} onChange={() => {}} role="VIEW" stage="NONE" />
        ))}
        {tab === "Registration (read-only)" && REGISTRATION_SCHEMA.map((g) => (
          <SchemaGroup key={g.title} group={g} data={claim.registrationData} onChange={() => {}} role="VIEW" stage="NONE" />
        ))}

        {tab === "Activity Log & Remarks" && (
          <div>
            <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
              <input value={remarkText} onChange={(e) => setRemarkText(e.target.value)} placeholder="Add a remark" style={{ flex: 1, border: "1px solid var(--line)", borderRadius: 8, padding: "9px 11px", fontSize: 13 }} onKeyDown={(e) => e.key === "Enter" && submitRemark()} />
              <PrimaryBtn onClick={submitRemark}>Add Remark</PrimaryBtn>
            </div>
            {claim.activityLogs?.map((l) => (
              <div key={l.id} style={{ display: "flex", gap: 12, fontSize: 12.5, borderBottom: "1px solid var(--line)", padding: "9px 0" }}>
                <Badge color={SOURCE_META[l.role?.toLowerCase()]?.color || "#667085"} bg={SOURCE_META[l.role?.toLowerCase()]?.bg || "#EEF0F4"}>{l.role}</Badge>
                <span>{l.action}</span>
                <span style={{ color: "var(--muted)" }}>({l.user?.name})</span>
                <span style={{ marginLeft: "auto", color: "var(--muted)" }}>{new Date(l.createdAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <LinkedClaims claimId={id} basePath="/insurer/claims" />
    </div>
  );
}