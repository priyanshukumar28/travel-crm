const express = require("express");
const { authenticate, authorizeRoles } = require("../middleware/auth");
const {
  listPolicies, createPolicy, updatePolicy, addCoverage, deleteCoverage,
  listUsers, createUser, updateUser,
  listNotifications,
} = require("../controllers/admin.controller");

const router = express.Router();

router.use(authenticate, authorizeRoles("SUPER_ADMIN"));

router.get("/policies", listPolicies);
router.post("/policies", createPolicy);
router.patch("/policies/:id", updatePolicy);
router.post("/policies/:id/coverages", addCoverage);
router.delete("/coverages/:coverageId", deleteCoverage);

router.get("/users", listUsers);
router.post("/users", createUser);
router.patch("/users/:id", updateUser);

router.get("/notifications", listNotifications);

module.exports = router;