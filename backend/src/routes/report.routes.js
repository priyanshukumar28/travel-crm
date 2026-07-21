const express = require("express");
const { authenticate, authorizeRoles } = require("../middleware/auth");
const { reserveAnalysisExport, misExport } = require("../controllers/report.controller");

const router = express.Router();
router.use(authenticate, authorizeRoles("SUPER_ADMIN", "AGENT"));

router.get("/reserve-analysis.csv", reserveAnalysisExport);
router.get("/mis.csv", misExport);

module.exports = router;