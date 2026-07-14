const express = require("express");
const { authenticate, authorizeRoles } = require("../middleware/auth");
const { listPlans, getCoverNameCatalog } = require("../controllers/planTemplate.controller");

const router = express.Router();
router.use(authenticate);

router.get("/", listPlans);
router.get("/cover-names", getCoverNameCatalog);

module.exports = router;