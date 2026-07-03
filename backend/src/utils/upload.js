const multer = require("multer");

// No local disk involved at all — files are held in memory just long enough
// to stream to Cloudinary (see document.controller.js), which works
// identically whether the server has 1 instance or 10, and survives Render
// restarts/redeploys since nothing is written to the container's disk.

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB per file
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(new Error("Unsupported file type. Allowed: PDF, JPG, PNG, WEBP, DOC, DOCX."));
    }
    cb(null, true);
  },
});

module.exports = { upload };