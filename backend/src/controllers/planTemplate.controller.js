const prisma = require("../utils/prisma");
const { asyncHandler } = require("../middleware/errorHandler");
const { COVER_NAMES } = require("../data/catalog");

// GET /api/plans — any authenticated role (used by Admin policy creation,
// Agent/Customer claim initiation for sub-limit lookups, and Insurer sync).
const listPlans = asyncHandler(async (req, res) => {
  const plans = await prisma.planTemplate.findMany({
    include: { coverages: true },
    orderBy: { name: "asc" },
  });
  res.json(plans);
});

const getCoverNameCatalog = asyncHandler(async (req, res) => {
  res.json(COVER_NAMES);
});

// POST /api/admin/plans — SUPER_ADMIN only, point 5 "add the creation of a plan"
const createPlan = asyncHandler(async (req, res) => {
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

// PATCH /api/admin/plans/:id
const updatePlan = asyncHandler(async (req, res) => {
  const { description, isActive } = req.body;
  const plan = await prisma.planTemplate.update({
    where: { id: req.params.id },
    data: {
      ...(description !== undefined ? { description } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
    },
  });
  res.json(plan);
});

// POST /api/admin/plans/:id/coverages — add one coverage row to an existing plan
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

module.exports = { listPlans, getCoverNameCatalog, createPlan, updatePlan, addPlanCoverage, deletePlanCoverage };