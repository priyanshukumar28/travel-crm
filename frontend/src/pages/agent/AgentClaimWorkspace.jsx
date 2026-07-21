import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import client from "../../api/client";
import DocumentUpload from "../../components/DocumentUpload";
import LinkedClaims from "../../components/LinkedClaims";
import CoverageItemsEditor from "../../components/CoverageItemsEditor";
import { INTIMATION_SCHEMA, REGISTRATION_SCHEMA } from "../../lib/fieldSchemas";
import { FALLBACK_COVER_NAMES, MEDICAL_SUB_COVERS, CATEGORY_LABELS } from "../../lib/catalog";
import {
  Card, InfoTile, PrimaryBtn, SecondaryBtn, DangerBtn, EmptyNote,
  StageStepper, SchemaGroup, StatusBadge, FieldRow, Badge,
} from "../../components/ui";
import { SOURCE_META } from "../../lib/permissions";

const TABS = ["Intimation", "Registration", "Coverage Items", "TAT & Escalation", "Documents", "Payment", "Activity Log & Remarks"];
const QUEUE_BADGE = {
  "Documents Yet to Receive": { color: "#B5790C", bg: "#FBF0D6" },
  "Under Observation": { color: "#1D4FA0", bg: "#E8EFFB" },
  "Reminder 1": { color: "#B5790C", bg: "#FBF0D6" },
  "Reminder 2": { color: "#B5790C", bg: "#FBF0D6" },
  "Reminder 3": { color: "#C6402A", bg: "#FBE4DE" },
  "Reminder 4": { color: "#C6402A", bg: "#FBE4DE" },
  "Deficient Claim": { color: "#C6402A", bg: "#FBE4DE" },
  "Closed": { color: "#667085", bg: "#EEF0F4" },
};

