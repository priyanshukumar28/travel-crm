const prisma = require("../utils/prisma");
const { asyncHandler } = require("../middleware/errorHandler");

// GET /api/policies/mine — Customer: their own policies
const getMyPolicies = asyncHandler(async (req, res) => {
  const policies = await prisma.policy.findMany({
    where: { ownerId: req.user.id },
    include: { coverages: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(policies);
});

// GET /api/policies/search?q=POTBHI00100017114 — Agent/Insurer lookup by policy number
const searchPolicies = asyncHandler(async (req, res) => {
  const q = (req.query.q || "").trim();
  if (!q) return res.json([]);

  const policies = await prisma.policy.findMany({
    where: {
      OR: [
        { policyNumber: { contains: q, mode: "insensitive" } },
        { holderName: { contains: q, mode: "insensitive" } },
      ],
    },
    include: { coverages: true, owner: true },
    take: 20,
  });

  res.json(
    policies.map((p) => ({
      ...p,
      owner: { id: p.owner.id, name: p.owner.name, email: p.owner.email },
    }))
  );
});

// GET /api/policies/:id
const getPolicyById = asyncHandler(async (req, res) => {
  const policy = await prisma.policy.findUnique({
    where: { id: req.params.id },
    include: { coverages: true, owner: true },
  });
  if (!policy) return res.status(404).json({ message: "Policy not found." });
  res.json(policy);
});

module.exports = { getMyPolicies, searchPolicies, getPolicyById };
