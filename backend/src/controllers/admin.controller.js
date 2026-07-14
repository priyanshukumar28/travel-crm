const bcrypt = require("bcryptjs");
const prisma = require("../utils/prisma");
const { asyncHandler } = require("../middleware/errorHandler");
const { SALES_DATA_FIELDS } = require("../data/catalog");

// ---------- Policy configuration ----------

// GET /api/admin/policies
const listPolicies = asyncHandler(async (req, res) => {
  const policies = await prisma.policy.findMany({
    include: { coverages: true, owner: true, members: true, planTemplate: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(policies);
});

async function findOrCreateCustomer(ownerEmail, holderName) {
  let owner = await prisma.user.findUnique({ where: { email: ownerEmail.toLowerCase().trim() } });
  if (!owner) {
    const passwordHash = await bcrypt.hash("password123", 10);
    owner = await prisma.user.create({
      data: { name: holderName || ownerEmail, email: ownerEmail.toLowerCase().trim(), passwordHash, role: "CUSTOMER" },
    });
  }
  return owner;
}

// POST /api/admin/policies
// Point 5: policies are now issued *against* a PlanTemplate. If planTemplateId
// is supplied, the plan's coverage rows (with their real sub-limits) are
// copied onto the new policy automatically — the admin no longer free-types
// coverage/sum-insured pairs by hand for a standard plan. `coverages` can
// still be passed to override/add extra lines on top of the plan.
// body also accepts `members: [{name, dob, passportNumber, relationship}]` (point 12).
const createPolicy = asyncHandler(async (req, res) => {
  const {
    policyNumber, holderName, ownerEmail, planName, planTemplateId, claimCategory,
    startDate, endDate, issuanceDate, issuancePlace, geoCoverage, issuanceBranch,
    countryVisited, countryOfResidence, deductible, nomineeName,
    coverages, members,
  } = req.body;

  if (!policyNumber || !ownerEmail) {
    return res.status(400).json({ message: "policyNumber and ownerEmail are required." });
  }

  const owner = await findOrCreateCustomer(ownerEmail, holderName);

  let planCoverageRows = [];
  let resolvedPlanName = planName;
  if (planTemplateId) {
    const plan = await prisma.planTemplate.findUnique({ where: { id: planTemplateId }, include: { coverages: true } });
    if (!plan) return res.status(404).json({ message: "Plan template not found." });
    resolvedPlanName = plan.name;
    planCoverageRows = plan.coverages.map((c) => ({
      category: c.category,
      name: c.coverageName,
      subCoverName: c.subCoverName,
      sumInsured: c.sumInsured,
      subLimitText: c.subLimitText,
      deductible: c.deductible,
    }));
  }

  const extraCoverageRows = (coverages || []).map((c) => ({
    category: c.category || "TRAVEL",
    name: c.name,
    subCoverName: c.subCoverName || null,
    sumInsured: Number(c.sumInsured) || 0,
    subLimitText: c.subLimitText || null,
    deductible: c.deductible || "N/A",
  }));

  const policy = await prisma.policy.create({
    data: {
      policyNumber,
      holderName: holderName || owner.name,
      planName: resolvedPlanName || "Custom Plan",
      claimCategory: claimCategory || "TRAVEL",
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      issuanceDate: new Date(issuanceDate || Date.now()),
      issuancePlace: issuancePlace || null,
      geoCoverage: geoCoverage || "Worldwide",
      issuanceBranch: issuanceBranch || null,
      countryVisited: countryVisited || null,
      countryOfResidence: countryOfResidence || null,
      deductible: deductible || null,
      nomineeName: nomineeName || null,
      ownerId: owner.id,
      planTemplateId: planTemplateId || null,
      coverages: { create: [...planCoverageRows, ...extraCoverageRows] },
      members: {
        create: (members || []).map((m) => ({
          name: m.name,
          relationship: m.relationship || null,
          passportNumber: m.passportNumber || null,
          dob: m.dob ? new Date(m.dob) : null,
        })),
      },
    },
    include: { coverages: true, owner: true, members: true, planTemplate: true },
  });

  res.status(201).json(policy);
});

// PATCH /api/admin/policies/:id — toggle active, edit basic fields
const updatePolicy = asyncHandler(async (req, res) => {
  const { isActive, planName, geoCoverage } = req.body;
  const policy = await prisma.policy.update({
    where: { id: req.params.id },
    data: {
      ...(isActive !== undefined ? { isActive } : {}),
      ...(planName ? { planName } : {}),
      ...(geoCoverage ? { geoCoverage } : {}),
    },
  });
  res.json(policy);
});

// POST /api/admin/policies/:id/coverages — add a coverage line to an existing policy
const addCoverage = asyncHandler(async (req, res) => {
  const { category, name, subCoverName, sumInsured, subLimitText, deductible } = req.body;
  if (!name || sumInsured === undefined) {
    return res.status(400).json({ message: "name and sumInsured are required." });
  }
  const coverage = await prisma.coverage.create({
    data: {
      policyId: req.params.id,
      category: category || "TRAVEL",
      name,
      subCoverName: subCoverName || null,
      sumInsured: Number(sumInsured),
      subLimitText: subLimitText || null,
      deductible: deductible || "N/A",
    },
  });
  res.status(201).json(coverage);
});

// DELETE /api/admin/coverages/:coverageId
const deleteCoverage = asyncHandler(async (req, res) => {
  await prisma.coverage.delete({ where: { id: req.params.coverageId } });
  res.json({ message: "Coverage removed." });
});

// ---------- Insured members (point 12) ----------

// POST /api/admin/policies/:id/members
const addMember = asyncHandler(async (req, res) => {
  const { name, relationship, passportNumber, dob } = req.body;
  if (!name) return res.status(400).json({ message: "Member name is required." });
  const member = await prisma.insuredMember.create({
    data: {
      policyId: req.params.id,
      name,
      relationship: relationship || null,
      passportNumber: passportNumber || null,
      dob: dob ? new Date(dob) : null,
    },
  });
  res.status(201).json(member);
});

const deleteMember = asyncHandler(async (req, res) => {
  await prisma.insuredMember.delete({ where: { id: req.params.memberId } });
  res.json({ message: "Member removed." });
});

// ---------- Plan templates (point 5) ----------

const listPlanTemplates = asyncHandler(async (req, res) => {
  const plans = await prisma.planTemplate.findMany({ include: { coverages: true }, orderBy: { name: "asc" } });
  res.json(plans);
});

const createPlanTemplate = asyncHandler(async (req, res) => {
  const { name, description, coverages } = req.body;
  if (!name) return res.status(400).json({ message: "Plan name is required." });
  const plan = await prisma.planTemplate.create({
    data: {
      name,
      description: description || null,
      coverages: {
        create: (coverages || []).map((c) => ({
          category: c.category,
          coverageName: c.coverageName,
          subCoverName: c.subCoverName || null,
          sumInsured: Number(c.sumInsured) || 0,
          subLimitText: c.subLimitText || null,
          deductible: c.deductible || null,
        })),
      },
    },
    include: { coverages: true },
  });
  res.status(201).json(plan);
});

const addPlanCoverage = asyncHandler(async (req, res) => {
  const { category, coverageName, subCoverName, sumInsured, subLimitText, deductible } = req.body;
  if (!category || !coverageName || sumInsured === undefined) {
    return res.status(400).json({ message: "category, coverageName and sumInsured are required." });
  }
  const coverage = await prisma.planCoverage.create({
    data: {
      planTemplateId: req.params.id,
      category,
      coverageName,
      subCoverName: subCoverName || null,
      sumInsured: Number(sumInsured),
      subLimitText: subLimitText || null,
      deductible: deductible || null,
    },
  });
  res.status(201).json(coverage);
});

const deletePlanCoverage = asyncHandler(async (req, res) => {
  await prisma.planCoverage.delete({ where: { id: req.params.coverageId } });
  res.json({ message: "Coverage removed from plan." });
});

// ---------- Document requirements (point 1) ----------

const upsertDocumentRequirement = asyncHandler(async (req, res) => {
  const { coverageName, requiredDocuments } = req.body;
  if (!coverageName || !Array.isArray(requiredDocuments)) {
    return res.status(400).json({ message: "coverageName and requiredDocuments[] are required." });
  }
  const row = await prisma.documentRequirement.upsert({
    where: { coverageName },
    update: { requiredDocuments },
    create: { coverageName, requiredDocuments },
  });
  res.status(201).json(row);
});

const deleteDocumentRequirement = asyncHandler(async (req, res) => {
  await prisma.documentRequirement.delete({ where: { id: req.params.id } });
  res.json({ message: "Document requirement removed." });
});

// ---------- User management ----------

const listUsers = asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" } });
  res.json(users.map(({ passwordHash, ...safe }) => safe));
});

const createUser = asyncHandler(async (req, res) => {
  const { name, email, role, phone, password } = req.body;
  if (!name || !email || !role) return res.status(400).json({ message: "name, email and role are required." });
  if (!["AGENT", "INSURER", "SUPER_ADMIN", "CUSTOMER"].includes(role)) {
    return res.status(400).json({ message: "Invalid role." });
  }

  const passwordHash = await bcrypt.hash(password || "password123", 10);
  const user = await prisma.user.create({
    data: { name, email: email.toLowerCase().trim(), role, phone: phone || null, passwordHash },
  });
  const { passwordHash: _omit, ...safe } = user;
  res.status(201).json(safe);
});

const updateUser = asyncHandler(async (req, res) => {
  const { name, phone } = req.body;
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { ...(name ? { name } : {}), ...(phone ? { phone } : {}) },
  });
  const { passwordHash: _omit, ...safe } = user;
  res.json(safe);
});

