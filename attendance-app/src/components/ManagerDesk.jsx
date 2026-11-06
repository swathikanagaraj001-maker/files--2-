import { useState } from "react";
import {
  useAttendance, setLeaveStatus, resolveAlert, formatTime,
  addOffice, removeOffice, addTask, toggleTask, removeTask, addLeave, resetAllData,
} from "../store/attendanceStore";
import { getCurrentCoords, DEFAULT_RADIUS_KM } from "../utils/geofence";

const card = "rounded-xl border border-blue-800/60 bg-blue-950 p-5 shadow-lg";
const input = "w-full rounded-md border border-blue-800 bg-blue-900/60 px-3 py-2 text-sm text-white placeholder-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500";
const btn = "rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500";
const chip = {
  Pending: "bg-amber-500/20 text-amber-300",
  Completed: "bg-emerald-500/20 text-emerald-300",
  Approved: "bg-emerald-500/20 text-emerald-300",
  Rejected: "bg-red-500/20 text-red-300",
};
const Chip = ({ status }) => (
  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${chip[status] || ""}`}>{status}</span>
);

function OfficeForm() {
  const empty = { name: "", lat: "", lng: "", radiusKm: String(DEFAULT_RADIUS_KM), wifi: "" };
  const [f, setF] = useState(empty);
  const [err, setErr] = useState("");
  const upd = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setErr(""); };

  const useMyLocation = async () => {
    try {
      const { lat, lng } = await getCurrentCoords();
      setF((p) => ({ ...p, lat: lat.toFixed(6), lng: lng.toFixed(6) }));
    } catch (e) { setErr(e.message); }
  };

  const submit = () => {
    const lat = parseFloat(f.lat), lng = parseFloat(f.lng), radiusKm = parseFloat(f.radiusKm);
    if (!f.name.trim()) return setErr("Enter the office name.");
    if (!(lat >= -90 && lat <= 90) || !(lng >= -180 && lng <= 180)) return setErr("Enter valid latitude and longitude.");
    if (!(radiusKm > 0)) return setErr("Radius must be more than 0 km.");
    addOffice({ name: f.name.trim(), lat, lng, radiusKm, wifi: f.wifi.trim() });
    setF(empty);
  };

  return (
    <div className="mt-4 space-y-2 border-t border-blue-800/60 pt-4">
      <p className="text-sm font-medium text-blue-200">Add office</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <input className={input} placeholder="Office name" value={f.name} onChange={upd("name")} />
        <input className={input} placeholder="Wi-Fi name" value={f.wifi} onChange={upd("wifi")} />
        <input className={input} placeholder="Latitude" value={f.lat} onChange={upd("lat")} />
        <input className={input} placeholder="Longitude" value={f.lng} onChange={upd("lng")} />
        <input className={input} placeholder="Radius (km)" value={f.radiusKm} onChange={upd("radiusKm")} />
        <button type="button" onClick={useMyLocation} className="rounded-md bg-blue-900 px-4 py-2 text-sm text-blue-100 hover:bg-blue-800">
          Use my current location
        </button>
      </div>
      {err && <p role="alert" className="text-sm text-red-300">{err}</p>}
      <button type="button" onClick={submit} className={btn}>Add office</button>
    </div>
  );
}

function TaskForm() {
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState("");
  const [err, setErr] = useState("");
  const submit = () => {
    if (!title.trim() || !assignee.trim()) return setErr("Enter a task and an employee name.");
    addTask({ title: title.trim(), assignee: assignee.trim() });
    setTitle(""); setAssignee(""); setErr("");
  };
  return (
    <div className="mt-4 space-y-2 border-t border-blue-800/60 pt-4">
      <p className="text-sm font-medium text-blue-200">Add task</p>
      <input className={input} placeholder="Task title" value={title} onChange={(e) => { setTitle(e.target.value); setErr(""); }} />
      <input className={input} placeholder="Employee name" value={assignee} onChange={(e) => { setAssignee(e.target.value); setErr(""); }} />
      {err && <p role="alert" className="text-sm text-red-300">{err}</p>}
      <button type="button" onClick={submit} className={btn}>Add task</button>
    </div>
  );
}

function LeaveForm() {
  const [f, setF] = useState({ employee: "", from: "", to: "", reason: "" });
  const [err, setErr] = useState("");
  const upd = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setErr(""); };
  const submit = () => {
    if (!f.employee.trim() || !f.from) return setErr("Enter the employee name and start date.");
    if (f.to && f.to < f.from) return setErr("End date can't be before the start date.");
    addLeave({ employee: f.employee.trim(), from: f.from, to: f.to || f.from, reason: f.reason.trim() });
    setF({ employee: "", from: "", to: "", reason: "" });
  };
  return (
    <div className="mt-4 space-y-2 border-t border-blue-800/60 pt-4">
      <p className="text-sm font-medium text-blue-200">Add leave request</p>
      <input className={input} placeholder="Employee name" value={f.employee} onChange={upd("employee")} />
      <div className="grid grid-cols-2 gap-2">
        <input type="date" className={input} value={f.from} onChange={upd("from")} />
        <input type="date" className={input} value={f.to} onChange={upd("to")} />
      </div>
      <input className={input} placeholder="Reason" value={f.reason} onChange={upd("reason")} />
      {err && <p role="alert" className="text-sm text-red-300">{err}</p>}
      <button type="button" onClick={submit} className={btn}>Add request</button>
    </div>
  );
}

export default function ManagerDesk() {
  const { tasks, leaves, offices, adminAlerts } = useAttendance();
  const [filter, setFilter] = useState("All");
  const shownTasks = filter === "All" ? tasks : tasks.filter((t) => t.status === filter);
  const openAlerts = adminAlerts.filter((a) => !a.resolved);

  const reset = () => {
    if (window.confirm("Delete all offices, tasks, leave requests, alerts and attendance records?")) resetAllData();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button type="button" onClick={reset} className="rounded-md border border-red-500/50 px-4 py-2 text-sm text-red-300 hover:bg-red-500/10">
          Reset all data
        </button>
      </div>
      <section className={card} aria-label="Location alerts">
        <h2 className="text-lg font-semibold text-white">Location alerts</h2>
        {openAlerts.length === 0 ? (
          <p className="mt-3 text-sm text-blue-300">No employees are outside their office radius.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {openAlerts.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm">
                <span className="text-red-100">
                  <strong>{a.employee}</strong> is {a.distanceKm.toFixed(2)} km from {a.office} (limit {a.radiusKm.toFixed(1)} km) at {formatTime(a.at)}
                </span>
                <button onClick={() => resolveAlert(a.id)} className="shrink-0 rounded-md bg-blue-800 px-3 py-1 text-white hover:bg-blue-700">Dismiss</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className={card} aria-label="Task review board">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Task review board</h2>
            <div className="flex gap-1" role="tablist">
              {["All", "Pending", "Completed"].map((f) => (
                <button key={f} role="tab" aria-selected={filter === f} onClick={() => setFilter(f)}
                  className={`rounded-md px-3 py-1 text-xs ${filter === f ? "bg-blue-600 text-white" : "bg-blue-900 text-blue-200 hover:bg-blue-800"}`}>
                  {f}
                </button>
              ))}
            </div>
          </div>
          <ul className="mt-4 divide-y divide-blue-800/60">
            {shownTasks.length === 0 && <li className="py-3 text-sm text-blue-300">No tasks yet. Add one below.</li>}
            {shownTasks.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-2 py-3">
                <div>
                  <p className="text-white">{t.title}</p>
                  <p className="text-xs text-blue-400">{t.assignee}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Chip status={t.status} />
                  <button onClick={() => toggleTask(t.id)} className="text-xs text-blue-300 hover:text-white">
                    {t.status === "Pending" ? "Mark done" : "Reopen"}
                  </button>
                  <button onClick={() => removeTask(t.id)} aria-label={`Delete ${t.title}`} className="text-xs text-red-300 hover:text-red-200">Delete</button>
                </div>
              </li>
            ))}
          </ul>
          <TaskForm />
        </section>

        <section className={card} aria-label="Leave approval desk">
          <h2 className="text-lg font-semibold text-white">Leave approval desk</h2>
          <ul className="mt-4 divide-y divide-blue-800/60">
            {leaves.length === 0 && <li className="py-3 text-sm text-blue-300">No leave requests yet.</li>}
            {leaves.map((l) => (
              <li key={l.id} className="py-3">
                <div className="flex items-center justify-between">
                  <p className="text-white">{l.employee}</p>
                  <Chip status={l.status} />
                </div>
                <p className="text-sm text-blue-300">{l.from === l.to ? l.from : `${l.from} to ${l.to}`}{l.reason ? ` · ${l.reason}` : ""}</p>
                {l.status === "Pending" && (
                  <div className="mt-2 flex gap-2">
                    <button onClick={() => setLeaveStatus(l.id, "Approved")} className="rounded-md bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-500">Approve</button>
                    <button onClick={() => setLeaveStatus(l.id, "Rejected")} className="rounded-md bg-red-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-500">Reject</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
          <LeaveForm />
        </section>
      </div>

      <section className={card} aria-label="Office registry">
        <h2 className="text-lg font-semibold text-white">Office registry</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-blue-400">
              <tr>
                <th className="py-2 pr-4 font-medium">Branch</th>
                <th className="py-2 pr-4 font-medium">Wi-Fi</th>
                <th className="py-2 pr-4 font-medium">Allowed radius</th>
                <th className="py-2 font-medium"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="text-white">
              {offices.length === 0 && (
                <tr><td colSpan={4} className="py-3 text-blue-300">No offices yet. Add your first office below.</td></tr>
              )}
              {offices.map((o) => (
                <tr key={o.id} className="border-t border-blue-800/60">
                  <td className="py-2 pr-4">{o.name}</td>
                  <td className="py-2 pr-4">{o.wifi || "—"}</td>
                  <td className="py-2 pr-4">{o.radiusKm.toFixed(1)} km</td>
                  <td className="py-2 text-right">
                    <button onClick={() => removeOffice(o.id)} aria-label={`Delete ${o.name}`} className="text-xs text-red-300 hover:text-red-200">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <OfficeForm />
      </section>
    </div>
  );
}