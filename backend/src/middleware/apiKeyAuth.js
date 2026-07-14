const prisma = require("../utils/prisma");

// Authenticates insurer-feed calls with a long-lived API key instead of a
// user JWT — this is what an external insurer system actually has, not a
// human login. Expects header:  X-API-Key: <key>
async function apiKeyAuth(req, res, next) {
  const key = req.headers["x-api-key"];
  if (!key) {
    return res.status(401).json({ message: "Missing X-API-Key header." });
  }

  const record = await prisma.apiKey.findUnique({ where: { key } });
  if (!record || !record.isActive) {
    return res.status(401).json({ message: "Invalid or revoked API key." });
  }

  req.apiKey = record;
  next();
}

module.exports = { apiKeyAuth };