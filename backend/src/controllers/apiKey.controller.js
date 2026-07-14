const crypto = require("crypto");
const prisma = require("../utils/prisma");
const { asyncHandler } = require("../middleware/errorHandler");

function generateKey() {
  return `aa_live_${crypto.randomBytes(24).toString("hex")}`;
}

// GET /api/admin/api-keys
const listApiKeys = asyncHandler(async (req, res) => {
  const keys = await prisma.apiKey.findMany({ orderBy: { createdAt: "desc" } });
  res.json(keys);
});

// POST /api/admin/api-keys — body: { label }
// The generated key is only ever shown in full in this create response —
// same pattern as every real API-key product (Stripe, SendGrid, etc.) —
// copy it now, because the list view afterwards won't show it in full again.
const createApiKey = asyncHandler(async (req, res) => {
  const { label } = req.body;
  if (!label) return res.status(400).json({ message: "A label is required (e.g. \"ITGI Insurer Feed\")." });

  const key = generateKey();
  const record = await prisma.apiKey.create({ data: { label, key } });
  res.status(201).json(record);
});

// PATCH /api/admin/api-keys/:id — revoke/reactivate
const updateApiKey = asyncHandler(async (req, res) => {
  const { isActive } = req.body;
  const record = await prisma.apiKey.update({
    where: { id: req.params.id },
    data: { ...(isActive !== undefined ? { isActive } : {}) },
  });
  res.json(record);
});

module.exports = { listApiKeys, createApiKey, updateApiKey };