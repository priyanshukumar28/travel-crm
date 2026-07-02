// Central rule for "who can edit this field right now" — shared by every
// stage of the claim so the UI and the mental model stay in one place.
//
// Field "source" tags mirror the provenance markers used in the client's own
// wireframes (Autofill / Agent / Insurer / Customer / System). Ownership of a
// whole *stage* has moved as per the latest requirements:
//   - Intimation  -> Customer portal (self-service) OR Agent portal (on behalf)
//   - Registration -> Agent portal ONLY (never shown to the Customer)
//   - Assessment   -> Insurer portal ONLY
//   - Payment      -> Agent portal (processes payment / UTR) + Insurer inputs
//
// So editability is really "does my role own this stage", refined by the
// field's tag only to decide *which* fields within that stage are theirs
// vs. read-only autofill/system values.

export function isFieldEditable({ role, source, stage }) {
  if (source === "autofill" || source === "system") return false;

  if (stage === "INTIMATION") {
    if (role === "CUSTOMER") return source === "customer";
    if (role === "AGENT") return source === "customer" || source === "agent";
    return false;
  }

  if (stage === "REGISTRATION") {
    // Registration lives only in the Agent portal.
    return role === "AGENT" && (source === "agent" || source === "customer");
  }

  if (stage === "ASSESSMENT") {
    // Assessment lives only in the Insurer portal.
    return role === "INSURER" && (source === "agent" || source === "insurer");
  }

  if (stage === "PAYMENT") {
    if (role === "AGENT") return source === "agent";
    if (role === "INSURER") return source === "insurer";
    return false;
  }

  return false;
}

export const SOURCE_META = {
  customer: { label: "Customer", color: "#1D4FA0", bg: "#E8EFFB" },
  agent: { label: "Agent", color: "#B5790C", bg: "#FBF0D6" },
  insurer: { label: "Insurer", color: "#6D5BAF", bg: "#ECE8F8" },
  autofill: { label: "Autofill", color: "#667085", bg: "#EEF0F4" },
  system: { label: "System", color: "#1D8A5F", bg: "#DEF3E9" },
};

export const STAGES = ["INTIMATION", "REGISTRATION", "ASSESSMENT", "PAYMENT"];
export const STAGE_LABEL = {
  INTIMATION: "Intimation",
  REGISTRATION: "Registration",
  ASSESSMENT: "Assessment",
  PAYMENT: "Payment",
  CLOSED: "Closed",
};

export function statusColor(status) {
  const map = {
    DRAFT: { color: "#B5790C", bg: "#FBF0D6" },
    SUBMITTED_FOR_VALIDATION: { color: "#1D4FA0", bg: "#E8EFFB" },
    DEFICIENT: { color: "#C6402A", bg: "#FBE4DE" },
    VALIDATED: { color: "#1D4FA0", bg: "#E8EFFB" },
    INTIMATED_WITH_INSURER: { color: "#6D5BAF", bg: "#ECE8F8" },
    SUBMITTED_TO_INSURER: { color: "#6D5BAF", bg: "#ECE8F8" },
    RETURNED_BY_INSURER: { color: "#B5790C", bg: "#FBF0D6" },
    APPROVED: { color: "#1D8A5F", bg: "#DEF3E9" },
    REJECTED: { color: "#C6402A", bg: "#FBE4DE" },
    PAYMENT_PROCESSED: { color: "#1D8A5F", bg: "#DEF3E9" },
    CLOSED: { color: "#667085", bg: "#EEF0F4" },
  };
  return map[status] || { color: "#667085", bg: "#EEF0F4" };
}

export function statusLabel(status) {
  return (status || "").replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}
