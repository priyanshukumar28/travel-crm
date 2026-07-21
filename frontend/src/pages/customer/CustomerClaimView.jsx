import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import client from "../../api/client";
import DocumentUpload from "../../components/DocumentUpload";
import LinkedClaims from "../../components/LinkedClaims";
import { INTIMATION_SCHEMA } from "../../lib/fieldSchemas";
import { CATEGORY_LABELS } from "../../lib/catalog";
import {
  Card, InfoTile, PrimaryBtn, SecondaryBtn, EmptyNote,
  StageStepper, SchemaGroup, StatusBadge, memberNamesForClaim, Badge,
} from "../../components/ui";

export default function CustomerClaimView() {
  const { id } = useParams();
  const [claim, setClaim] = useState(null);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    const { data } = await client.get(`/claims/${id}`);
    setClaim(data);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (!claim) return <EmptyNote text="Loading claim…" />;

  const setField = (fid, value) => {
    setClaim((c) => ({ ...c, intimationData: { ...c.intimationData, [fid]: value } }));
  };

  const saveIntimation = async () => {
    setSaving(true);
    await client.patch(`/claims/${id}/intimation`, { intimationData: claim.intimationData });
    setSaving(false);
  };

  const submit = async () => {
    await saveIntimation();
    const { data } = await client.post(`/claims/${id}/submit-intimation`);
    setClaim((c) => ({ ...c, status: data.status }));
    await load();
  };

  const resubmit = async () => {
    await saveIntimation();
    const { data } = await client.post(`/claims/${id}/resubmit`);
    setClaim((c) => ({ ...c, status: data.status }));
    await load();
  };

  const canEditIntimation = claim.stage === "INTIMATION" && ["DRAFT", "DEFICIENT"].includes(claim.status);

  return (
    <div>
      <SecondaryBtn onClick={() => navigate("/customer")}>← Back to My Policy</SecondaryBtn>
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

        {claim.coverageItems?.length > 0 && (
          <div className="grid-2" style={{ marginBottom: 16 }}>
            {claim.coverageItems.map((it, i) => (
              <InfoTile
                key={i}
                label={`${it.coverageName}${it.subCoverName ? ` — ${it.subCoverName}` : ""}`}
                value={`Initial Reserve: ${it.currency || "USD"} ${it.initialReserve || 0}${it.payableAmount ? ` · Payable: ${it.payableAmount}` : ""}`}
              />
            ))}
          </div>
        )}

        {claim.status === "DEFICIENT" && (
          <div className="login-error" style={{ marginBottom: 16 }}>
            A deficiency was raised on this claim: <strong>{claim.deficiencyReason}</strong>. Please correct the
            details below and resubmit.
          </div>
        )}

        {claim.stage === "INTIMATION" ? (
          <>
            {INTIMATION_SCHEMA.map((g, i) => (
              <SchemaGroup
                key={g.title}
                group={g}
                data={claim.intimationData}
                onChange={setField}
                role="CUSTOMER"
                stage="INTIMATION"
                defaultOpen={i < 1}
              />
            ))}
            <div className="action-bar">
              {canEditIntimation && <SecondaryBtn onClick={saveIntimation} disabled={saving}>Save Draft</SecondaryBtn>}
              {claim.status === "DRAFT" && <PrimaryBtn onClick={submit}>Submit Claim Intimation</PrimaryBtn>}
              {claim.status === "DEFICIENT" && <PrimaryBtn onClick={resubmit}>Resubmit for Validation</PrimaryBtn>}
              {claim.status === "SUBMITTED_FOR_VALIDATION" && (
                <EmptyNote text="Your claim has been submitted and is awaiting first-level validation by our claims team." />
              )}
            </div>
          </>
        ) : (
          <>
            <div className="grid-2">
              <InfoTile label="Insurer Claim Intimation No." value={claim.insurerClaimIntimationNo} />
              <InfoTile label="Insurer Claim Registration No." value={claim.insurerClaimRegistrationNo} />
              <InfoTile label="Current Stage" value={claim.stage} />
              <InfoTile label="Status" value={claim.status.replaceAll("_", " ")} />
            </div>
            <p style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 16 }}>
              Registration and assessment are handled by our claims desk and the insurer. You'll be notified by
              email as your claim progresses — no further action is needed from you right now.
            </p>
            {claim.status === "APPROVED" && claim.paymentData?.finalPayableAmount && (
              <InfoTile label="Approved Payable Amount" value={`₹${claim.paymentData.finalPayableAmount}`} />
            )}
            {claim.status === "REJECTED" && (
              <div className="login-error" style={{ marginTop: 12 }}>
                This claim was not admissible and has been repudiated by the insurer.
                {claim.assessmentData?.insurerRemarks ? ` Reason: ${claim.assessmentData.insurerRemarks}` : ""}
              </div>
            )}
          </>
        )}
      </Card>

      <LinkedClaims claimId={id} basePath="/customer/claims" />

      <DocumentUpload claimId={id} />
    </div>
  );
}