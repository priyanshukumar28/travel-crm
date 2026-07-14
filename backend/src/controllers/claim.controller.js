const prisma = require("../utils/prisma");
const { asyncHandler } = require("../middleware/errorHandler");
const { notifyClaimEvent } = require("../utils/notifications");
const {
  generateClaimNumber,
  generateParentClaimNumber,
  generateInsurerNumber,
} = require("../utils/ids");

async function logActivity(claimId, user, action, meta) {
  await prisma.activityLog.create({
    data: {
      claimId,
      userId: user.id,
      role: user.role,
      action,
      meta: meta || undefined,
    },
  });
}

async function getNotificationRecipients(claimId) {
  const claim = await prisma.claim.findUnique({
    where: { id: claimId },
    include: { policy: { include: { owner: true } }, createdBy: true },
  });

  const customerEmail = claim.intimationData?.commEmail || claim.policy.owner.email;

  // Handling agent: whoever created the claim if it was agent-initiated,
  // otherwise fall back to every seeded Agent account (single ops-desk
  // assumption for this MVP — swap for a real "assigned agent" field once
  // claims are routed to specific agents).
  let agentEmails = [];
  if (claim.createdByRole === "AGENT") {
    agentEmails = [claim.createdBy.email];
  } else {
    const agents = await prisma.user.findMany({ where: { role: "AGENT" }, select: { email: true } });
    agentEmails = agents.map((a) => a.email);
  }

  return { emails: [customerEmail, ...agentEmails] };
}

function scopeWhereForRole(user) {
  // Determines which claims a given logged-in user is allowed to see.
  if (user.role === "CUSTOMER") {
    return { policy: { ownerId: user.id } };
  }
  if (user.role === "AGENT") {
    // Agents see everything past the draft-only-visible-to-customer stage,
    // plus anything they personally created (including drafts).
    return {
      OR: [{ createdById: user.id }, { NOT: { status: "DRAFT" } }],
    };
  }
  if (user.role === "INSURER") {
    // Insurer only ever sees claims that have reached them.
    return {
      stage: { in: ["ASSESSMENT", "PAYMENT", "CLOSED"] },
    };
  }
  return {}; // SUPER_ADMIN sees all
}

