const bcrypt = require("bcryptjs");
const prisma = require("../utils/prisma");
const { asyncHandler } = require("../middleware/errorHandler");
const { validatePolicyPayload, computeCompletionStatus, parseDate, parseNumber } = require("../utils/policyValidation");

function pick(row, key) {
  if (row[key] !== undefined) return row[key];
  const trimmedKey = key.trim();
  const found = Object.keys(row).find((k) => k.trim() === trimmedKey);
  return found ? row[found] : undefined;
}

async function findOrCreateCustomer(email, holderName) {
  if (!email) return null;
  let owner = await prisma.user.findUnique({ where: { email: String(email).toLowerCase().trim() } });
  if (!owner) {
    const passwordHash = await bcrypt.hash("password123", 10);
    owner = await prisma.user.create({
      data: { name: holderName || email, email: String(email).toLowerCase().trim(), passwordHash, role: "CUSTOMER" },
    });
  }
  return owner;
}

// POST /api/insurer-feed/policies  (X-API-Key auth, not a user login)
// Point 13: the real integration endpoint. Accepts ONE policy payload per
// call, shaped like Format_-_Sales_Data.xlsx, and can be called many times
// for the same Policy Number as more fields become available from the
// insurer's side — each call merges only the fields it actually contains
// on top of whatever's already on file, and is validated against the
// matched plan before anything is written. Every call, successful or
// rejected, is permanently logged to InsurerFeedEvent.
const receivePolicyEvent = asyncHandler(async (req, res) => {
  const payload = req.body || {};
  const policyNumber = pick(payload, "Policy Number");
  const planName = pick(payload, "Plan name");

  const plan = planName
    ? await prisma.planTemplate.findUnique({ where: { name: String(planName).trim() }, include: { coverages: true } })
    : null;

  const existingPolicy = policyNumber
    ? await prisma.policy.findUnique({ where: { policyNumber: String(policyNumber).trim() }, include: { coverages: true } })
    : null;

  const { valid, errors } = validatePolicyPayload(payload, { plan, existingPolicy });

  if (!valid) {
    await prisma.insurerFeedEvent.create({
      data: {
        apiKeyId: req.apiKey.id,
        policyNumber: policyNumber ? String(policyNumber).trim() : null,
        payload,
        status: "VALIDATION_ERROR",
        errors,
        appliedFields: [],
      },
    });
    return res.status(422).json({ message: "Validation failed — nothing was written.", errors });
  }

  // Merge only the fields present in this call.
  const email = pick(payload, "Email id");
  const holderName = pick(payload, "Name of Insured");
  const owner = email ? await findOrCreateCustomer(email, holderName) : existingPolicy ? { id: existingPolicy.ownerId } : null;

  const fieldMap = {
    "Name of Insured": (v) => ({ holderName: v }),
    "Plan name": (v) => ({ planName: v, planTemplateId: plan?.id }),
    "Policy Start Date": (v) => ({ startDate: parseDate(v) }),
    "Policy End Date": (v) => ({ endDate: parseDate(v) }),
    "Policy Issue Date": (v) => ({ issuanceDate: parseDate(v) }),
    "Place of Issue": (v) => ({ issuancePlace: v }),
    "Geographical Coverage": (v) => ({ geoCoverage: v }),
    "Country to be Visited": (v) => ({ countryVisited: v }),
    "Country of Residence": (v) => ({ countryOfResidence: v }),
    "Deductible": (v) => ({ deductible: v }),
    "Nominee Name": (v) => ({ nomineeName: v }),
  };

  let data = {};
  const appliedFields = [];
  for (const [field, mapper] of Object.entries(fieldMap)) {
    const value = pick(payload, field);
    if (value !== undefined && value !== "") {
      Object.assign(data, mapper(value));
      appliedFields.push(field);
    }
  }
  if (owner) {
    data.ownerId = owner.id;
    appliedFields.push("Email id");
  }

  let policy;
  if (existingPolicy) {
    policy = await prisma.policy.update({ where: { id: existingPolicy.id }, data });
  } else {
    if (!policyNumber) {
      await prisma.insurerFeedEvent.create({
        data: { apiKeyId: req.apiKey.id, policyNumber: null, payload, status: "VALIDATION_ERROR", errors: [{ field: "Policy Number", message: "Required to create a new policy." }], appliedFields: [] },
      });
      return res.status(422).json({ message: "Policy Number is required to create a new policy." });
    }
    policy = await prisma.policy.create({
      data: {
        policyNumber: String(policyNumber).trim(),
        holderName: data.holderName || holderName || "Pending",
        planName: data.planName || planName || "Pending",
        geoCoverage: data.geoCoverage || "Pending",
        startDate: data.startDate || new Date("2100-01-01"),
        endDate: data.endDate || new Date("2100-01-01"),
        issuanceDate: data.issuanceDate || new Date(),
        completionStatus: "DRAFT",
        ...data,
      },
    });
  }

  const finalStatus = computeCompletionStatus(policy);
  if (finalStatus !== policy.completionStatus) {
    policy = await prisma.policy.update({ where: { id: policy.id }, data: { completionStatus: finalStatus } });
  }

  await prisma.insurerFeedEvent.create({
    data: {
      apiKeyId: req.apiKey.id,
      policyNumber: policy.policyNumber,
      payload,
      status: "APPLIED",
      errors: errors.length ? errors : undefined, // warnings, e.g. deductible mismatch, still get recorded
      appliedFields,
    },
  });

  res.status(existingPolicy ? 200 : 201).json({
    message: existingPolicy ? "Policy updated." : "Policy created (draft until all core fields arrive).",
    policyId: policy.id,
    policyNumber: policy.policyNumber,
    completionStatus: policy.completionStatus,
    appliedFields,
    warnings: errors.filter((e) => e.severity === "warning"),
  });
});

// GET /api/admin/insurer-feed/events — the permanent call history
const listFeedEvents = asyncHandler(async (req, res) => {
  const events = await prisma.insurerFeedEvent.findMany({
    include: { apiKey: { select: { label: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  res.json(events);
});

module.exports = { receivePolicyEvent, listFeedEvents };