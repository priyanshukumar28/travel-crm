const prisma = require("../utils/prisma");
const { asyncHandler } = require("../middleware/errorHandler");
const { notifyClaimEvent } = require("../utils/notifications");
const { convert } = require("../utils/exchangeRate");
const { HARD_LIMIT_COVERAGES } = require("../data/catalog");
const {
  generateClaimNumber,
  generateParentClaimNumber,
  generateInsurerNumber,
} = require("../utils/ids");

async function logActivity(claimId, user, action, meta) {
  await prisma.activityLog.create({
    data: { claimId, userId: user.id, role: user.role, action, meta: meta || undefined },
  });
}

async function getNotificationRecipients(claimId) {
  const claim = await prisma.claim.findUnique({
    where: { id: claimId },
    include: { policy: { include: { owner: true } }, createdBy: true },
  });
  const customerEmail = claim.intimationData?.commEmail || claim.policy.owner?.email;
  let agentEmails = [];
  if (claim.createdByRole === "AGENT") {
    agentEmails = [claim.createdBy.email];
  } else {
    const agents = await prisma.user.findMany({ where: { role: "AGENT" }, select: { email: true } });
    agentEmails = agents.map((a) => a.email);
  }
  return { emails: [customerEmail, ...agentEmails].filter(Boolean) };
}

// Point 12/15 — maps a claim's current state to one of the operational
// queue buckets the Agent portal groups claims into.
function computeQueueBucket(claim) {
  if (claim.stage === "CLOSED") return "Closed";
  if (claim.status !== "DEFICIENT") return "Under Observation";
  const n = claim.deficiencyReminderCount || 0;
  if (n === 0) return "Documents Yet to Receive";
  if (n === 1) return "Reminder 1";
  if (n === 2) return "Reminder 2";
  if (n === 3) return "Reminder 3";
  if (n >= 4 && n < 5) return "Reminder 4";
  return "Deficient Claim";
}

function scopeWhereForRole(user) {
  if (user.role === "CUSTOMER") return { policy: { ownerId: user.id } };
  if (user.role === "AGENT") return { OR: [{ createdById: user.id }, { NOT: { status: "DRAFT" } }] };
  if (user.role === "INSURER") return { stage: { in: ["ASSESSMENT", "PAYMENT", "CLOSED"] } };
  return {};
}

const listClaims = asyncHandler(async (req, res) => {
  const where = scopeWhereForRole(req.user);
  const claims = await prisma.claim.findMany({ where, include: { policy: { include: { members: true } } }, orderBy: { createdAt: "desc" } });
  res.json(claims.map((c) => ({ ...c, queueBucket: computeQueueBucket(c) })));
});

// Point 15 — GET /api/claims/queues (Agent) — the same claims, pre-grouped.
const listQueues = asyncHandler(async (req, res) => {
  const where = scopeWhereForRole(req.user);
  const claims = await prisma.claim.findMany({ where, include: { policy: { include: { members: true } } }, orderBy: { createdAt: "desc" } });
  const buckets = {
    "Documents Yet to Receive": [], "Under Observation": [], "Reminder 1": [], "Reminder 2": [],
    "Reminder 3": [], "Reminder 4": [], "Deficient Claim": [], "Closed": [],
  };
  for (const c of claims) buckets[computeQueueBucket(c)].push(c);
  res.json(buckets);
});

