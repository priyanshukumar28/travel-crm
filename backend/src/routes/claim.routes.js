const express = require("express");
const { authenticate, authorizeRoles } = require("../middleware/auth");
const {
  listClaims,
  getClaim,
  getRequiredDocuments,
  createClaim,
  updateIntimation,
  submitIntimation,
  validateClaim,
  resubmitIntimation,
  updateRegistration,
  submitToInsurer,
  updateAssessment,
  updateCoverageItems,
  addRemark,
  insurerDecision,
  updatePayment,
  closeClaim,
} = require("../controllers/claim.controller");

const router = express.Router();

router.use(authenticate);

router.get("/", listClaims);
router.get("/:id", getClaim);
router.get("/:id/required-documents", getRequiredDocuments);

// Intimation — Customer (self-service) or Agent (on behalf of customer)
router.post("/", authorizeRoles("CUSTOMER", "AGENT", "SUPER_ADMIN"), createClaim);
router.patch("/:id/intimation", authorizeRoles("CUSTOMER", "AGENT", "SUPER_ADMIN"), updateIntimation);
router.post("/:id/submit-intimation", authorizeRoles("CUSTOMER", "AGENT", "SUPER_ADMIN"), submitIntimation);
router.post("/:id/resubmit", authorizeRoles("CUSTOMER", "AGENT", "SUPER_ADMIN"), resubmitIntimation);

// First-level validation — Agent only
router.post("/:id/validate", authorizeRoles("AGENT", "SUPER_ADMIN"), validateClaim);

// Registration — Agent only (never exposed in the Customer portal)
router.patch("/:id/registration", authorizeRoles("AGENT", "SUPER_ADMIN"), updateRegistration);
router.post("/:id/submit-to-insurer", authorizeRoles("AGENT", "SUPER_ADMIN"), submitToInsurer);

// Assessment & decisioning — Insurer only
router.patch("/:id/assessment", authorizeRoles("INSURER", "SUPER_ADMIN"), updateAssessment);
router.post("/:id/decision", authorizeRoles("INSURER", "SUPER_ADMIN"), insurerDecision);

// Per-coverage sub-limit/payable/GOP/remarks — Agent (Registration) or Insurer (Assessment)
router.patch("/:id/coverage-items", authorizeRoles("AGENT", "INSURER", "SUPER_ADMIN"), updateCoverageItems);

// Manual attributable remarks — Agent or Insurer, any stage
router.post("/:id/remarks", authorizeRoles("AGENT", "INSURER", "SUPER_ADMIN"), addRemark);

// Payment & closure — Agent only
router.patch("/:id/payment", authorizeRoles("AGENT", "SUPER_ADMIN"), updatePayment);
router.post("/:id/close", authorizeRoles("AGENT", "SUPER_ADMIN"), closeClaim);

module.exports = router;