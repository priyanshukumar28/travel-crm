const express = require("express");
const { authenticate } = require("../middleware/auth");
const { previewConvert } = require("../controllers/fx.controller");

const router = express.Router();
router.use(authenticate);
router.get("/convert", previewConvert);

module.exports = router;