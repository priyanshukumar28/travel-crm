const express = require("express");
const { authenticate, authorizeRoles } = require("../middleware/auth");
const {
  listClaims, listQueues,
  getClaim, getRequiredDocuments, getLinkedClaims,
  createClaim,
  updateIntimation, submitIntimation,
  validateClaim, sendReminder, resubmitIntimation,
  updateRegistration, submitToInsurer,
  updateAssessment, updateCoverageItems, addRemark,
  insurerDecision, updatePayment, closeClaim, closeDeficient, reopenClaim,
} = require("../controllers/claim.controller");

const router = express.Router();
router.use(authenticate);

router.get("/", listClaims);
router.get("/queues", authorizeRoles("AGENT", "SUPER_ADMIN"), listQueues); // point 15
router.get("/:id", getClaim);
router.get("/:id/required-documents", getRequiredDocuments);
router.get("/:id/linked", getLinkedClaims);

router.post("/", authorizeRoles("CUSTOMER", "AGENT", "SUPER_ADMIN"), createClaim);
router.patch("/:id/intimation", authorizeRoles("CUSTOMER", "AGENT", "SUPER_ADMIN"), updateIntimation);
router.post("/:id/submit-intimation", authorizeRoles("CUSTOMER", "AGENT", "SUPER_ADMIN"), submitIntimation);
router.post("/:id/resubmit", authorizeRoles("CUSTOMER", "AGENT", "SUPER_ADMIN"), resubmitIntimation);

router.post("/:id/validate", authorizeRoles("AGENT", "SUPER_ADMIN"), validateClaim);
router.post("/:id/send-reminder", authorizeRoles("AGENT", "SUPER_ADMIN"), sendReminder); // point 12/15
router.post("/:id/close-deficient", authorizeRoles("AGENT", "SUPER_ADMIN"), closeDeficient); // point 15

router.patch("/:id/registration", authorizeRoles("AGENT", "SUPER_ADMIN"), updateRegistration);
router.post("/:id/submit-to-insurer", authorizeRoles("AGENT", "SUPER_ADMIN"), submitToInsurer);

router.patch("/:id/assessment", authorizeRoles("INSURER", "SUPER_ADMIN"), updateAssessment);
router.post("/:id/decision", authorizeRoles("INSURER", "SUPER_ADMIN"), insurerDecision);

router.patch("/:id/coverage-items", authorizeRoles("AGENT", "INSURER", "SUPER_ADMIN"), updateCoverageItems);
router.post("/:id/remarks", authorizeRoles("AGENT", "INSURER", "SUPER_ADMIN"), addRemark);

router.patch("/:id/payment", authorizeRoles("AGENT", "SUPER_ADMIN"), updatePayment);
router.post("/:id/close", authorizeRoles("AGENT", "SUPER_ADMIN"), closeClaim);
router.post("/:id/reopen", authorizeRoles("AGENT", "SUPER_ADMIN"), reopenClaim); // point 4

module.exports = router;