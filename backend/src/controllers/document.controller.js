const prisma = require("../utils/prisma");
const { asyncHandler } = require("../middleware/errorHandler");
const { uploadBuffer } = require("../utils/cloudinary");

function canAccessClaim(user, claim) {
  if (user.role === "SUPER_ADMIN") return true;
  if (user.role === "AGENT" || user.role === "INSURER") return true;
  if (user.role === "CUSTOMER") return claim.policy.ownerId === user.id;
  return false;
}

// POST /api/claims/:id/documents
// Point 22: uploading the same docType again simply adds another row —
// there is no dedupe/replace step, and (see below) no delete endpoint at
// all anymore. Every version ever uploaded stays on file permanently.
const uploadDocument = asyncHandler(async (req, res) => {
  const claim = await prisma.claim.findUnique({ where: { id: req.params.id }, include: { policy: true } });
  if (!claim) return res.status(404).json({ message: "Claim not found." });
  if (!canAccessClaim(req.user, claim)) return res.status(403).json({ message: "Not your claim." });
  if (!req.file) return res.status(400).json({ message: "No file received. Attach a file under field name 'file'." });

  const result = await uploadBuffer(req.file.buffer, { folder: `across-assist/${claim.id}` });

  const doc = await prisma.document.create({
    data: {
      claimId: claim.id,
      uploadedById: req.user.id,
      uploadedByRole: req.user.role,
      stage: claim.stage,
      docType: req.body.docType || "Others",
      fileName: req.file.originalname,
      url: result.secure_url,
      publicId: result.public_id,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
    },
  });

  await prisma.activityLog.create({
    data: {
      claimId: claim.id,
      userId: req.user.id,
      role: req.user.role,
      action: `Uploaded document: ${req.file.originalname} (${doc.docType})`,
      meta: { type: "document_upload", docType: doc.docType, documentId: doc.id, fileName: doc.fileName },
    },
  });

  res.status(201).json(doc);
});

// GET /api/claims/:id/documents
const listDocuments = asyncHandler(async (req, res) => {
  const claim = await prisma.claim.findUnique({ where: { id: req.params.id }, include: { policy: true } });
  if (!claim) return res.status(404).json({ message: "Claim not found." });
  if (!canAccessClaim(req.user, claim)) return res.status(403).json({ message: "Not your claim." });

  const docs = await prisma.document.findMany({
    where: { claimId: claim.id },
    include: { uploadedBy: true },
    orderBy: { createdAt: "desc" },
  });

  res.json(
    docs.map((d) => ({
      id: d.id, fileName: d.fileName, docType: d.docType, stage: d.stage, mimeType: d.mimeType,
      sizeBytes: d.sizeBytes, url: d.url, uploadedByRole: d.uploadedByRole, uploadedByName: d.uploadedBy.name, createdAt: d.createdAt,
    }))
  );
});

// Point 19 — a filtered view of just the document-related activity, so it's
// easy to answer "who uploaded what and when" without scrolling the full log.
const getDocumentActivity = asyncHandler(async (req, res) => {
  const claim = await prisma.claim.findUnique({ where: { id: req.params.id }, include: { policy: true } });
  if (!claim) return res.status(404).json({ message: "Claim not found." });
  if (!canAccessClaim(req.user, claim)) return res.status(403).json({ message: "Not your claim." });

  const logs = await prisma.activityLog.findMany({
    where: { claimId: claim.id, action: { contains: "document", mode: "insensitive" } },
    include: { user: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(logs);
});

// Point 22: deleteDocument is intentionally removed. There is no route for
// it (see routes/document.routes.js) — this comment is here so it's obvious
// on review that the absence is deliberate, not an oversight.

module.exports = { uploadDocument, listDocuments, getDocumentActivity };