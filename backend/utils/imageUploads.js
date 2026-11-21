const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const multer = require("multer");
const sharp = require("sharp");
const heicConvert = require("heic-convert");

// Shared photo/screenshot upload handling (client-meeting photos, deliverable
// work proof). Any image format is accepted: JPG/PNG/WebP whose bytes match
// are stored as-is; everything else (iPhone HEIC, TIFF, AVIF, GIF, BMP …) is
// converted to JPEG so it shows in every browser. Files get random 128-bit
// names inside a folder served by the /uploads static route (see Server.js).

// The app shrinks photos itself when the browser can read the format; anything
// it can't (e.g. iPhone HEIC in Chrome) arrives as the original, so allow for that.
const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
const MAX_EDGE = 1600;

const EXT_BY_MIME = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };
// Some browsers send HEIC & co. with an empty or generic type — recognise them by extension.
const IMAGE_EXT = /\.(jpe?g|jfif|png|webp|gif|bmp|tiff?|heic|heif|hif|avif|svg)$/i;
const isImageUpload = (file) => /^image\//.test(file.mimetype || "") || IMAGE_EXT.test(file.originalname || "");

const SIGNATURES = {
  "image/jpeg": (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  "image/png": (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  "image/webp": (b) => b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP",
};

/** True when the saved file really starts like the image type it claims to be. */
async function hasImageSignature(file) {
  const check = SIGNATURES[file.mimetype];
  if (!check) return false;
  const handle = await fs.promises.open(file.path, "r");
  try {
    const buf = Buffer.alloc(12);
    await handle.read(buf, 0, 12, 0);
    return check(buf);
  } finally {
    await handle.close();
  }
}

/** Any decodable image → auto-rotated JPEG, at most 1600px, metadata (incl. GPS) stripped. */
function toJpeg(buffer) {
  return sharp(buffer, { failOn: "error", limitInputPixels: 120_000_000 })
    .rotate()
    .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
}

function removeFiles(files = []) {
  (files || []).forEach((f) => {
    if (f?.path) fs.promises.unlink(f.path).catch(() => {});
  });
}

/**
 * Upload handling for one public folder.
 *   receive   — multer middleware for multipart `field` (errors → 400 JSON)
 *   normalize — keep / convert one received file; throws if it isn't an image
 *   removeFile(filename) — delete a stored file from the folder
 */
function createImageUpload({ dir, field, maxFiles, noun = "photo" }) {
  // Originals that still need converting wait here — outside the public folder.
  const incomingDir = path.join(os.tmpdir(), `crm-${path.basename(dir)}-uploads`);

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const target = EXT_BY_MIME[file.mimetype] ? dir : incomingDir;
      fs.mkdir(target, { recursive: true }, (err) => cb(err, target));
    },
    // The extension comes from the (allow-listed) type, never from the user's file
    // name; formats that get converted wait (privately) as ".upload" until they're JPEG.
    filename: (req, file, cb) => cb(null, `${crypto.randomBytes(16).toString("hex")}${EXT_BY_MIME[file.mimetype] || ".upload"}`),
  });

  const upload = multer({
    storage,
    limits: { fileSize: MAX_IMAGE_BYTES, files: maxFiles },
    fileFilter: (req, file, cb) => {
      if (isImageUpload(file)) return cb(null, true);
      const err = new Error("Only photos / image files can be uploaded");
      err.status = 400;
      return cb(err);
    },
  }).array(field, maxFiles);

  function receive(req, res, next) {
    upload(req, res, (err) => {
      if (!err) return next();
      removeFiles(req.files);
      let message = err.message || "Upload failed";
      if (err.code === "LIMIT_FILE_SIZE") message = `Each ${noun} must be under ${MAX_IMAGE_BYTES / (1024 * 1024)} MB`;
      if (err.code === "LIMIT_FILE_COUNT" || err.code === "LIMIT_UNEXPECTED_FILE") message = `Upload up to ${maxFiles} ${noun}s at a time`;
      return res.status(err.status || 400).json({ message });
    });
  }

  /**
   * Keeps JPG/PNG/WebP whose bytes match; converts anything else to JPEG —
   * via sharp, or for iPhone HEIC/HEIF (which sharp's build can't decode) via
   * heic-convert first. Returns the (possibly new) multer file object.
   */
  async function normalize(file) {
    if (EXT_BY_MIME[file.mimetype] && (await hasImageSignature(file))) return file;

    const input = await fs.promises.readFile(file.path);
    let jpeg;
    try {
      jpeg = await toJpeg(input);
    } catch {
      const decoded = await heicConvert({ buffer: input, format: "JPEG", quality: 0.92 }); // throws if not HEIC/HEIF either
      jpeg = await toJpeg(Buffer.from(decoded));
    }
    const filename = `${crypto.randomBytes(16).toString("hex")}.jpg`;
    const dest = path.join(dir, filename);
    await fs.promises.mkdir(dir, { recursive: true });
    await fs.promises.writeFile(dest, jpeg);
    await fs.promises.unlink(file.path).catch(() => {});
    return { ...file, filename, path: dest, mimetype: "image/jpeg", size: jpeg.length };
  }

  function removeFile(filename) {
    if (!filename || filename.includes("/") || filename.includes("\\")) return;
    fs.promises.unlink(path.join(dir, filename)).catch(() => {});
  }

  return { receive, normalize, removeFile };
}

module.exports = { createImageUpload, hasImageSignature, removeFiles, MAX_IMAGE_BYTES };