const getClaim = asyncHandler(async (req, res) => {
  let claim = await prisma.claim.findUnique({
    where: { id: req.params.id },
    include: {
      policy: { include: { coverages: true, members: true } },
      activityLogs: { orderBy: { createdAt: "asc" }, include: { user: true } },
    },
  });
  if (!claim) return res.status(404).json({ message: "Claim not found." });

  // Self-heal: if Policy Details / Reported Date/Time are missing from
  // intimationData (e.g. this claim was created before autofill was wired
  // up, or the creating request predates a deploy that added it), backfill
  // them from the policy now and persist so this only ever happens once.
  const missingAutofill =
    !claim.intimationData?.holderName ||
    !claim.intimationData?.policyIssuanceDate ||
    !claim.intimationData?.reportedDate;

  if (missingAutofill) {
    const now = new Date();
    const backfill = {
      policyIssuanceDate: claim.intimationData?.policyIssuanceDate || claim.policy.issuanceDate.toISOString().slice(0, 10),
      inceptionDate: claim.intimationData?.inceptionDate || claim.policy.startDate.toISOString().slice(0, 10),
      expiryDate: claim.intimationData?.expiryDate || claim.policy.endDate.toISOString().slice(0, 10),
      holderName: claim.intimationData?.holderName || claim.policy.holderName,
      reportedDate: claim.intimationData?.reportedDate || claim.createdAt.toISOString().slice(0, 10),
      reportedTime: claim.intimationData?.reportedTime || claim.createdAt.toTimeString().slice(0, 5),
    };
    claim = await prisma.claim.update({
      where: { id: claim.id },
      data: { intimationData: { ...claim.intimationData, ...backfill } },
      include: {
        policy: { include: { coverages: true, members: true } },
        activityLogs: { orderBy: { createdAt: "asc" }, include: { user: true } },
      },
    });
  }

  res.json({ ...claim, queueBucket: computeQueueBucket(claim) });
});

// GET /api/claims/:id/linked
// Point 2: when Customer/Agent files multiple claims in one sitting (e.g.
// Member A — Medical, Member B — Travel), each becomes its own Claim row,
// linked only by sharing the same parentClaimNumber. This surfaces the
// siblings so they're visible together instead of being invisible to each
// other once created.
const getLinkedClaims = asyncHandler(async (req, res) => {
  const claim = await prisma.claim.findUnique({ where: { id: req.params.id } });
  if (!claim) return res.status(404).json({ message: "Claim not found." });

  const siblings = await prisma.claim.findMany({
    where: { parentClaimNumber: claim.parentClaimNumber, id: { not: claim.id } },
    include: { policy: { include: { members: true } } },
    orderBy: { createdAt: "asc" },
  });
  res.json(siblings.map((c) => ({ ...c, queueBucket: computeQueueBucket(c) })));
});

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

// Point 6 (and the "remove shared Date of Loss" follow-up) — each coverage
// carries its OWN Date of Loss now (item.detail.dateOfLoss), not one shared
// claim-level field. Validates that a given item's date is present and
// falls within the policy's validity window.
function validateItemDateOfLoss(item, policy) {
  const dateOfLoss = item.detail?.dateOfLoss;
  if (!dateOfLoss) return `${item.coverageName || "A coverage"}: Date of Loss is required.`;
  const d = new Date(dateOfLoss);
  if (isNaN(d.getTime())) return `${item.coverageName || "A coverage"}: Date of Loss is not a valid date.`;
  if (d < new Date(policy.startDate) || d > new Date(policy.endDate)) {
    return `${item.coverageName || "A coverage"}: policy is expired or not yet active for this Date of Loss (policy valid ${new Date(policy.startDate).toLocaleDateString()} – ${new Date(policy.endDate).toLocaleDateString()}).`;
  }
  return null;
}

// Point 8 — prefill claimant/communication fields from the customer's own
// most recent claim, if one exists, so returning customers don't retype
// the same details every time.
async function prefillFromLastClaim(policyId, ownerId) {
  const last = await prisma.claim.findFirst({
    where: { policyId, ...(ownerId ? {} : {}) },
    orderBy: { createdAt: "desc" },
  });
  if (!last) return {};
  const { claimantName, claimantMobile, claimantEmail, relationship, commEmail, commContact } = last.intimationData || {};
  return { claimantName, claimantMobile, claimantEmail, relationship, commEmail, commContact };
}

