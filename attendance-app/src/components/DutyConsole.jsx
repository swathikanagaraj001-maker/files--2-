import { useAttendance, useNow, clockIn, clockOut, formatHMS, formatTime } from "../store/attendanceStore";

/**
 * Props:
 *  blockWhenOutside (default false) - disable Clock In when the last GPS check was rejected.
 */
export default function DutyConsole({ blockWhenOutside = false }) {
  const state = useAttendance();
  const { activeSession, sessions, geoStatus } = state;
  const onDuty = !!activeSession;
  const now = useNow(onDuty);
  const last = sessions[sessions.length - 1];
  const outside = geoStatus && !geoStatus.verified;
  const blocked = blockWhenOutside && outside && !onDuty;

  return (
    <section className="rounded-xl border border-blue-800/60 bg-blue-950 p-6 shadow-lg">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Shift console</h2>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            onDuty ? "bg-emerald-500/20 text-emerald-300" : "bg-blue-800/50 text-blue-200"
          }`}
        >
          {onDuty ? "On duty" : "Off duty"}
        </span>
      </div>

      <p className="mt-6 text-center font-mono text-5xl tabular-nums text-white" aria-live="off">
        {formatHMS(onDuty ? now - activeSession.start : 0)}
      </p>
      <p className="mt-1 text-center text-xs text-blue-400">Current session</p>

      <button
        type="button"
        onClick={onDuty ? clockOut : clockIn}
        disabled={blocked}
        className={`mt-6 w-full rounded-lg py-3 font-semibold text-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-50 ${
          onDuty ? "bg-red-600 hover:bg-red-500" : "bg-blue-600 hover:bg-blue-500"
        }`}
      >
        {onDuty ? "Clock out" : "Clock in"}
      </button>

      {blocked && (
        <p className="mt-3 text-sm text-red-300">You are outside the allowed office radius. Move closer to clock in.</p>
      )}
      {!blocked && outside && !onDuty && (
        <p className="mt-3 text-sm text-amber-300">Your last location check was outside the office radius.</p>
      )}

      <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-blue-400">Clock-in time</dt>
          <dd className="text-white">{onDuty ? formatTime(activeSession.start) : "—"}</dd>
        </div>
        <div>
          <dt className="text-blue-400">Last clock-out</dt>
          <dd className="text-white">{last ? formatTime(last.end) : "—"}</dd>
        </div>
      </dl>
    </section>
  );
}
