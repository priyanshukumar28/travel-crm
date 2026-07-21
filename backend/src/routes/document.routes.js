const express = require("express");
const { authenticate } = require("../middleware/auth");
const { upload } = require("../utils/upload");
const { uploadDocument, listDocuments, getDocumentActivity } = require("../controllers/document.controller");

// Point 22: no DELETE route exists here on purpose — documents are
// permanent once uploaded. Re-uploading the same docType is fine and just
// creates another row; nothing is ever removed.
const claimScopedRouter = express.Router({ mergeParams: true });
claimScopedRouter.use(authenticate);
claimScopedRouter.post("/", upload.single("file"), uploadDocument);
claimScopedRouter.get("/", listDocuments);
claimScopedRouter.get("/activity", getDocumentActivity); // point 19

module.exports = { claimScopedRouter };