// POST /api/claims — Point 2: accepts one or more "claim groups" (each its
// own category + member selection + coverage items) sharing a single
// parentClaimNumber, so e.g. Member A's Medical claim and Member B's Travel
// claim from the same trip are linked but tracked as separate claim records
// with their own status/stage.
// body: { policyId, claimGroups: [{ claimCategory, memberIds, coverageItems }], intimationData }
const createClaim = asyncHandler(async (req, res) => {
  const { policyId, claimGroups, intimationData } = req.body;

  if (!policyId || !Array.isArray(claimGroups) || claimGroups.length === 0) {
    return res.status(400).json({ message: "policyId and at least one claim group are required." });
  }

  const policy = await prisma.policy.findUnique({ where: { id: policyId }, include: { members: true } });
  if (!policy) return res.status(404).json({ message: "Policy not found." });
  if (req.user.role === "CUSTOMER" && policy.ownerId !== req.user.id) {
    return res.status(403).json({ message: "You can only initiate claims against your own policy." });
  }

  // Validate every coverage item's own Date of Loss, across all groups,
  // before writing anything — no shared claim-level date anymore.
  for (const group of claimGroups) {
    for (const item of group.coverageItems || []) {
      const err = validateItemDateOfLoss(item, policy);
      if (err) return res.status(400).json({ message: err });
    }
  }

  const validMemberIds = new Set(policy.members.map((m) => m.id));
  const parentClaimNumber = generateParentClaimNumber();
  const prefill = await prefillFromLastClaim(policyId);

  // Autofill Policy Details (previously defined in the schema as
  // source:"autofill" but nothing ever actually populated them) + system
  // Reported Date/Time set to the real moment this claim was initiated.
  const now = new Date();
  const autofillFields = {
    policyIssuanceDate: policy.issuanceDate.toISOString().slice(0, 10),
    inceptionDate: policy.startDate.toISOString().slice(0, 10),
    expiryDate: policy.endDate.toISOString().slice(0, 10),
    holderName: policy.holderName,
    reportedDate: now.toISOString().slice(0, 10),
    reportedTime: now.toTimeString().slice(0, 5),
  };

  const mergedIntimation = { ...prefill, ...(intimationData || {}), ...autofillFields };

  const createdClaims = [];
  for (const group of claimGroups) {
    const { claimCategory, memberIds, coverageItems } = group;
    if (!claimCategory || !Array.isArray(coverageItems) || coverageItems.length === 0) continue;

    const chosenMemberIds = (memberIds || []).filter((id) => validMemberIds.has(id));

    // Point 4/5/7/8 — compute USD/INR for every item now, using Date of Loss
    // (live historical rate if EXCHANGE_RATE_API_KEY is configured, static
    // fallback otherwise). Point 3 — Country/City/Zipcode/Region/Description
    // of Loss are captured per-coverage, by the Customer, at intimation time
    // via item.detail (see Coverage Items editor) — preserved as-is below,
    // not overwritten.
    const normalizedItems = await Promise.all(coverageItems.map(async (item) => {
      const currency = item.currency || "USD";
      const converted = await convert(item.initialReserve, currency, item.detail?.dateOfLoss);
      return {
        category: item.category || claimCategory,
        coverageName: item.coverageName,
        subCoverName: item.subCoverName || null,
        currency,
        initialReserve: Number(item.initialReserve) || 0,
        amountUSD: converted.amountUSD,
        amountINR: converted.amountINR,
        exchangeRateUsed: converted.exchangeRateUsed,
        subLimitAmount: null,
        payableAmount: null,
        gopIssueDate: null,
        remarks: item.remarks || null,
        detail: { ...item.detail }, // Country/City/Zipcode/Region/Description/Date of Loss, exactly as the customer entered per coverage
      };
    }));

    const claim = await prisma.claim.create({
      data: {
        claimNumber: generateClaimNumber(claimCategory),
        parentClaimNumber,
        policyId,
        claimCategory,
        coverages: normalizedItems.map((i) => i.coverageName),
        memberIds: chosenMemberIds,
        coverageItems: normalizedItems,
        stage: "INTIMATION",
        status: "DRAFT",
        createdById: req.user.id,
        createdByRole: req.user.role === "AGENT" ? "AGENT" : "CUSTOMER",
        intimationData: mergedIntimation,
      },
    });
    await logActivity(claim.id, req.user, "Claim initiated", { coverages: claim.coverages, claimCategory, parentClaimNumber });
    createdClaims.push(claim);
  }

  if (createdClaims.length === 0) {
    return res.status(400).json({ message: "No valid claim groups were provided." });
  }

  res.status(201).json({ parentClaimNumber, claims: createdClaims });
});

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
  const updated = await prisma.claim.update({ where: { id: claim.id }, data: { intimationData: merged } });
  await logActivity(claim.id, req.user, "Intimation details updated");
  res.json(updated);
});

