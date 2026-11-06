// GPS geofencing helpers: Haversine distance + office radius check.

export const DEFAULT_RADIUS_KM = 2.0;
const EARTH_RADIUS_KM = 6371;

const toRad = (deg) => (deg * Math.PI) / 180;

/** Great-circle distance between two lat/lng points, in kilometres. */
export function haversineKm(lat1, lng1, lat2, lng2) {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * Compare a position against every authorised office.
 * Returns the nearest office, the measured distance and whether it is
 * inside that office's allowed radius (default 2.0 km).
 */
export function checkGeofence(lat, lng, offices) {
  if (!offices?.length) return null;
  let nearest = null;
  for (const office of offices) {
    const distanceKm = haversineKm(lat, lng, office.lat, office.lng);
    if (!nearest || distanceKm < nearest.distanceKm) nearest = { office, distanceKm };
  }
  const radiusKm = nearest.office.radiusKm ?? DEFAULT_RADIUS_KM;
  return {
    office: nearest.office,
    distanceKm: nearest.distanceKm,
    radiusKm,
    verified: nearest.distanceKm <= radiusKm,
  };
}

/** Promise wrapper around navigator.geolocation.getCurrentPosition. */
export function getCurrentCoords() {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("This browser does not support location access."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        const messages = {
          1: "Location permission was denied. Allow location access and try again.",
          2: "Your location could not be determined. Check GPS or network.",
          3: "Location request timed out. Try again.",
        };
        reject(new Error(messages[err.code] || "Could not read your location."));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}
