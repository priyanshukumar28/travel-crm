// Validates a policy payload from the insurer feed against the plan it
// claims to be issued under. Runs on every single feed call — since data
// arrives incrementally, only the fields actually present in *this* call
// are checked; fields that haven't arrived yet are simply skipped rather
// than treated as missing.

function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function parseNumber(value) {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(String(value).replace(/[^0-9.-]/g, ""));
  return isNaN(n) ? null : n;
}

// `plan` is a PlanTemplate row (with `coverages` included) or null if the
// payload's Plan name doesn't match anything in the catalog yet.
function validatePolicyPayload(payload, { plan, existingPolicy } = {}) {
  const errors = [];

  const startDate = parseDate(payload["Policy Start Date"]);
  const endDate = parseDate(payload["Policy End Date"]);
  if (payload["Policy Start Date"] && !startDate) errors.push({ field: "Policy Start Date", message: "Not a valid date." });
  if (payload["Policy End Date"] && !endDate) errors.push({ field: "Policy End Date", message: "Not a valid date." });
  if (startDate && endDate && startDate >= endDate) {
    errors.push({ field: "Policy End Date", message: "Must be after Policy Start Date." });
  }

  const email = payload["Email id"];
  if (email !== undefined && email !== "" && !/^\S+@\S+\.\S+$/.test(String(email))) {
    errors.push({ field: "Email id", message: "Not a valid email address." });
  }

  const planName = payload["Plan name"];
  if (planName && !plan) {
    errors.push({ field: "Plan name", message: `"${planName}" does not match any configured plan — create it under Admin → Plans first, or check spelling.` });
  }

  // The core plan-based check: Sum Insured supplied by the insurer cannot
  // exceed the overall Sum Insured configured on the matched plan.
  const sumInsured = parseNumber(payload["Sum Insured"]);
  if (sumInsured !== null && plan) {
    const planMaxSI = Math.max(0, ...plan.coverages.map((c) => c.sumInsured || 0));
    if (planMaxSI > 0 && sumInsured > planMaxSI) {
      errors.push({
        field: "Sum Insured",
        message: `USD/INR ${sumInsured.toLocaleString()} exceeds the "${plan.name}" plan's maximum Sum Insured of ${planMaxSI.toLocaleString()}.`,
      });
    }
  }
  if (payload["Sum Insured"] !== undefined && payload["Sum Insured"] !== "" && sumInsured === null) {
    errors.push({ field: "Sum Insured", message: "Not a valid number." });
  }

  // Deductible is a soft, informational check (deductible text varies too
  // much to hard-fail on) — only flagged if the plan has a specific
  // deductible on file and the incoming value looks totally unrelated.
  const deductible = payload["Deductible"];
  if (deductible && plan) {
    const knownDeductibles = new Set(plan.coverages.map((c) => (c.deductible || "").trim()).filter(Boolean));
    if (knownDeductibles.size > 0 && !knownDeductibles.has(String(deductible).trim()) && String(deductible).trim().toUpperCase() !== "N/A") {
      errors.push({
        field: "Deductible",
        message: `"${deductible}" does not match any deductible configured on the "${plan.name}" plan — double-check with the insurer, this is a warning, not a hard block.`,
        severity: "warning",
      });
    }
  }

  // Policy Number is the only field that's always mandatory — every feed
  // call has to say which policy it's talking about, since calls merge
  // incrementally by policy number.
  if (!payload["Policy Number"] || !String(payload["Policy Number"]).trim()) {
    errors.push({ field: "Policy Number", message: "Policy Number is required on every feed call." });
  }

  const hardErrors = errors.filter((e) => e.severity !== "warning");
  return { valid: hardErrors.length === 0, errors };
}

// A policy is considered ACTIVE (visible in Customer/Agent portals, usable
// for claims) only once every field needed to actually service a claim has
// arrived — before that it stays DRAFT.
function computeCompletionStatus(policy) {
  const required = [policy.holderName, policy.ownerId, policy.planName, policy.startDate, policy.endDate];
  return required.every(Boolean) ? "ACTIVE" : "DRAFT";
}

module.exports = { validatePolicyPayload, computeCompletionStatus, parseDate, parseNumber };