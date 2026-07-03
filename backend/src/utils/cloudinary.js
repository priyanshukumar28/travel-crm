const cloudinary = require("cloudinary").v2;

// Reads CLOUDINARY_URL from env automatically if set (format:
// cloudinary://<api_key>:<api_secret>@<cloud_name>), or falls back to the
// three separate vars below — whichever you find easier to paste into
// Render's environment variable UI.
if (!process.env.CLOUDINARY_URL) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

// Uploads a Buffer (from multer's memoryStorage) straight to Cloudinary
// without ever touching the server's disk.
function uploadBuffer(buffer, { folder, resourceType = "auto" } = {}) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: folder || "across-assist/claim-documents", resource_type: resourceType },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });
}

function destroyByPublicId(publicId, resourceType = "auto") {
  return cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}

module.exports = { uploadBuffer, destroyByPublicId };