// ---------- Notification outbox ----------

const listNotifications = asyncHandler(async (req, res) => {
  const notifications = await prisma.notification.findMany({
    include: { claim: { select: { claimNumber: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  res.json(notifications);
});

// ---------- Point 13: insurer sales-data sync ----------
// Accepts an array of rows shaped exactly like Format_-_Sales_Data.xlsx
// (see SALES_DATA_FIELDS). This is the "API" the insurer's feed would call —
// for now it's exposed under /api/admin so it can be exercised safely from
// the Admin portal's Insurer Sync page, but the handler itself has no
// admin-only business logic in it and can be re-mounted behind a service
// API key later without changing this function.
const salesDataFieldSpec = asyncHandler(async (req, res) => {
  res.json({ fields: SALES_DATA_FIELDS });
});

function pick(row, key) {
  // tolerate the exact excel header text, trimmed, in case callers pass
  // the raw column names instead of normalized keys.
  if (row[key] !== undefined) return row[key];
  const trimmedKey = key.trim();
  const found = Object.keys(row).find((k) => k.trim() === trimmedKey);
  return found ? row[found] : undefined;
}

const syncInsurerPolicies = asyncHandler(async (req, res) => {
  const rows = Array.isArray(req.body.rows) ? req.body.rows : [];
  if (rows.length === 0) return res.status(400).json({ message: "Provide a non-empty rows[] array." });

  const results = [];
  for (const row of rows) {
    try {
      const policyNumber = pick(row, "Policy Number");
      const email = pick(row, "Email id");
      const holderName = pick(row, "Name of Insured");
      const planName = pick(row, "Plan name");

      if (!policyNumber || !email) {
        results.push({ policyNumber, status: "SKIPPED", reason: "Missing Policy Number or Email id" });
        continue;
      }

      const owner = await findOrCreateCustomer(String(email), holderName);
      const plan = planName ? await prisma.planTemplate.findUnique({ where: { name: String(planName).trim() } }) : null;

      const data = {
        policyNumber: String(policyNumber).trim(),
        holderName: holderName || owner.name,
        planName: planName || "Custom Plan",
        startDate: new Date(pick(row, "Policy Start Date")),
        endDate: new Date(pick(row, "Policy End Date")),
        issuanceDate: new Date(pick(row, "Policy Issue Date") || Date.now()),
        issuancePlace: pick(row, "Place of Issue") || null,
        geoCoverage: pick(row, "Geographical Coverage") || "Worldwide",
        countryVisited: pick(row, "Country to be Visited") || null,
        countryOfResidence: pick(row, "Country of Residence") || null,
        deductible: pick(row, "Deductible") ? String(pick(row, "Deductible")) : null,
        nomineeName: pick(row, "Nominee Name") || null,
        ownerId: owner.id,
        planTemplateId: plan?.id || null,
      };

      const existing = await prisma.policy.findUnique({ where: { policyNumber: data.policyNumber } });
      let policy;
      if (existing) {
        policy = await prisma.policy.update({ where: { id: existing.id }, data });
        results.push({ policyNumber: data.policyNumber, status: "UPDATED", id: policy.id });
      } else {
        policy = await prisma.policy.create({
          data: {
            ...data,
            coverages: plan
              ? { create: (await prisma.planCoverage.findMany({ where: { planTemplateId: plan.id } })).map((c) => ({
                  category: c.category,
                  name: c.coverageName,
                  subCoverName: c.subCoverName,
                  sumInsured: c.sumInsured,
                  subLimitText: c.subLimitText,
                  deductible: c.deductible,
                })) }
              : undefined,
            members: {
              create: [{ name: holderName || owner.name, relationship: "Self", passportNumber: pick(row, "Passport Number") || null }],
            },
          },
        });
        results.push({ policyNumber: data.policyNumber, status: "CREATED", id: policy.id });
      }
    } catch (err) {
      results.push({ policyNumber: row["Policy Number"], status: "ERROR", reason: err.message });
    }
  }

  res.json({ results });
});

module.exports = {
  listPolicies, createPolicy, updatePolicy, addCoverage, deleteCoverage,
  addMember, deleteMember,
  listPlanTemplates, createPlanTemplate, addPlanCoverage, deletePlanCoverage,
  upsertDocumentRequirement, deleteDocumentRequirement,
  listUsers, createUser, updateUser,
  listNotifications,
  salesDataFieldSpec, syncInsurerPolicies,
};