import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import client from "../../api/client";
import DocumentUpload from "../../components/DocumentUpload";
import {
  INTIMATION_SCHEMA, REGISTRATION_SCHEMA,
  ASSESSMENT_CORE, ASSESSMENT_MEDICAL, ASSESSMENT_PA, ASSESSMENT_NONMED, ASSESSMENT_COMMON,
} from "../../lib/fieldSchemas";
import {
  Card, PrimaryBtn, SecondaryBtn, DangerBtn, EmptyNote,
  StageStepper, SchemaGroup, StatusBadge,
} from "../../components/ui";

const TABS = ["Assessment", "Documents", "Intimation (read-only)", "Registration (read-only)", "Activity Log"];

export default function InsurerClaimWorkspace() {
  const { id } = useParams();
  const [claim, setClaim] = useState(null);
  const [tab, setTab] = useState("Assessment");
  const [remarks, setRemarks] = useState("");
  const navigate = useNavigate();

  const load = useCallback(async () => {
    const { data } = await client.get(`/claims/${id}`);
    setClaim(data);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (!claim) return <EmptyNote text="Loading claim…" />;

  const setAssessmentField = (fid, v) => setClaim((c) => ({ ...c, assessmentData: { ...c.assessmentData, [fid]: v } }));
  const saveAssessment = async () => client.patch(`/claims/${id}/assessment`, { assessmentData: claim.assessmentData });

  const decide = async (decision) => {
    await saveAssessment();
    await client.post(`/claims/${id}/decision`, { decision, remarks });
    await load();
  };

  const isMedical = claim.claimType === "MEDICAL";
  const editable = claim.stage === "ASSESSMENT";

  return (
    <div>
      <SecondaryBtn onClick={() => navigate("/insurer")}>← Back to Queue</SecondaryBtn>
      <div style={{ height: 14 }} />

      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 4 }}>
          <div>
            <div style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--brand-blue-dark)" }}>{claim.claimNumber}</div>
            <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{claim.claimType} · {claim.coverages.join(", ")}</div>
          </div>
          <StatusBadge status={claim.status} />
        </div>

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
            {isMedical ? (
              <>
                {ASSESSMENT_MEDICAL.map((g) => <SchemaGroup key={g.title} group={g} data={claim.assessmentData} onChange={setAssessmentField} role="INSURER" stage="ASSESSMENT" />)}
                {ASSESSMENT_PA.map((g) => <SchemaGroup key={g.title} group={g} data={claim.assessmentData} onChange={setAssessmentField} role="INSURER" stage="ASSESSMENT" />)}
              </>
            ) : (
              ASSESSMENT_NONMED.map((g) => <SchemaGroup key={g.title} group={g} data={claim.assessmentData} onChange={setAssessmentField} role="INSURER" stage="ASSESSMENT" />)
            )}
            {ASSESSMENT_COMMON.map((g) => <SchemaGroup key={g.title} group={g} data={claim.assessmentData} onChange={setAssessmentField} role="INSURER" stage="ASSESSMENT" />)}

            {editable ? (
              <Card title="Decision">
                <div className="field" style={{ maxWidth: 480, marginBottom: 12 }}>
                  <label className="field-label"><span>Remarks (shown to Agent / Customer if returned or rejected)</span></label>
                  <textarea rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
                </div>
                <div className="action-bar">
                  <SecondaryBtn onClick={saveAssessment}>Save Draft</SecondaryBtn>
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

        {tab === "Documents" && <DocumentUpload claimId={id} />}

        {tab === "Intimation (read-only)" &&
          INTIMATION_SCHEMA.map((g) => (
            <SchemaGroup key={g.title} group={g} data={claim.intimationData} onChange={() => {}} role="VIEW" stage="NONE" />
          ))}

        {tab === "Registration (read-only)" &&
          REGISTRATION_SCHEMA.map((g) => (
            <SchemaGroup key={g.title} group={g} data={claim.registrationData} onChange={() => {}} role="VIEW" stage="NONE" />
          ))}

        {tab === "Activity Log" && (
          <div>
            {claim.activityLogs?.map((l) => (
              <div key={l.id} style={{ display: "flex", gap: 12, fontSize: 12.5, borderBottom: "1px solid var(--line)", padding: "9px 0" }}>
                <span style={{ fontWeight: 700 }}>{l.role}</span>
                <span>{l.action}</span>
                <span style={{ marginLeft: "auto", color: "var(--muted)" }}>{new Date(l.createdAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}