const submitIntimation = asyncHandler(async (req, res) => {
  const claim = await prisma.claim.findUnique({ where: { id: req.params.id }, include: { policy: true } });
  if (!claim) return res.status(404).json({ message: "Claim not found." });
  if (claim.stage !== "INTIMATION") return res.status(409).json({ message: "This claim has already moved past Intimation." });

  for (const item of claim.coverageItems || []) {
    const err = validateItemDateOfLoss(item, claim.policy);
    if (err) return res.status(400).json({ message: err });
  }

  const updated = await prisma.claim.update({ where: { id: claim.id }, data: { status: "SUBMITTED_FOR_VALIDATION" } });
  await logActivity(claim.id, req.user, "Submitted claim intimation");
  await notifyClaimEvent(updated, {
    subject: `Claim ${claim.claimNumber} received`,
    message: `Hi, we've received your claim intimation (${claim.claimNumber}) and it's now with our claims desk for first-level validation.`,
    to: await getNotificationRecipients(claim.id),
  });
  res.json(updated);
});

const validateClaim = asyncHandler(async (req, res) => {
  const claim = await prisma.claim.findUnique({ where: { id: req.params.id } });
  if (!claim) return res.status(404).json({ message: "Claim not found." });
  if (claim.stage !== "INTIMATION") return res.status(409).json({ message: "Only claims still in Intimation can be validated." });

  const { deficient, reason } = req.body;

  if (deficient) {
    const updated = await prisma.claim.update({
      where: { id: claim.id },
      data: { status: "DEFICIENT", deficiencyReason: reason || "Missing documents / incorrect data", deficiencyRaisedAt: new Date(), deficiencyReminderCount: 0 },
    });
    await logActivity(claim.id, req.user, "Deficiency raised", { reason });
    await notifyClaimEvent(updated, {
      subject: `Action needed on claim ${claim.claimNumber}`,
      message: `We found a deficiency on your claim ${claim.claimNumber}: ${reason || "missing documents / incorrect data"}. Please log in and resubmit.`,
      to: await getNotificationRecipients(claim.id),
    });
    return res.json(updated);
  }

  // Point 16/17 — carry forward cover/sub-cover (from coverageItems) and
  // surveyor/investigator contact details (from intimation) so the Agent
  // never re-types data that was already captured at Intimation.
  const firstItem = (claim.coverageItems || [])[0] || {};
  const carriedForward = {
    regFileClaim: "Yes",
    regClaimType: claim.claimCategory,
    regClaimantName: claim.intimationData.claimantName || claim.intimationData.m1Name,
    regClaimantMobile: claim.intimationData.claimantMobile || claim.intimationData.m1Contact,
    regCommEmail: claim.intimationData.commEmail,
    regCommMobile: claim.intimationData.commContact,
    regDateOfLoss: firstItem.detail?.dateOfLoss,
    regCountryOfLoss: firstItem.detail?.countryOfLoss,
    regAirlineName: claim.intimationData.airlineName,
    regAirlineNumber: claim.intimationData.flightNumber,
    coverName: firstItem.coverageName,
    subCoverName: firstItem.subCoverName,
    surveyorPartyName: claim.intimationData.invName,
    surveyorMobile: claim.intimationData.invMobile,
    surveyorEmail: claim.intimationData.invEmail,
    surveyorApptDate: claim.intimationData.invApptDate,
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

// Point 12/15 — Agent sends a numbered reminder on a deficient claim.
const sendReminder = asyncHandler(async (req, res) => {
  const claim = await prisma.claim.findUnique({ where: { id: req.params.id } });
  if (!claim) return res.status(404).json({ message: "Claim not found." });
  if (claim.status !== "DEFICIENT") return res.status(409).json({ message: "This claim is not currently deficient." });

  const nextCount = (claim.deficiencyReminderCount || 0) + 1;
  const updated = await prisma.claim.update({
    where: { id: claim.id },
    data: { deficiencyReminderCount: nextCount, lastReminderAt: new Date() },
  });
  await logActivity(claim.id, req.user, `Reminder ${nextCount} sent`, { reminderNumber: nextCount });
  await notifyClaimEvent(updated, {
    subject: `Reminder ${nextCount}: documents pending for claim ${claim.claimNumber}`,
    message: `This is reminder ${nextCount} — we're still waiting on: ${claim.deficiencyReason}. Please submit at the earliest to avoid claim closure.`,
    to: await getNotificationRecipients(claim.id),
  });
  res.json({ ...updated, queueBucket: computeQueueBucket(updated) });
});

const resubmitIntimation = asyncHandler(async (req, res) => {
  const claim = await prisma.claim.findUnique({ where: { id: req.params.id } });
  if (!claim) return res.status(404).json({ message: "Claim not found." });
  if (claim.status !== "DEFICIENT") return res.status(409).json({ message: "This claim is not currently marked deficient." });
  const updated = await prisma.claim.update({
    where: { id: claim.id },
    data: { status: "SUBMITTED_FOR_VALIDATION", deficiencyReminderCount: 0 },
  });
  await logActivity(claim.id, req.user, "Resubmitted after addressing deficiency");
  res.json(updated);
});

const updateRegistration = asyncHandler(async (req, res) => {
  const claim = await prisma.claim.findUnique({ where: { id: req.params.id } });
  if (!claim) return res.status(404).json({ message: "Claim not found." });
  if (claim.stage !== "REGISTRATION") return res.status(409).json({ message: "Registration is only editable while the claim is in the Registration stage." });
  const merged = { ...claim.registrationData, ...req.body.registrationData };
  const updated = await prisma.claim.update({ where: { id: claim.id }, data: { registrationData: merged } });
  await logActivity(claim.id, req.user, "Registration details updated");
  res.json(updated);
});

const submitToInsurer = asyncHandler(async (req, res) => {
  const claim = await prisma.claim.findUnique({ where: { id: req.params.id } });
  if (!claim) return res.status(404).json({ message: "Claim not found." });
  if (claim.stage !== "REGISTRATION") return res.status(409).json({ message: "Only claims in Registration can be submitted to the Insurer." });

  const updated = await prisma.claim.update({
    where: { id: claim.id },
    data: {
      stage: "ASSESSMENT",
      status: "SUBMITTED_TO_INSURER",
      insurerClaimIntimationNo: claim.insurerClaimIntimationNo || generateInsurerNumber("CIN"),
      insurerClaimRegistrationNo: claim.insurerClaimRegistrationNo || generateInsurerNumber("CRN"),
      assessmentData: { assessmentNumber: generateInsurerNumber("ASMT"), claimTypeAsReg: claim.claimCategory, ...claim.assessmentData },
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

const updateAssessment = asyncHandler(async (req, res) => {
  const claim = await prisma.claim.findUnique({ where: { id: req.params.id } });
  if (!claim) return res.status(404).json({ message: "Claim not found." });
  if (claim.stage !== "ASSESSMENT") return res.status(409).json({ message: "Assessment is only editable while the claim is in the Assessment stage." });
  const merged = { ...claim.assessmentData, ...req.body.assessmentData };
  const updated = await prisma.claim.update({ where: { id: claim.id }, data: { assessmentData: merged } });
  await logActivity(claim.id, req.user, "Assessment details updated");
  res.json(updated);
});

// Point 14/18 — coverage-item edits are (a) diffed for a reserve-change
// audit trail and (b) validated against the policy's own Coverage sub-limit
// for the three hard-limit medical covers.
const updateCoverageItems = asyncHandler(async (req, res) => {
  const claim = await prisma.claim.findUnique({ where: { id: req.params.id }, include: { policy: { include: { coverages: true } } } });
  if (!claim) return res.status(404).json({ message: "Claim not found." });

  const allowedStages = { AGENT: ["INTIMATION", "REGISTRATION"], INSURER: ["ASSESSMENT"], SUPER_ADMIN: ["INTIMATION", "REGISTRATION", "ASSESSMENT"] };
  const allowed = allowedStages[req.user.role];
  if (!allowed || !allowed.includes(claim.stage)) {
    return res.status(403).json({ message: "You cannot edit coverage items at this stage." });
  }
  if (!Array.isArray(req.body.coverageItems)) return res.status(400).json({ message: "coverageItems[] is required." });

  const oldItems = claim.coverageItems || [];
  const newItems = req.body.coverageItems;
  const validationErrors = [];
  const reserveChanges = [];

  newItems.forEach((item, i) => {
    const old = oldItems[i] || {};
    if (Number(old.initialReserve) !== Number(item.initialReserve) || Number(old.payableAmount) !== Number(item.payableAmount)) {
      reserveChanges.push({
        coverageName: item.coverageName,
        oldReserve: old.initialReserve, newReserve: item.initialReserve,
        oldPayable: old.payableAmount, newPayable: item.payableAmount,
      });
    }

    if (HARD_LIMIT_COVERAGES.includes(item.coverageName) && item.payableAmount !== null && item.payableAmount !== undefined && item.payableAmount !== "") {
      const policyCoverage = claim.policy.coverages.find((c) => c.name === item.coverageName);
      if (policyCoverage && Number(item.payableAmount) > policyCoverage.sumInsured) {
        validationErrors.push(`${item.coverageName}: payable amount ${item.payableAmount} exceeds the policy's sum insured of ${policyCoverage.sumInsured} for this cover.`);
      }
    }
  });

  if (validationErrors.length > 0) {
    return res.status(400).json({ message: "Sub-limit validation failed.", errors: validationErrors });
  }

  // Recompute currency conversion in case initialReserve or currency changed.
  const recomputed = await Promise.all(newItems.map(async (item) => {
    const converted = await convert(item.initialReserve, item.currency || "USD", item.detail?.dateOfLoss || claim.intimationData?.dateOfLoss);
    return { ...item, amountUSD: converted.amountUSD, amountINR: converted.amountINR, exchangeRateUsed: converted.exchangeRateUsed };
  }));

  const updated = await prisma.claim.update({ where: { id: claim.id }, data: { coverageItems: recomputed } });

  if (reserveChanges.length > 0) {
    await logActivity(claim.id, req.user, `Reserve/payable updated for ${reserveChanges.length} coverage(s)`, { type: "reserve_change", changes: reserveChanges });
  } else {
    await logActivity(claim.id, req.user, "Coverage item details updated");
  }
  res.json(updated);
});

const addRemark = asyncHandler(async (req, res) => {
  const claim = await prisma.claim.findUnique({ where: { id: req.params.id } });
  if (!claim) return res.status(404).json({ message: "Claim not found." });
  const { message } = req.body;
  if (!message || !message.trim()) return res.status(400).json({ message: "Remark text is required." });
  await logActivity(claim.id, req.user, `Remark: ${message.trim()}`, { isManualRemark: true });
  res.status(201).json({ message: "Remark added." });
});

const insurerDecision = asyncHandler(async (req, res) => {
  const claim = await prisma.claim.findUnique({ where: { id: req.params.id } });
  if (!claim) return res.status(404).json({ message: "Claim not found." });
  if (claim.stage !== "ASSESSMENT") return res.status(409).json({ message: "A decision can only be recorded while the claim is in Assessment." });

  const { decision, remarks } = req.body;
  let status, stage;
  if (decision === "APPROVED") { status = "APPROVED"; stage = "PAYMENT"; }
  else if (decision === "REJECTED") { status = "REJECTED"; stage = "PAYMENT"; }
  else if (decision === "RETURNED") { status = "RETURNED_BY_INSURER"; stage = "REGISTRATION"; }
  else return res.status(400).json({ message: "decision must be APPROVED, REJECTED or RETURNED." });

  const updated = await prisma.claim.update({
    where: { id: claim.id },
    data: { status, stage, assessmentData: { ...claim.assessmentData, approvalStatus: decision, insurerRemarks: remarks || null } },
  });
  await logActivity(claim.id, req.user, `Insurer decision: ${decision}`, { remarks });

  const DECISION_MESSAGE = {
    APPROVED: `Good news — your claim ${claim.claimNumber} has been approved. We'll share the payable amount and process payment shortly.`,
    REJECTED: `Your claim ${claim.claimNumber} was not admissible and has been repudiated.${remarks ? ` Reason: ${remarks}` : ""}`,
    RETURNED: `Your claim ${claim.claimNumber} needs a bit more work from our team before the insurer can decide.`,
  };
  await notifyClaimEvent(updated, { subject: `Update on claim ${claim.claimNumber}`, message: DECISION_MESSAGE[decision], to: await getNotificationRecipients(claim.id) });
  res.json(updated);
});

const updatePayment = asyncHandler(async (req, res) => {
  const claim = await prisma.claim.findUnique({ where: { id: req.params.id } });
  if (!claim) return res.status(404).json({ message: "Claim not found." });
  if (claim.stage !== "PAYMENT") return res.status(409).json({ message: "Payment details are only editable during the Payment stage." });
  const merged = { ...claim.paymentData, ...req.body.paymentData };
  const updated = await prisma.claim.update({ where: { id: claim.id }, data: { paymentData: merged } });
  await logActivity(claim.id, req.user, "Payment details updated");
  res.json(updated);
});

const closeClaim = asyncHandler(async (req, res) => {
  const claim = await prisma.claim.findUnique({ where: { id: req.params.id } });
  if (!claim) return res.status(404).json({ message: "Claim not found." });
  if (claim.stage !== "PAYMENT") return res.status(409).json({ message: "Only claims in the Payment stage can be closed." });
  const status = claim.status === "REJECTED" ? "CLOSED" : "PAYMENT_PROCESSED";
  const updated = await prisma.claim.update({ where: { id: claim.id }, data: { status, stage: "CLOSED" } });
  await logActivity(claim.id, req.user, claim.status === "REJECTED" ? "Repudiation closed" : "Payment processed — case closed");
  await notifyClaimEvent(updated, {
    subject: `Claim ${claim.claimNumber} closed`,
    message: claim.status === "REJECTED" ? `Your claim ${claim.claimNumber} has been closed following repudiation.` : `Payment for claim ${claim.claimNumber} has been processed. This case is now closed.`,
    to: await getNotificationRecipients(claim.id),
  });
  res.json(updated);
});

// Point 15 — final closure of a claim that ran out its reminder cycle
// without the customer ever sending the missing documents.
const closeDeficient = asyncHandler(async (req, res) => {
  const claim = await prisma.claim.findUnique({ where: { id: req.params.id } });
  if (!claim) return res.status(404).json({ message: "Claim not found." });
  if (claim.status !== "DEFICIENT") return res.status(409).json({ message: "Only a deficient claim can be closed this way." });
  const updated = await prisma.claim.update({ where: { id: claim.id }, data: { stage: "CLOSED", status: "CLOSED" } });
  await logActivity(claim.id, req.user, "Claim closed — documents never received after reminder cycle");
  res.json(updated);
});

// POST /api/claims/:id/reopen — Agent only, point 4.
// Reopening is deliberately kept in the Agent's hands (not Customer or
// Insurer) since it's the Agent who owns the operational decision to
// rework a case. Sends the claim back to Registration so the whole
// back-half of the process (registration -> insurer -> assessment ->
// payment) can be redone; reopenedAt/reopenCount are tracked so the MIS
// export's "Reopen Date" column is real data, not a placeholder.
const reopenClaim = asyncHandler(async (req, res) => {
  const claim = await prisma.claim.findUnique({ where: { id: req.params.id } });
  if (!claim) return res.status(404).json({ message: "Claim not found." });
  if (claim.stage !== "CLOSED") {
    return res.status(409).json({ message: "Only a closed claim can be reopened." });
  }

  const { reason } = req.body;
  const updated = await prisma.claim.update({
    where: { id: claim.id },
    data: {
      stage: "REGISTRATION",
      status: "VALIDATED",
      reopenedAt: new Date(),
      reopenCount: { increment: 1 },
    },
  });
  await logActivity(claim.id, req.user, `Claim reopened${reason ? `: ${reason}` : ""}`, { type: "reopen", reason: reason || null });
  await notifyClaimEvent(updated, {
    subject: `Claim ${claim.claimNumber} reopened`,
    message: `Your claim ${claim.claimNumber} has been reopened for further review.${reason ? ` Reason: ${reason}` : ""}`,
    to: await getNotificationRecipients(claim.id),
  });
  res.json({ ...updated, queueBucket: computeQueueBucket(updated) });
});

module.exports = {
  listClaims, listQueues,
  getClaim, getRequiredDocuments, getLinkedClaims,
  createClaim,
  updateIntimation, submitIntimation,
  validateClaim, sendReminder, resubmitIntimation,
  updateRegistration, submitToInsurer,
  updateAssessment, updateCoverageItems, addRemark,
  insurerDecision, updatePayment, closeClaim, closeDeficient, reopenClaim,
};