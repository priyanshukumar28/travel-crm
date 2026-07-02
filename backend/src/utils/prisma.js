const { PrismaClient } = require("@prisma/client");

// Reuse a single Prisma Client instance across the app (recommended by Prisma
// for long-running Node servers to avoid exhausting DB connections).
const prisma = new PrismaClient();

module.exports = prisma;
