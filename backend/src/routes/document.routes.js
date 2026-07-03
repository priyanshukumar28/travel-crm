const express = require("express");
const { authenticate } = require("../middleware/auth");
const { upload } = require("../utils/upload");
const {
  uploadDocument,
  listDocuments,
  deleteDocument,
} = require("../controllers/document.controller");

// Mounted twice from index.js: under /api/claims/:id/documents and /api/documents/:docId
const claimScopedRouter = express.Router({ mergeParams: true });
claimScopedRouter.use(authenticate);
claimScopedRouter.post("/", upload.single("file"), uploadDocument);
claimScopedRouter.get("/", listDocuments);

const documentRouter = express.Router();
documentRouter.use(authenticate);
documentRouter.delete("/:docId", deleteDocument);

module.exports = { claimScopedRouter, documentRouter };