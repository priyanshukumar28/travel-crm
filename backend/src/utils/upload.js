const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const multer = require("multer");

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, "..", "..", "uploads");

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    // Never trust the client's filename on disk — random name, original kept in DB only.
    const randomName = crypto.randomBytes(20).toString("hex");
    const ext = path.extname(file.originalname).slice(0, 10);
    cb(null, `${randomName}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB per file
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(new Error("Unsupported file type. Allowed: PDF, JPG, PNG, WEBP, DOC, DOCX."));
    }
    cb(null, true);
  },
});

module.exports = { upload, UPLOAD_DIR };