// GET /api/claims
const listClaims = asyncHandler(async (req, res) => {
  const where = scopeWhereForRole(req.user);
  const claims = await prisma.claim.findMany({
    where,
    include: { policy: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(claims);
});

// GET /api/claims/:id
const getClaim = asyncHandler(async (req, res) => {
  const claim = await prisma.claim.findUnique({
    where: { id: req.params.id },
    include: {
      policy: { include: { coverages: true, members: true } },
      activityLogs: { orderBy: { createdAt: "asc" }, include: { user: true } },
    },
  });
  if (!claim) return res.status(404).json({ message: "Claim not found." });
  res.json(claim);
});

// GET /api/claims/:id/required-documents
// Point 1: computed live from the claim's actual coverageItems, not a
// hardcoded list — every claim can require a different document set.
const getRequiredDocuments = asyncHandler(async (req, res) => {
  const claim = await prisma.claim.findUnique({ where: { id: req.params.id } });
  if (!claim) return res.status(404).json({ message: "Claim not found." });

  const coverageNames = [...new Set((claim.coverageItems || []).map((i) => i.coverageName).filter(Boolean))];
  const rows = await prisma.documentRequirement.findMany({ where: { coverageName: { in: coverageNames } } });

  const uploaded = await prisma.document.findMany({ where: { claimId: claim.id }, select: { docType: true } });
  const uploadedTypes = new Set(uploaded.map((d) => d.docType));

  const documents = [];
  const seen = new Set();
  for (const row of rows) {
    for (const docType of row.requiredDocuments) {
      if (seen.has(docType)) continue;
      seen.add(docType);
      documents.push({ docType, forCoverage: row.coverageName, uploaded: uploadedTypes.has(docType) });
    }
  }
  res.json({ coverageNames, documents });
});

// POST /api/claims
// Body: { policyId, claimCategory, memberIds: string[], coverageItems: [{category, coverageName, subCoverName?, initialReserve}], intimationData }
// Callable by CUSTOMER (self-service) or AGENT (on behalf of a customer).
// Point 2/3/4/7/12: category picker, cover+sub-cover per item, multiple
// coverages at once each with its own initial reserve, and members are
// restricted to the ones actually on the policy.
const createClaim = asyncHandler(async (req, res) => {
  const { policyId, claimCategory, memberIds, coverageItems, intimationData } = req.body;

  if (!policyId || !claimCategory || !Array.isArray(coverageItems) || coverageItems.length === 0) {
    return res.status(400).json({ message: "policyId, claimCategory and at least one coverage item are required." });
  }

  const policy = await prisma.policy.findUnique({ where: { id: policyId }, include: { members: true } });
  if (!policy) return res.status(404).json({ message: "Policy not found." });

  if (req.user.role === "CUSTOMER" && policy.ownerId !== req.user.id) {
    return res.status(403).json({ message: "You can only initiate claims against your own policy." });
  }

  // Point 12 — a claim can only be raised for members who actually exist on this policy.
  const validMemberIds = new Set(policy.members.map((m) => m.id));
  const chosenMemberIds = (memberIds || []).filter((id) => validMemberIds.has(id));
  if ((memberIds || []).length > 0 && chosenMemberIds.length === 0) {
    return res.status(400).json({ message: "None of the selected members belong to this policy." });
  }

  const normalizedItems = coverageItems.map((item) => ({
    category: item.category || claimCategory,
    coverageName: item.coverageName,
    subCoverName: item.subCoverName || null,
    initialReserve: Number(item.initialReserve) || 0,
    subLimitAmount: null,
    payableAmount: null,
    gopIssueDate: null,
    remarks: item.remarks || null,
  }));

  const claim = await prisma.claim.create({
    data: {
      claimNumber: generateClaimNumber(claimCategory),
      parentClaimNumber: generateParentClaimNumber(),
      policyId,
      claimCategory,
      coverages: normalizedItems.map((i) => i.coverageName),
      memberIds: chosenMemberIds,
      coverageItems: normalizedItems,
      stage: "INTIMATION",
      status: "DRAFT",
      createdById: req.user.id,
      createdByRole: req.user.role === "AGENT" ? "AGENT" : "CUSTOMER",
      intimationData: intimationData || {},
    },
  });

  await logActivity(claim.id, req.user, "Claim initiated", { coverages: claim.coverages, claimCategory });
  res.status(201).json(claim);
});

// PATCH /api/claims/:id/coverage-items
// Point 4/7/8/9/10: lets the Agent (Registration) or Insurer (Assessment) fill
// in the per-coverage sub-limit, payable amount, GOP issue date and remarks
// that only become known once the claim moves past Intimation. Each item is
// matched by array index — the frontend always sends the full array back.
const updateCoverageItems = asyncHandler(async (req, res) => {
  const claim = await prisma.claim.findUnique({ where: { id: req.params.id } });
  if (!claim) return res.status(404).json({ message: "Claim not found." });

  const allowedStages = { AGENT: ["INTIMATION", "REGISTRATION"], INSURER: ["ASSESSMENT"], SUPER_ADMIN: ["INTIMATION", "REGISTRATION", "ASSESSMENT"] };
  const allowed = allowedStages[req.user.role];
  if (!allowed || !allowed.includes(claim.stage)) {
    return res.status(403).json({ message: "You cannot edit coverage items at this stage." });
  }

  if (!Array.isArray(req.body.coverageItems)) {
    return res.status(400).json({ message: "coverageItems[] is required." });
  }

  const updated = await prisma.claim.update({
    where: { id: claim.id },
    data: { coverageItems: req.body.coverageItems },
  });
  await logActivity(claim.id, req.user, "Coverage item details updated");
  res.json(updated);
});

// POST /api/claims/:id/remarks — Agent/Insurer, point 11
// A manual, attributable note — shows up in the same chronological Activity
// Log as every automatic system action, tagged with who wrote it and when.
const addRemark = asyncHandler(async (req, res) => {
  const claim = await prisma.claim.findUnique({ where: { id: req.params.id } });
  if (!claim) return res.status(404).json({ message: "Claim not found." });
  const { message } = req.body;
  if (!message || !message.trim()) return res.status(400).json({ message: "Remark text is required." });

  await logActivity(claim.id, req.user, `Remark: ${message.trim()}`, { isManualRemark: true });
  res.status(201).json({ message: "Remark added." });
});

// PATCH /api/claims/:id/intimation
// Editable while stage = INTIMATION, by the Customer (own claim) or the Agent.
const updateIntimation = asyncHandler(async (req, res) => {
  const claim = await prisma.claim.findUnique({ where: { id: req.params.id }, include: { policy: true } });
  if (!claim) return res.status(404).json({ message: "Claim not found." });

  if (claim.stage !== "INTIMATION") {
    return res.status(409).json({ message: "Intimation can no longer be edited — the claim has moved past this stage." });
  }
  if (req.user.role === "CUSTOMER" && claim.policy.ownerId !== req.user.id) {
    return res.status(403).json({ message: "Not your claim." });
  }
  if (!["CUSTOMER", "AGENT", "SUPER_ADMIN"].includes(req.user.role)) {
    return res.status(403).json({ message: "Only the Customer or an Agent can edit the intimation form." });
  }

  const merged = { ...claim.intimationData, ...req.body.intimationData };
  const updated = await prisma.claim.update({
    where: { id: claim.id },
    data: { intimationData: merged },
  });

  await logActivity(claim.id, req.user, "Intimation details updated");
  res.json(updated);
});

// POST /api/claims/:id/submit-intimation
// Moves status to SUBMITTED_FOR_VALIDATION so the Agent queue picks it up.
const submitIntimation = asyncHandler(async (req, res) => {
  const claim = await prisma.claim.findUnique({ where: { id: req.params.id } });
  if (!claim) return res.status(404).json({ message: "Claim not found." });
  if (claim.stage !== "INTIMATION") {
    return res.status(409).json({ message: "This claim has already moved past Intimation." });
  }

  const updated = await prisma.claim.update({
    where: { id: claim.id },
    data: { status: "SUBMITTED_FOR_VALIDATION" },
  });
  await logActivity(claim.id, req.user, "Submitted claim intimation");
  await notifyClaimEvent(updated, {
    subject: `Claim ${claim.claimNumber} received`,
    message: `Hi, we've received your claim intimation (${claim.claimNumber}) and it's now with our claims desk for first-level validation. We'll keep you posted.`,
    to: await getNotificationRecipients(claim.id),
  });
  res.json(updated);
});

// POST /api/claims/:id/validate  — Agent only
// body: { deficient: boolean, reason?: string }
const validateClaim = asyncHandler(async (req, res) => {
  const claim = await prisma.claim.findUnique({ where: { id: req.params.id } });
  if (!claim) return res.status(404).json({ message: "Claim not found." });
  if (claim.stage !== "INTIMATION") {
    return res.status(409).json({ message: "Only claims still in Intimation can be validated." });
  }

  const { deficient, reason } = req.body;

  if (deficient) {
    const updated = await prisma.claim.update({
      where: { id: claim.id },
      data: { status: "DEFICIENT", deficiencyReason: reason || "Missing documents / incorrect data" },
    });
    await logActivity(claim.id, req.user, "Deficiency raised", { reason });
    await notifyClaimEvent(updated, {
      subject: `Action needed on claim ${claim.claimNumber}`,
      message: `We found a deficiency on your claim ${claim.claimNumber}: ${reason || "missing documents / incorrect data"}. Please log in and resubmit with corrections. Reminders will follow every 15 days per our SOP.`,
      to: await getNotificationRecipients(claim.id),
    });
    return res.json(updated);
  }

  // Passed first-level validation — carry key fields forward into Registration
  // and unlock the Registration stage, which only the Agent portal can see.
  const carriedForward = {
    regFileClaim: "Yes",
    regClaimType: claim.claimCategory,
    regClaimantName: claim.intimationData.claimantName || claim.intimationData.m1Name,
    regClaimantMobile: claim.intimationData.claimantMobile || claim.intimationData.m1Contact,
    regCommEmail: claim.intimationData.commEmail,
    regCommMobile: claim.intimationData.commContact,
    regDateOfLoss: claim.intimationData.dateOfLoss,
    regCountryOfLoss: claim.intimationData.countryOfLoss,
    regAirlineName: claim.intimationData.airlineName,
    regAirlineNumber: claim.intimationData.flightNumber,
  };

  const updated = await prisma.claim.update({
    where: { id: claim.id },
    data: {
      status: "VALIDATED",
      stage: "REGISTRATION",
      deficiencyReason: null,
      registrationData: { ...carriedForward, ...claim.registrationData },
    },
  });
  await logActivity(claim.id, req.user, "First-level validation passed — moved to Registration");
  res.json(updated);
});

// POST /api/claims/:id/resubmit — Customer/Agent fixes a deficient claim
const resubmitIntimation = asyncHandler(async (req, res) => {
  const claim = await prisma.claim.findUnique({ where: { id: req.params.id } });
  if (!claim) return res.status(404).json({ message: "Claim not found." });
  if (claim.status !== "DEFICIENT") {
    return res.status(409).json({ message: "This claim is not currently marked deficient." });
  }
  const updated = await prisma.claim.update({
    where: { id: claim.id },
    data: { status: "SUBMITTED_FOR_VALIDATION" },
  });
  await logActivity(claim.id, req.user, "Resubmitted after addressing deficiency");
  res.json(updated);
});

// PATCH /api/claims/:id/registration — Agent only
const updateRegistration = asyncHandler(async (req, res) => {
  const claim = await prisma.claim.findUnique({ where: { id: req.params.id } });
  if (!claim) return res.status(404).json({ message: "Claim not found." });
  if (claim.stage !== "REGISTRATION") {
    return res.status(409).json({ message: "Registration is only editable while the claim is in the Registration stage." });
  }

  const merged = { ...claim.registrationData, ...req.body.registrationData };
  const updated = await prisma.claim.update({
    where: { id: claim.id },
    data: { registrationData: merged },
  });
  await logActivity(claim.id, req.user, "Registration details updated");
  res.json(updated);
});

// POST /api/claims/:id/submit-to-insurer — Agent only
// Simulates the insurer API call for Claim Intimation & Registration.
const submitToInsurer = asyncHandler(async (req, res) => {
  const claim = await prisma.claim.findUnique({ where: { id: req.params.id } });
  if (!claim) return res.status(404).json({ message: "Claim not found." });
  if (claim.stage !== "REGISTRATION") {
    return res.status(409).json({ message: "Only claims in Registration can be submitted to the Insurer." });
  }

  const updated = await prisma.claim.update({
    where: { id: claim.id },
    data: {
      stage: "ASSESSMENT",
      status: "SUBMITTED_TO_INSURER",
      insurerClaimIntimationNo: claim.insurerClaimIntimationNo || generateInsurerNumber("CIN"),
      insurerClaimRegistrationNo: claim.insurerClaimRegistrationNo || generateInsurerNumber("CRN"),
      assessmentData: {
        assessmentNumber: generateInsurerNumber("ASMT"),
        claimTypeAsReg: claim.claimCategory,
        ...claim.assessmentData,
      },
    },
  });
  await logActivity(claim.id, req.user, "Intimation & Registration submitted to Insurer via API");
  await notifyClaimEvent(updated, {
    subject: `Claim ${claim.claimNumber} registered with insurer`,
    message: `Your claim ${claim.claimNumber} has been intimated and registered with the insurer. Insurer reference: ${updated.insurerClaimIntimationNo}.`,
    to: await getNotificationRecipients(claim.id),
  });
  res.json(updated);
});

// PATCH /api/claims/:id/assessment — Insurer only
const updateAssessment = asyncHandler(async (req, res) => {
  const claim = await prisma.claim.findUnique({ where: { id: req.params.id } });
  if (!claim) return res.status(404).json({ message: "Claim not found." });
  if (claim.stage !== "ASSESSMENT") {
    return res.status(409).json({ message: "Assessment is only editable while the claim is in the Assessment stage." });
  }

  const merged = { ...claim.assessmentData, ...req.body.assessmentData };
  const updated = await prisma.claim.update({
    where: { id: claim.id },
    data: { assessmentData: merged },
  });
  await logActivity(claim.id, req.user, "Assessment details updated");
  res.json(updated);
});

// POST /api/claims/:id/decision — Insurer only
// body: { decision: "APPROVED" | "REJECTED" | "RETURNED", remarks?: string }
const insurerDecision = asyncHandler(async (req, res) => {
  const claim = await prisma.claim.findUnique({ where: { id: req.params.id } });
  if (!claim) return res.status(404).json({ message: "Claim not found." });
  if (claim.stage !== "ASSESSMENT") {
    return res.status(409).json({ message: "A decision can only be recorded while the claim is in Assessment." });
  }

  const { decision, remarks } = req.body;
  let status, stage;

  if (decision === "APPROVED") {
    status = "APPROVED";
    stage = "PAYMENT";
  } else if (decision === "REJECTED") {
    status = "REJECTED";
    stage = "PAYMENT"; // payment tab shows the repudiation flow
  } else if (decision === "RETURNED") {
    status = "RETURNED_BY_INSURER";
    stage = "REGISTRATION"; // sent back to the Agent for rework
  } else {
    return res.status(400).json({ message: "decision must be APPROVED, REJECTED or RETURNED." });
  }

  const updated = await prisma.claim.update({
    where: { id: claim.id },
    data: {
      status,
      stage,
      assessmentData: { ...claim.assessmentData, approvalStatus: decision, insurerRemarks: remarks || null },
    },
  });
  await logActivity(claim.id, req.user, `Insurer decision: ${decision}`, { remarks });

  const DECISION_MESSAGE = {
    APPROVED: `Good news — your claim ${claim.claimNumber} has been approved. We'll share the payable amount and process payment shortly.`,
    REJECTED: `Your claim ${claim.claimNumber} was not admissible and has been repudiated.${remarks ? ` Reason: ${remarks}` : ""}`,
    RETURNED: `Your claim ${claim.claimNumber} needs a bit more work from our team before the insurer can decide — no action needed from you.`,
  };
  await notifyClaimEvent(updated, {
    subject: `Update on claim ${claim.claimNumber}`,
    message: DECISION_MESSAGE[decision],
    to: await getNotificationRecipients(claim.id),
  });
  res.json(updated);
});

// PATCH /api/claims/:id/payment — Agent only
const updatePayment = asyncHandler(async (req, res) => {
  const claim = await prisma.claim.findUnique({ where: { id: req.params.id } });
  if (!claim) return res.status(404).json({ message: "Claim not found." });
  if (claim.stage !== "PAYMENT") {
    return res.status(409).json({ message: "Payment details are only editable during the Payment stage." });
  }
  const merged = { ...claim.paymentData, ...req.body.paymentData };
  const updated = await prisma.claim.update({
    where: { id: claim.id },
    data: { paymentData: merged },
  });
  await logActivity(claim.id, req.user, "Payment details updated");
  res.json(updated);
});

// POST /api/claims/:id/close — Agent only
const closeClaim = asyncHandler(async (req, res) => {
  const claim = await prisma.claim.findUnique({ where: { id: req.params.id } });
  if (!claim) return res.status(404).json({ message: "Claim not found." });
  if (claim.stage !== "PAYMENT") {
    return res.status(409).json({ message: "Only claims in the Payment stage can be closed." });
  }

  const status = claim.status === "REJECTED" ? "CLOSED" : "PAYMENT_PROCESSED";
  const updated = await prisma.claim.update({
    where: { id: claim.id },
    data: { status, stage: "CLOSED" },
  });
  await logActivity(claim.id, req.user, claim.status === "REJECTED" ? "Repudiation closed" : "Payment processed — case closed");
  await notifyClaimEvent(updated, {
    subject: `Claim ${claim.claimNumber} closed`,
    message:
      claim.status === "REJECTED"
        ? `Your claim ${claim.claimNumber} has been closed following repudiation.`
        : `Payment for claim ${claim.claimNumber} has been processed. This case is now closed. Thank you for your patience.`,
    to: await getNotificationRecipients(claim.id),
  });
  res.json(updated);
});

module.exports = {
  listClaims,
  getClaim,
  getRequiredDocuments,
  createClaim,
  updateIntimation,
  submitIntimation,
  validateClaim,
  resubmitIntimation,
  updateRegistration,
  submitToInsurer,
  updateAssessment,
  updateCoverageItems,
  addRemark,
  insurerDecision,
  updatePayment,
  closeClaim,
};