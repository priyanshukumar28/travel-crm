const express = require("express");
const { apiKeyAuth } = require("../middleware/apiKeyAuth");
const { receivePolicyEvent } = require("../controllers/insurerFeed.controller");

// This router is NOT behind the JWT `authenticate` middleware — it's a
// machine-to-machine endpoint the insurer's own system calls directly,
// authenticated with an API key instead of a user login.
const router = express.Router();

router.post("/policies", apiKeyAuth, receivePolicyEvent);

module.exports = router;