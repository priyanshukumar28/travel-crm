const bcrypt = require("bcryptjs");
const prisma = require("../utils/prisma");
const { asyncHandler } = require("../middleware/errorHandler");

// ---------- Policy configuration ----------

// GET /api/admin/policies
const listPolicies = asyncHandler(async (req, res) => {
  const policies = await prisma.policy.findMany({
    include: { coverages: true, owner: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(policies);
});

// POST /api/admin/policies
// body: { policyNumber, holderName, ownerEmail, planName, claimType, startDate, endDate,
//         issuanceDate, geoCoverage, issuanceBranch, coverages: [{name, sumInsured, deductible}] }
const createPolicy = asyncHandler(async (req, res) => {
  const {
    policyNumber, holderName, ownerEmail, planName, claimType,
    startDate, endDate, issuanceDate, geoCoverage, issuanceBranch, coverages,
  } = req.body;

  if (!policyNumber || !ownerEmail || !planName) {
    return res.status(400).json({ message: "policyNumber, ownerEmail and planName are required." });
  }

  let owner = await prisma.user.findUnique({ where: { email: ownerEmail.toLowerCase().trim() } });
  if (!owner) {
    // Convenience: create the customer account on the fly with a default password.
    const passwordHash = await bcrypt.hash("password123", 10);
    owner = await prisma.user.create({
      data: { name: holderName || ownerEmail, email: ownerEmail.toLowerCase().trim(), passwordHash, role: "CUSTOMER" },
    });
  }

  const policy = await prisma.policy.create({
    data: {
      policyNumber,
      holderName: holderName || owner.name,
      planName,
      claimType: claimType === "MEDICAL" ? "MEDICAL" : "TRAVEL",
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      issuanceDate: new Date(issuanceDate || Date.now()),
      geoCoverage: geoCoverage || "Worldwide",
      issuanceBranch: issuanceBranch || null,
      ownerId: owner.id,
      coverages: {
        create: (coverages || []).map((c) => ({
          name: c.name,
          sumInsured: Number(c.sumInsured) || 0,
          deductible: c.deductible || "N/A",
        })),
      },
    },
    include: { coverages: true, owner: true },
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
  const { name, sumInsured, deductible } = req.body;
  if (!name || sumInsured === undefined) {
    return res.status(400).json({ message: "name and sumInsured are required." });
  }
  const coverage = await prisma.coverage.create({
    data: { policyId: req.params.id, name, sumInsured: Number(sumInsured), deductible: deductible || "N/A" },
  });
  res.status(201).json(coverage);
});

// DELETE /api/admin/coverages/:coverageId
const deleteCoverage = asyncHandler(async (req, res) => {
  await prisma.coverage.delete({ where: { id: req.params.coverageId } });
  res.json({ message: "Coverage removed." });
});

// ---------- User management ----------

// GET /api/admin/users
const listUsers = asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" } });
  res.json(users.map(({ passwordHash, ...safe }) => safe));
});

// POST /api/admin/users — create Agent / Insurer / Admin accounts
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

// PATCH /api/admin/users/:id — e.g. deactivate is modeled as role change / phone update here
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

// GET /api/admin/notifications
const listNotifications = asyncHandler(async (req, res) => {
  const notifications = await prisma.notification.findMany({
    include: { claim: { select: { claimNumber: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  res.json(notifications);
});

module.exports = {
  listPolicies, createPolicy, updatePolicy, addCoverage, deleteCoverage,
  listUsers, createUser, updateUser,
  listNotifications,
};