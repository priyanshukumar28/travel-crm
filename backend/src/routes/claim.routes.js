const express = require("express");
const { authenticate, authorizeRoles } = require("../middleware/auth");
const {
  listClaims,
  getClaim,
  createClaim,
  updateIntimation,
  submitIntimation,
  validateClaim,
  resubmitIntimation,
  updateRegistration,
  submitToInsurer,
  updateAssessment,
  insurerDecision,
  updatePayment,
  closeClaim,
} = require("../controllers/claim.controller");

const router = express.Router();

router.use(authenticate);

router.get("/", listClaims);
router.get("/:id", getClaim);

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

// Payment & closure — Agent only
router.patch("/:id/payment", authorizeRoles("AGENT", "SUPER_ADMIN"), updatePayment);
router.post("/:id/close", authorizeRoles("AGENT", "SUPER_ADMIN"), closeClaim);

module.exports = router;
