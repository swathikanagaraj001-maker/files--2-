import { useAttendance, useNow, todayMs, monthMs, workingDays, formatHMS, formatHM } from "../store/attendanceStore";

function MetricCard({ label, value, hint, mono }) {
  return (
    <div className="rounded-xl border border-blue-800/60 bg-blue-950 p-5 shadow-lg">
      <p className="text-sm text-blue-300">{label}</p>
      <p className={`mt-2 text-3xl font-semibold text-white ${mono ? "font-mono tabular-nums" : ""}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-blue-400">{hint}</p>}
    </div>
  );
}

export default function OverallMetrics() {
  const state = useAttendance();
  const running = !!state.activeSession;
  const now = useNow(running);

  return (
    <section aria-label="Overall metrics" className="grid gap-4 sm:grid-cols-3">
      <MetricCard
        label="Today's working hours"
        value={formatHMS(todayMs(state, now))}
        hint={running ? "Timer running" : "Clocked out"}
        mono
      />
      <MetricCard label="Overall working hours" value={formatHM(monthMs(state, now))} hint="This month" />
      <MetricCard label="Overall working days" value={workingDays(state, now)} hint="Days attended this month" />
    </section>
  );
}
