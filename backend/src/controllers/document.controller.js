const prisma = require("../utils/prisma");
const { asyncHandler } = require("../middleware/errorHandler");
const { uploadBuffer, destroyByPublicId } = require("../utils/cloudinary");

function canAccessClaim(user, claim) {
  if (user.role === "SUPER_ADMIN") return true;
  if (user.role === "AGENT" || user.role === "INSURER") return true;
  if (user.role === "CUSTOMER") return claim.policy.ownerId === user.id;
  return false;
}

// POST /api/claims/:id/documents  (multipart/form-data, field name "file")
// The file never touches this server's disk — multer holds it in memory
// (see utils/upload.js) and it's streamed straight to Cloudinary.
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
      action: `Uploaded document: ${req.file.originalname}`,
      meta: { docType: doc.docType, documentId: doc.id },
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
      id: d.id,
      fileName: d.fileName,
      docType: d.docType,
      stage: d.stage,
      mimeType: d.mimeType,
      sizeBytes: d.sizeBytes,
      url: d.url,
      uploadedByRole: d.uploadedByRole,
      uploadedByName: d.uploadedBy.name,
      createdAt: d.createdAt,
    }))
  );
});

// DELETE /api/documents/:docId — uploader or Agent/Admin only
const deleteDocument = asyncHandler(async (req, res) => {
  const doc = await prisma.document.findUnique({ where: { id: req.params.docId }, include: { claim: { include: { policy: true } } } });
  if (!doc) return res.status(404).json({ message: "Document not found." });

  const canDelete = doc.uploadedById === req.user.id || ["AGENT", "SUPER_ADMIN"].includes(req.user.role);
  if (!canDelete) return res.status(403).json({ message: "You cannot delete this document." });

  await destroyByPublicId(doc.publicId).catch(() => {}); // best-effort cloud cleanup
  await prisma.document.delete({ where: { id: doc.id } });

  res.json({ message: "Document deleted." });
});

module.exports = { uploadDocument, listDocuments, deleteDocument };