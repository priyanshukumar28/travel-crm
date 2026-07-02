const express = require("express");
const { getMyPolicies, searchPolicies, getPolicyById } = require("../controllers/policy.controller");
const { authenticate, authorizeRoles } = require("../middleware/auth");

const router = express.Router();

router.use(authenticate);

router.get("/mine", authorizeRoles("CUSTOMER"), getMyPolicies);
router.get("/search", authorizeRoles("AGENT", "INSURER", "SUPER_ADMIN"), searchPolicies);
router.get("/:id", getPolicyById);

module.exports = router;
