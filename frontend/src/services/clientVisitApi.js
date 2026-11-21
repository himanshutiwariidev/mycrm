import API from "./api";
import { uploadedFileUrl } from "../utils/uploads";

// Shared with deliverable work proof — re-exported for existing imports.
export { preparePhoto, PHOTO_ACCEPT } from "../utils/uploads";

/**
 * Client meeting check-ins with live location.
 * Sales person: checkIn / checkOut / getMyVisits. Super admin: getAllVisits.
 */
export const checkInClientVisit = (payload) => API.post("/client-visits/check-in", payload);

export const checkOutClientVisit = (visitId, payload) => API.put(`/client-visits/${visitId}/check-out`, payload);

export const getMyClientVisits = (limit = 50) => API.get("/client-visits/mine", { params: { limit } });

export const getAllClientVisits = (params) => API.get("/client-visits", { params });

// ── Meeting photos (with the client, visiting card, office / factory …) ──────
// Limits mirror backend/utils/visitPhotos.js.
export const PHOTO_CATEGORIES = [
  { value: "with-client", label: "With client" },
  { value: "business-card", label: "Business card" },
  { value: "premises", label: "Office / factory" },
  { value: "other", label: "Other" },
];
export const photoCategoryLabel = (value) => PHOTO_CATEGORIES.find((c) => c.value === value)?.label || "Other";
export const MAX_VISIT_PHOTOS = 12;
export const MAX_PHOTOS_PER_UPLOAD = 6;
export const PHOTO_EDIT_WINDOW_HOURS = 24;

/** Uploads photos to your own meeting; `onProgress` gets 0–100. */
export function addVisitPhotos(visitId, files, { category, caption } = {}, onProgress) {
  const form = new FormData();
  files.forEach((file) => form.append("photos", file, file.name));
  if (category) form.append("category", category);
  if (caption) form.append("caption", caption);
  return API.post(`/client-visits/${visitId}/photos`, form, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (e) => onProgress?.(e.total ? Math.round((e.loaded / e.total) * 100) : 0),
  });
}

export const deleteVisitPhoto = (visitId, photoId) => API.delete(`/client-visits/${visitId}/photos/${photoId}`);

export const visitPhotoUrl = (photo) => uploadedFileUrl("visit-photos", photo.filename);

/** Same rule as the server: open meeting, or ended less than 24 hours ago. */
export function canEditVisitPhotos(visit, now = Date.now()) {
  if (!visit) return false;
  if (visit.status === "in-progress") return true;
  const endedAt = visit.checkOut?.at ? new Date(visit.checkOut.at).getTime() : NaN;
  return Number.isFinite(endedAt) && now - endedAt <= PHOTO_EDIT_WINDOW_HOURS * 3600 * 1000;
}

/** True when the photo was added after the meeting had already ended. */
export const addedAfterMeeting = (photo, visit) =>
  Boolean(visit?.checkOut?.at && photo?.uploadedAt && new Date(photo.uploadedAt) > new Date(visit.checkOut.at));

/**
 * Asks the browser for one fresh, high-accuracy location fix. Resolves to
 * { lat, lng, accuracy, deviceTime }; rejects with an Error whose message is
 * safe to show the user as-is. Never uses a cached position (maximumAge: 0),
 * so a check-in always reflects where the person actually is right now.
 */
export function getCurrentLocation({ timeoutMs = 20000 } = {}) {
  return new Promise((resolve, reject) => {
    if (typeof window !== "undefined" && window.isSecureContext === false) {
      reject(new Error("Location sharing needs a secure (https) connection. Please open the CRM over https."));
      return;
    }
    if (!navigator?.geolocation) {
      reject(new Error("This browser can't share location. Try Chrome or Safari on your phone."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          deviceTime: new Date(pos.timestamp).toISOString(),
        }),
      (err) => {
        const messages = {
          1: "Location permission is blocked. Allow location for this site in your browser settings, then try again.",
          2: "Couldn't find your location. Turn on location/GPS on your device and try again.",
          3: "Getting your location took too long. Move to an open area or check your signal, then try again.",
        };
        reject(new Error(messages[err?.code] || "Couldn't get your location. Please try again."));
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 }
    );
  });
}

/** Opens a lat/lng in Google Maps (new tab, on the viewer's own click). */
export const mapUrl = (lat, lng) => `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
