const prisma = require("../utils/prisma");
const { asyncHandler } = require("../middleware/errorHandler");

// GET /api/document-requirements — full admin-editable catalog
const listRequirements = asyncHandler(async (req, res) => {
  const rows = await prisma.documentRequirement.findMany({ orderBy: { coverageName: "asc" } });
  res.json(rows);
});

// GET /api/document-requirements/for-coverages?names=A,B,C
// Point 1: any claim workspace calls this with the coverage names actually
// selected on that claim to get the exact dynamic document checklist —
// no hardcoded document list anywhere in the frontend.
const requirementsForCoverages = asyncHandler(async (req, res) => {
  const names = (req.query.names || "")
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean);

  if (names.length === 0) return res.json([]);

  const rows = await prisma.documentRequirement.findMany({
    where: { coverageName: { in: names } },
  });
  res.json(rows);
});

// POST /api/admin/document-requirements — SUPER_ADMIN, create or fully replace
const upsertRequirement = asyncHandler(async (req, res) => {
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

const deleteRequirement = asyncHandler(async (req, res) => {
  await prisma.documentRequirement.delete({ where: { id: req.params.id } });
  res.json({ message: "Document requirement removed." });
});

module.exports = { listRequirements, requirementsForCoverages, upsertRequirement, deleteRequirement };