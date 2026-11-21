const path = require("path");
const { createImageUpload, hasImageSignature, removeFiles } = require("./imageUploads");

// Photos a sales person takes at a client meeting (with the client, their
// visiting card, the office / factory …). Stored next to the PI attachments,
// in their own folder, under random 128-bit names (served by the /uploads
// static route — see Server.js). Upload/format handling: utils/imageUploads.js.
const PHOTO_DIR = path.join(__dirname, "../uploads/visit-photos");
const PHOTO_CATEGORIES = ["with-client", "business-card", "premises", "other"];
const MAX_PHOTOS_PER_VISIT = 12;
const MAX_PHOTOS_PER_REQUEST = 6;
// Photos can be added / removed while the meeting is open and for a day after
// it ends (patchy network on site); after that the record is locked.
const PHOTO_EDIT_WINDOW_HOURS = 24;

const photos = createImageUpload({ dir: PHOTO_DIR, field: "photos", maxFiles: MAX_PHOTOS_PER_REQUEST });

/** Photos can be changed while the meeting is open and up to a day after it ends. */
function canEditPhotos(visit, now = Date.now()) {
  if (visit.status === "in-progress") return true;
  const endedAt = visit.checkOut?.at ? new Date(visit.checkOut.at).getTime() : NaN;
  return Number.isFinite(endedAt) && now - endedAt <= PHOTO_EDIT_WINDOW_HOURS * 3600 * 1000;
}

module.exports = {
  PHOTO_CATEGORIES,
  MAX_PHOTOS_PER_VISIT,
  MAX_PHOTOS_PER_REQUEST,
  PHOTO_EDIT_WINDOW_HOURS,
  receivePhotos: photos.receive,
  normalizePhoto: photos.normalize,
  hasImageSignature,
  removeFiles,
  removePhotoFile: photos.removeFile,
  canEditPhotos,
};
