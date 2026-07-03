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
claimScopedRouter.post(
  "/",
  upload.single("file"),
  // TEMP DIAGNOSTIC — remove once the upload issue is confirmed fixed.
  (req, res, next) => {
    console.log("[upload debug] content-type:", req.headers["content-type"]);
    console.log("[upload debug] req.file present:", !!req.file);
    if (req.file) {
      console.log("[upload debug] originalname:", req.file.originalname, "| size:", req.file.size, "| mimetype:", req.file.mimetype);
    }
    console.log("[upload debug] req.body:", req.body);
    next();
  },
  uploadDocument
);
claimScopedRouter.get("/", listDocuments);

const documentRouter = express.Router();
documentRouter.use(authenticate);
documentRouter.delete("/:docId", deleteDocument);

module.exports = { claimScopedRouter, documentRouter };