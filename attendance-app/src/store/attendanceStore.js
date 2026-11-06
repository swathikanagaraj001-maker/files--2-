// Tiny shared store (no extra dependencies) so the four components stay in sync.
// Persists to localStorage. Swap the actions for API calls when the backend is ready.
import { useEffect, useState, useSyncExternalStore } from "react";
import { DEFAULT_RADIUS_KM } from "../utils/geofence";

const KEY = "attendance-state-v2";

const defaults = {
  currentUser: { id: "emp-001", name: "Employee" },
  activeSession: null, // { start: epochMs }
  sessions: [], // { start, end, durationMs }
  geoStatus: null, // last geofence result
  adminAlerts: [], // { id, employee, office, distanceKm, radiusKm, at, resolved }
  offices: [], // added by the admin in Manager desk
  tasks: [],
  leaves: [],
};

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...defaults, ...JSON.parse(raw) };
  } catch {}
  return defaults;
}

let state = load();
const listeners = new Set();

function set(patch) {
  state = { ...state, ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
  listeners.forEach((l) => l());
}

const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l); };
const getState = () => state;
export const useAttendance = () => useSyncExternalStore(subscribe, getState);

/* ---------- actions ---------- */

export function clockIn() {
  if (state.activeSession) return;
  set({ activeSession: { start: Date.now() } });
}

export function clockOut() {
  const s = state.activeSession;
  if (!s) return;
  const end = Date.now();
  set({
    activeSession: null,
    sessions: [...state.sessions, { start: s.start, end, durationMs: end - s.start }],
  });
}

export function setGeoStatus(result) {
  set({ geoStatus: { ...result, checkedAt: Date.now() } });
}

/** Sends an out-of-range alert to the admin desk (de-duplicated within 5 minutes). */
export function notifyAdminOutOfRange({ office, distanceKm, radiusKm }) {
  const now = Date.now();
  const recent = state.adminAlerts.find(
    (a) => a.employee === state.currentUser.name && a.office === office.name && now - a.at < 5 * 60 * 1000
  );
  if (recent) return false;
  const alert = {
    id: `a${now}`,
    employee: state.currentUser.name,
    office: office.name,
    distanceKm,
    radiusKm,
    at: now,
    resolved: false,
  };
  set({ adminAlerts: [alert, ...state.adminAlerts] });
  return true;
}

export const resolveAlert = (id) =>
  set({ adminAlerts: state.adminAlerts.map((a) => (a.id === id ? { ...a, resolved: true } : a)) });

export const setLeaveStatus = (id, status) =>
  set({ leaves: state.leaves.map((l) => (l.id === id ? { ...l, status } : l)) });

const uid = (p) => `${p}${Date.now()}${Math.floor(Math.random() * 1000)}`;

export const addOffice = ({ name, lat, lng, radiusKm, wifi }) =>
  set({ offices: [...state.offices, { id: uid("o"), name, lat, lng, radiusKm: radiusKm || DEFAULT_RADIUS_KM, wifi }] });
export const removeOffice = (id) => set({ offices: state.offices.filter((o) => o.id !== id) });

export const addTask = ({ title, assignee }) =>
  set({ tasks: [...state.tasks, { id: uid("t"), title, assignee, status: "Pending" }] });
export const toggleTask = (id) =>
  set({ tasks: state.tasks.map((t) => (t.id === id ? { ...t, status: t.status === "Pending" ? "Completed" : "Pending" } : t)) });
export const removeTask = (id) => set({ tasks: state.tasks.filter((t) => t.id !== id) });

export const addLeave = ({ employee, from, to, reason }) =>
  set({ leaves: [...state.leaves, { id: uid("l"), employee, from, to, reason, status: "Pending" }] });

export function resetAllData() {
  state = { ...defaults, offices: [], tasks: [], leaves: [], sessions: [], adminAlerts: [], activeSession: null, geoStatus: null };
  try { localStorage.removeItem(KEY); } catch {}
  listeners.forEach((l) => l());
}

export const setCurrentUser = (name) => set({ currentUser: { ...state.currentUser, name } });

/* ---------- selectors & helpers ---------- */

const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();
const sameMonth = (a, b) => {
  const x = new Date(a), y = new Date(b);
  return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth();
};

export function todayMs(s, now) {
  const done = s.sessions.filter((x) => sameDay(x.start, now)).reduce((t, x) => t + x.durationMs, 0);
  const live = s.activeSession ? now - s.activeSession.start : 0;
  return done + live;
}

export function monthMs(s, now) {
  const done = s.sessions.filter((x) => sameMonth(x.start, now)).reduce((t, x) => t + x.durationMs, 0);
  const live = s.activeSession && sameMonth(s.activeSession.start, now) ? now - s.activeSession.start : 0;
  return done + live;
}

/** Distinct calendar days with a completed shift this month. */
export function workingDays(s, now) {
  return new Set(s.sessions.filter((x) => sameMonth(x.start, now)).map((x) => new Date(x.start).toDateString())).size;
}

/** Re-renders every second while `active` is true. */
export function useNow(active) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    setNow(Date.now());
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);
  return now;
}

const pad = (n) => String(n).padStart(2, "0");
export function formatHMS(ms) {
  const t = Math.max(0, Math.floor(ms / 1000));
  return `${pad(Math.floor(t / 3600))}:${pad(Math.floor((t % 3600) / 60))}:${pad(t % 60)}`;
}
export function formatHM(ms) {
  const m = Math.floor(Math.max(0, ms) / 60000);
  return `${Math.floor(m / 60)}h ${pad(m % 60)}m`;
}
export const formatTime = (ms) => new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });