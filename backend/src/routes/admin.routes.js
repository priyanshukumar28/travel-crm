const express = require("express");
const { authenticate, authorizeRoles } = require("../middleware/auth");
const {
  listPolicies, createPolicy, updatePolicy, addCoverage, deleteCoverage,
  addMember, deleteMember,
  listPlanTemplates, createPlanTemplate, addPlanCoverage, deletePlanCoverage,
  upsertDocumentRequirement, deleteDocumentRequirement,
  listUsers, createUser, updateUser,
  listNotifications,
  salesDataFieldSpec, syncInsurerPolicies,
} = require("../controllers/admin.controller");
const { listApiKeys, createApiKey, updateApiKey } = require("../controllers/apiKey.controller");
const { listFeedEvents } = require("../controllers/insurerFeed.controller");

const router = express.Router();

router.use(authenticate, authorizeRoles("SUPER_ADMIN"));

router.get("/policies", listPolicies);
router.post("/policies", createPolicy);
router.patch("/policies/:id", updatePolicy);
router.post("/policies/:id/coverages", addCoverage);
router.delete("/coverages/:coverageId", deleteCoverage);

router.post("/policies/:id/members", addMember);
router.delete("/members/:memberId", deleteMember);

router.get("/plans", listPlanTemplates);
router.post("/plans", createPlanTemplate);
router.post("/plans/:id/coverages", addPlanCoverage);
router.delete("/plan-coverages/:coverageId", deletePlanCoverage);

router.post("/document-requirements", upsertDocumentRequirement);
router.delete("/document-requirements/:id", deleteDocumentRequirement);

router.get("/users", listUsers);
router.post("/users", createUser);
router.patch("/users/:id", updateUser);

router.get("/notifications", listNotifications);

// Point 13 — insurer sales-data feed
router.get("/insurer-sync/fields", salesDataFieldSpec);
router.post("/insurer-sync", syncInsurerPolicies);

// API keys the insurer's system authenticates the live feed with
router.get("/api-keys", listApiKeys);
router.post("/api-keys", createApiKey);
router.patch("/api-keys/:id", updateApiKey);

// Permanent history of every call the live feed has ever received
router.get("/insurer-feed/events", listFeedEvents);

module.exports = router;