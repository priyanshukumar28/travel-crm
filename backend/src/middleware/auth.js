const { verifyToken } = require("../utils/jwt");

function authenticate(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : req.query.token || null;

  if (!token) {
    return res.status(401).json({ message: "Missing or invalid Authorization header." });
  }

  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Session expired or token invalid. Please log in again." });
  }
}

function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "You do not have permission to perform this action." });
    }
    next();
  };
}

module.exports = { authenticate, authorizeRoles };