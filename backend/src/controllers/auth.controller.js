const bcrypt = require("bcryptjs");
const prisma = require("../utils/prisma");
const { signToken } = require("../utils/jwt");
const { asyncHandler } = require("../middleware/errorHandler");

// POST /api/auth/login
// Single login endpoint for all three portals — the role comes back from the
// database record, not from what the client claims to be.
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user) {
    return res.status(401).json({ message: "Invalid email or password." });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ message: "Invalid email or password." });
  }

  const token = signToken({ id: user.id, role: user.role, name: user.name, email: user.email });

  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
});

// GET /api/auth/me
const me = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) return res.status(404).json({ message: "User not found." });
  res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
});

module.exports = { login, me };
