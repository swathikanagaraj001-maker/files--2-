import { useCallback, useEffect, useRef, useState } from "react";
import { useAttendance, setGeoStatus, notifyAdminOutOfRange } from "../store/attendanceStore";
import { checkGeofence, getCurrentCoords } from "../utils/geofence";

export default function LocationCard() {
  const { offices, geoStatus, activeSession } = useAttendance();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [adminNotified, setAdminNotified] = useState(false);

  const clockedIn = !!activeSession;
  const officesRef = useRef(offices);
  officesRef.current = offices;
  const wasInside = useRef(true);

  // Manual / on-load check
  const verify = useCallback(async () => {
    setLoading(true);
    setError("");
    setAdminNotified(false);
    try {
      const { lat, lng } = await getCurrentCoords();
      const result = checkGeofence(lat, lng, offices);
      if (!result) throw new Error("No office is set up yet. Ask the admin to add one in the Manager desk.");
      setGeoStatus({
        verified: result.verified,
        branch: result.office.name,
        wifi: result.office.wifi,
        distanceKm: result.distanceKm,
        radiusKm: result.radiusKm,
      });
      // Beyond the allowed radius (default 2 km) -> alert the office admin.
      if (!result.verified) {
        notifyAdminOutOfRange({
          office: result.office,
          distanceKm: result.distanceKm,
          radiusKm: result.radiusKm,
        });
        setAdminNotified(true);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [offices]);

  useEffect(() => { verify(); }, [verify]);

  // Live tracking: while clocked in, alert the admin the moment the employee leaves the radius.
  useEffect(() => {
    if (!clockedIn || !("geolocation" in navigator)) return;
    wasInside.current = true;

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const result = checkGeofence(pos.coords.latitude, pos.coords.longitude, officesRef.current);
        if (!result) return;
        setGeoStatus({
          verified: result.verified,
          branch: result.office.name,
          wifi: result.office.wifi,
          distanceKm: result.distanceKm,
          radiusKm: result.radiusKm,
        });
        if (!result.verified && wasInside.current) {
          notifyAdminOutOfRange({
            office: result.office,
            distanceKm: result.distanceKm,
            radiusKm: result.radiusKm,
          });
        }
        wasInside.current = result.verified;
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 10000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [clockedIn]);

  const ok = geoStatus?.verified;

  return (
    <section className="rounded-xl border border-blue-800/60 bg-blue-950 p-6 shadow-lg">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Location check</h2>
        {geoStatus && (
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              ok ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"
            }`}
          >
            {ok ? "Verified" : "Rejected"}
          </span>
        )}
      </div>

      {clockedIn && (
        <p className="mt-2 text-xs text-emerald-300">Live tracking is on while you are clocked in.</p>
      )}

      {loading && <p className="mt-4 text-sm text-blue-300">Checking your location…</p>}
      {error && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}

      {geoStatus && !loading && (
        <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-blue-400">Nearest branch</dt>
            <dd className="text-white">{geoStatus.branch}</dd>
          </div>
          <div>
            <dt className="text-blue-400">Distance</dt>
            <dd className="text-white">{geoStatus.distanceKm.toFixed(2)} km</dd>
          </div>
          <div>
            <dt className="text-blue-400">Office Wi-Fi</dt>
            <dd className="text-white">{geoStatus.wifi || "—"}</dd>
          </div>
          <div>
            <dt className="text-blue-400">Allowed radius</dt>
            <dd className="text-white">{geoStatus.radiusKm.toFixed(1)} km</dd>
          </div>
        </dl>
      )}

      {geoStatus && !ok && !loading && (
        <p role="alert" className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
          You are {geoStatus.distanceKm.toFixed(2)} km from {geoStatus.branch}, beyond the {geoStatus.radiusKm.toFixed(1)} km limit.
          {" The office admin has been alerted."}
        </p>
      )}

      <button
        type="button"
        onClick={verify}
        disabled={loading}
        className="mt-5 w-full rounded-lg bg-blue-600 py-2.5 font-medium text-white hover:bg-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-50"
      >
        Check again
      </button>
    </section>
  );
}