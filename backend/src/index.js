require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const { notFoundHandler, errorHandler } = require("./middleware/errorHandler");
const authRoutes = require("./routes/auth.routes");
const policyRoutes = require("./routes/policy.routes");
const claimRoutes = require("./routes/claim.routes");
const { claimScopedRouter: claimDocumentRoutes, documentRouter } = require("./routes/document.routes");
const adminRoutes = require("./routes/admin.routes");
const planTemplateRoutes = require("./routes/planTemplate.routes");
const documentRequirementRoutes = require("./routes/documentRequirement.routes");
const insurerFeedRoutes = require("./routes/insurerFeed.routes");

const app = express();

// CORS_ORIGIN can be a single URL or a comma-separated list (e.g. your
// Vercel prod URL + http://localhost:5173 for local dev against the
// deployed backend). "*" still works if you want to allow anything.
const allowedOrigins = (process.env.CORS_ORIGIN || "*")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (allowedOrigins.includes("*") || !origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
  })
);
app.use(express.json());
app.use(morgan("dev"));

app.get("/api/health", (req, res) => res.json({ status: "ok", service: "across-assist-backend" }));

app.use("/api/auth", authRoutes);
app.use("/api/policies", policyRoutes);
app.use("/api/claims", claimRoutes);
app.use("/api/claims/:id/documents", claimDocumentRoutes);
app.use("/api/documents", documentRouter);
app.use("/api/admin", adminRoutes);
app.use("/api/plans", planTemplateRoutes);
app.use("/api/document-requirements", documentRequirementRoutes);
app.use("/api/insurer-feed", insurerFeedRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Across Assist backend listening on http://localhost:${PORT}`);
});