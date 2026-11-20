import API from "./api";

/**
 * Client meeting check-ins with live location.
 * Sales person: checkIn / checkOut / getMyVisits. Super admin: getAllVisits.
 */
export const checkInClientVisit = (payload) => API.post("/client-visits/check-in", payload);

export const checkOutClientVisit = (visitId, payload) => API.put(`/client-visits/${visitId}/check-out`, payload);

export const getMyClientVisits = (limit = 50) => API.get("/client-visits/mine", { params: { limit } });

export const getAllClientVisits = (params) => API.get("/client-visits", { params });

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
