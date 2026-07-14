const express = require("express");
const { authenticate } = require("../middleware/auth");
const { listRequirements, requirementsForCoverages } = require("../controllers/documentRequirement.controller");

const router = express.Router();
router.use(authenticate);

router.get("/", listRequirements);
router.get("/for-coverages", requirementsForCoverages);

module.exports = router;