export default function AgentClaimWorkspace() {
  const { id } = useParams();
  const [claim, setClaim] = useState(null);
  const [tab, setTab] = useState("Intimation");
  const [deficiencyReason, setDeficiencyReason] = useState("");
  const [remarkText, setRemarkText] = useState("");
  const [validationErrors, setValidationErrors] = useState([]);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    const { data } = await client.get(`/claims/${id}`);
    setClaim(data);
  }, [id]);
  useEffect(() => { load(); }, [load]);

  if (!claim) return <EmptyNote text="Loading claim…" />;

  const setIntimationField = (fid, v) => setClaim((c) => ({ ...c, intimationData: { ...c.intimationData, [fid]: v } }));
  const setRegistrationField = (fid, v) => setClaim((c) => ({ ...c, registrationData: { ...c.registrationData, [fid]: v } }));
  const setPaymentField = (fid, v) => setClaim((c) => ({ ...c, paymentData: { ...c.paymentData, [fid]: v } }));
  const setCoverageItems = (items) => setClaim((c) => ({ ...c, coverageItems: items }));

  const saveIntimation = async () => client.patch(`/claims/${id}/intimation`, { intimationData: claim.intimationData });
  const saveRegistration = async () => client.patch(`/claims/${id}/registration`, { registrationData: claim.registrationData });
  const savePayment = async () => client.patch(`/claims/${id}/payment`, { paymentData: claim.paymentData });
  const saveCoverageItems = async () => {
    setValidationErrors([]);
    try {
      await client.patch(`/claims/${id}/coverage-items`, { coverageItems: claim.coverageItems }); // point 18 validation happens server-side
    } catch (err) {
      if (err.response?.status === 400 && err.response.data.errors) setValidationErrors(err.response.data.errors);
      throw err;
    }
  };

  const passValidation = async () => {
    await saveIntimation();
    await client.post(`/claims/${id}/validate`, { deficient: false });
    setTab("Registration");
    await load();
  };
  const raiseDeficiency = async () => {
    await client.post(`/claims/${id}/validate`, { deficient: true, reason: deficiencyReason || "Missing documents / incorrect data" });
    await load();
  };
  const sendReminder = async () => { await client.post(`/claims/${id}/send-reminder`); await load(); };
  const closeDeficient = async () => { await client.post(`/claims/${id}/close-deficient`); await load(); };
  const submitToInsurer = async () => {
    await saveRegistration();
    try { await saveCoverageItems(); } catch { return; }
    await client.post(`/claims/${id}/submit-to-insurer`);
    await load();
  };
  const processPayment = async () => { await savePayment(); await client.post(`/claims/${id}/close`); await load(); };
  const submitRemark = async () => {
    if (!remarkText.trim()) return;
    await client.post(`/claims/${id}/remarks`, { message: remarkText.trim() });
    setRemarkText("");
    await load();
  };

  const stageIdx = ["INTIMATION", "REGISTRATION", "ASSESSMENT", "PAYMENT"].indexOf(claim.stage);
  const canEditCoverageItems = ["INTIMATION", "REGISTRATION"].includes(claim.stage);
  const qb = QUEUE_BADGE[claim.queueBucket] || {};
  const reserveChangeLogs = (claim.activityLogs || []).filter((l) => l.meta?.type === "reserve_change");

  return (
    <div>
      <SecondaryBtn onClick={() => navigate("/agent")}>← Back to Claims Queue</SecondaryBtn>
      <div style={{ height: 14 }} />

      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 4 }}>
          <div>
            <div style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--brand-blue-dark)" }}>{claim.claimNumber}</div>
            <div style={{ fontSize: 11.5, color: "var(--muted)" }}>
              {CATEGORY_LABELS[claim.claimCategory] || claim.claimCategory} · {claim.coverages.join(", ")} · Policy {claim.policy?.policyNumber}
              {claim.parentClaimNumber && <> · Linked group: <code>{claim.parentClaimNumber}</code></>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Badge color={qb.color} bg={qb.bg}>{claim.queueBucket}</Badge>
            <StatusBadge status={claim.status} />
          </div>
        </div>

        <StageStepper stage={claim.stage} />

        <div className="tabs">
          {TABS.map((t) => (
            <button key={t} className={`tab-btn ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>

        {tab === "Intimation" && (
          <>
            {INTIMATION_SCHEMA.map((g, i) => (
              <SchemaGroup key={g.title} group={g} data={claim.intimationData} onChange={setIntimationField} role="AGENT" stage="INTIMATION" defaultOpen={i < 1} />
            ))}
            {claim.status === "SUBMITTED_FOR_VALIDATION" && (
              <Card title="First-Level Validation" subtitle="Check policy validity, data completeness, document availability, coverage eligibility & limits">
                <div className="field" style={{ maxWidth: 420, marginBottom: 12 }}>
                  <label className="field-label"><span>Deficiency reason (if raising one)</span></label>
                  <input value={deficiencyReason} onChange={(e) => setDeficiencyReason(e.target.value)} placeholder="e.g. Missing discharge summary" />
                </div>
                <div className="action-bar">
                  <DangerBtn onClick={raiseDeficiency}>Raise Deficiency</DangerBtn>
                  <PrimaryBtn onClick={passValidation}>Pass Validation → Registration</PrimaryBtn>
                </div>
              </Card>
            )}
            {claim.stage === "INTIMATION" && claim.status !== "SUBMITTED_FOR_VALIDATION" && (
              <div className="action-bar"><SecondaryBtn onClick={saveIntimation}>Save Changes</SecondaryBtn></div>
            )}
          </>
        )}

        {tab === "Registration" && (
          stageIdx < 1 ? <EmptyNote text="Registration unlocks once first-level validation is passed on Intimation." /> : (
            <>
              {REGISTRATION_SCHEMA.map((g, i) => (
                <SchemaGroup key={g.title} group={g} data={claim.registrationData} onChange={setRegistrationField} role="AGENT" stage="REGISTRATION" defaultOpen={i === 0} />
              ))}
              <div className="action-bar">
                <SecondaryBtn onClick={saveRegistration}>Save Changes</SecondaryBtn>
                {claim.stage === "REGISTRATION" && (
                  <PrimaryBtn onClick={submitToInsurer}>{claim.status === "RETURNED_BY_INSURER" ? "Resubmit to Insurer →" : "Submit Intimation & Registration to Insurer (API) →"}</PrimaryBtn>
                )}
              </div>
              {validationErrors.length > 0 && (
                <div className="login-error" style={{ marginTop: 12 }}>{validationErrors.map((e, i) => <div key={i}>{e}</div>)}</div>
              )}
              {claim.insurerClaimIntimationNo && (
                <div className="grid-2" style={{ marginTop: 16 }}>
                  <InfoTile label="Insurer Claim Intimation No." value={claim.insurerClaimIntimationNo} />
                  <InfoTile label="Insurer Claim Registration No." value={claim.insurerClaimRegistrationNo} />
                </div>
              )}
            </>
          )
        )}

        {tab === "Coverage Items" && (
          <Card title="Coverage Items" subtitle="Currency, sub-limit and payable per coverage — validated against the policy's sum insured for Medical Expenses / Evacuation / Repatriation (point 18)">
            <CoverageItemsEditor items={claim.coverageItems || []} onChange={setCoverageItems} mode="review" coverNameCatalog={FALLBACK_COVER_NAMES} medicalSubCovers={MEDICAL_SUB_COVERS} />
            {validationErrors.length > 0 && (
              <div className="login-error" style={{ marginTop: 12 }}>{validationErrors.map((e, i) => <div key={i}>{e}</div>)}</div>
            )}
            {canEditCoverageItems && (
              <div className="action-bar" style={{ marginTop: 16 }}>
                <SecondaryBtn onClick={() => saveCoverageItems().then(load).catch(() => {})}>Save Coverage Items</SecondaryBtn>
              </div>
            )}
          </Card>
        )}

        {tab === "TAT & Escalation" && (
          <>
            <Card title="Queue Status" subtitle="Point 12/15 — TAT/escalation state for this claim">
              <div className="grid-2">
                <InfoTile label="Current Queue" value={claim.queueBucket} />
                <InfoTile label="Deficiency Reason" value={claim.deficiencyReason || "—"} />
                <InfoTile label="Reminders Sent" value={claim.deficiencyReminderCount || 0} />
                <InfoTile label="Last Reminder" value={claim.lastReminderAt ? new Date(claim.lastReminderAt).toLocaleString() : "—"} />
              </div>
              {claim.status === "DEFICIENT" && (
                <div className="action-bar" style={{ marginTop: 16 }}>
                  <SecondaryBtn onClick={sendReminder}>Send Next Reminder ({(claim.deficiencyReminderCount || 0) + 1})</SecondaryBtn>
                  {(claim.deficiencyReminderCount || 0) >= 4 && <DangerBtn onClick={closeDeficient}>Close — Documents Never Received</DangerBtn>}
                </div>
              )}
            </Card>
            <Card title="Reserve / Payable Change History" subtitle="Point 14 — who changed the reserve amount, from what to what, and when">
              {reserveChangeLogs.length === 0 ? <EmptyNote text="No reserve changes recorded yet." /> : (
                <table className="data-table">
                  <thead><tr><th>Coverage</th><th>Old Reserve</th><th>New Reserve</th><th>Old Payable</th><th>New Payable</th><th>By</th><th>When</th></tr></thead>
                  <tbody>
                    {reserveChangeLogs.flatMap((log) => (log.meta.changes || []).map((c, i) => (
                      <tr key={`${log.id}-${i}`}>
                        <td>{c.coverageName}</td><td>{c.oldReserve ?? "—"}</td><td>{c.newReserve ?? "—"}</td>
                        <td>{c.oldPayable ?? "—"}</td><td>{c.newPayable ?? "—"}</td>
                        <td>{log.user?.name}</td><td>{new Date(log.createdAt).toLocaleString()}</td>
                      </tr>
                    )))}
                  </tbody>
                </table>
              )}
            </Card>
          </>
        )}

        {tab === "Documents" && <DocumentUpload claimId={id} />}

        {tab === "Payment" && (
          stageIdx < 3 ? <EmptyNote text="Payment unlocks once the Insurer records a decision on the Assessment." /> : (
            <>
              {claim.status === "REJECTED" ? (
                <Card title="Repudiation">
                  <p style={{ fontSize: 12.5, color: "var(--muted)" }}>
                    Rejected by the Insurer{claim.assessmentData?.insurerRemarks ? `: ${claim.assessmentData.insurerRemarks}` : "."} Close the case to complete the file.
                  </p>
                  {claim.status !== "CLOSED" && <PrimaryBtn onClick={processPayment}>Close Case</PrimaryBtn>}
                </Card>
              ) : (
                <Card title="Payable Calculation & Payment Processing">
                  <div className="grid-2">
                    <FieldRow field={{ id: "finalPayableAmount", label: "Final Payable Amount", type: "number", source: "insurer" }} value={claim.paymentData?.finalPayableAmount} onChange={setPaymentField} role="INSURER" stage="PAYMENT" />
                    <FieldRow field={{ id: "utrNumber", label: "UTR Number", type: "text", source: "agent" }} value={claim.paymentData?.utrNumber} onChange={setPaymentField} role="AGENT" stage="PAYMENT" />
                    <FieldRow field={{ id: "gopIssued", label: "GOP Issued to Provider?", type: "select", options: ["Yes", "No"], source: "agent" }} value={claim.paymentData?.gopIssued} onChange={setPaymentField} role="AGENT" stage="PAYMENT" />
                  </div>
                  <div className="action-bar" style={{ marginTop: 16 }}>
                    <SecondaryBtn onClick={savePayment}>Save</SecondaryBtn>
                    {claim.stage !== "CLOSED" && <PrimaryBtn onClick={processPayment}>Process Payment & Close Case</PrimaryBtn>}
                  </div>
                </Card>
              )}
            </>
          )
        )}

        {tab === "Activity Log & Remarks" && (
          <div>
            <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
              <input value={remarkText} onChange={(e) => setRemarkText(e.target.value)} placeholder="Add a remark" style={{ flex: 1, border: "1px solid var(--line)", borderRadius: 8, padding: "9px 11px", fontSize: 13 }} onKeyDown={(e) => e.key === "Enter" && submitRemark()} />
              <PrimaryBtn onClick={submitRemark}>Add Remark</PrimaryBtn>
            </div>
            {claim.activityLogs?.map((l) => (
              <div key={l.id} style={{ display: "flex", gap: 12, fontSize: 12.5, borderBottom: "1px solid var(--line)", padding: "9px 0" }}>
                <Badge color={SOURCE_META[l.role?.toLowerCase()]?.color || "#667085"} bg={SOURCE_META[l.role?.toLowerCase()]?.bg || "#EEF0F4"}>{l.role}</Badge>
                <span style={{ fontWeight: l.meta?.isManualRemark ? 700 : 400 }}>{l.action}</span>
                <span style={{ color: "var(--muted)" }}>({l.user?.name})</span>
                <span style={{ marginLeft: "auto", color: "var(--muted)" }}>{new Date(l.createdAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <LinkedClaims claimId={id} basePath="/agent/claims" />
    </div>
  );
}