// Shared by every photo / screenshot upload in the app (client-meeting
// photos, deliverable work proof).

// Uploaded files are served by the API server under /api/uploads. (Not
// /uploads: the live server only forwards /api to the backend — anything else
// returns the frontend page, which is why images showed as broken.)
const API_BASE = (import.meta.env.VITE_API_BASE_URL || "https://crm.cybertricksmedia.in/api").replace(/\/+$/, "");

/** Public URL of a file the server stored under uploads/ (path like "visit-photos/abc.jpg"). */
export const uploadsUrl = (filePath) => `${API_BASE}/uploads/${String(filePath).split("/").map(encodeURIComponent).join("/")}`;

/** Public URL of a file the server stored under uploads/<folder>/. */
export const uploadedFileUrl = (folder, filename) => uploadsUrl(`${folder}/${filename}`);

const MAX_EDGE = 1600;
const MAX_ORIGINAL_MB = 25; // same cap as the server
// Image files some systems hand over with an empty / generic type.
const IMAGE_EXT = /\.(jpe?g|jfif|png|webp|gif|bmp|tiff?|heic|heif|hif|avif|svg)$/i;
/** For file pickers: every image, plus formats some OSes don't file under image/*. */
export const PHOTO_ACCEPT = "image/*,.heic,.heif,.hif,.avif,.tif,.tiff";

/** Decodes an image the browser understands; null when it can't (e.g. HEIC in Chrome). */
async function decodeImage(file) {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch { /* some formats (e.g. SVG) only decode through <img> */ }
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.src = url;
  try {
    await img.decode();
    return img;
  } catch {
    URL.revokeObjectURL(url);
    return null;
  }
}

/**
 * Prepares any photo for upload. If this browser can read the format (JPG,
 * PNG, WebP, GIF, BMP, AVIF … and HEIC on iPhone Safari), it's shrunk here to a
 * ≤1600px JPEG of a few hundred KB, so it goes through quickly on mobile data.
 * If it can't (e.g. an iPhone HEIC photo in Chrome, or TIFF), the original is
 * sent and the server converts it to JPEG — so every image format works.
 */
export async function preparePhoto(file) {
  if (!/^image\//.test(file.type) && !IMAGE_EXT.test(file.name)) {
    throw new Error(`"${file.name}" isn't a photo or image file.`);
  }
  const source = await decodeImage(file);
  if (!source) {
    if (file.size > MAX_ORIGINAL_MB * 1024 * 1024) throw new Error(`"${file.name}" is too large (max ${MAX_ORIGINAL_MB} MB).`);
    return file; // converted on the server
  }
  const width = source.naturalWidth || source.width;
  const height = source.naturalHeight || source.height;
  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
    if (scale === 1 && file.type === "image/jpeg" && file.size < 900 * 1024) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff"; // transparent PNG/GIF/SVG → white, not black, as JPEG
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
    if (!blob) return file; // let the server convert it
    const name = `${file.name.replace(/\.[^.]+$/, "") || "photo"}.jpg`;
    return new File([blob], name, { type: "image/jpeg", lastModified: file.lastModified });
  } finally {
    if (source.close) source.close();
    else if (source.src?.startsWith("blob:")) URL.revokeObjectURL(source.src);
  }
}
