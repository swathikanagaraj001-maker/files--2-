import { useState } from "react";
import OverallMetrics from "./components/OverallMetrics";
import DutyConsole from "./components/DutyConsole";
import LocationCard from "./components/LocationCard";
import ManagerDesk from "./components/ManagerDesk";

export default function App() {
  const [view, setView] = useState("employee");
  return (
    <div className="min-h-screen bg-[#0a1a3a] p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex gap-2">
          {["employee", "manager"].map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-md px-4 py-1.5 text-sm ${view === v ? "bg-blue-600 text-white" : "bg-blue-900 text-blue-200"}`}
            >
              {v === "employee" ? "Employee" : "Manager"}
            </button>
          ))}
        </div>

        {view === "employee" ? (
          <>
            <OverallMetrics />
            <div className="grid gap-6 md:grid-cols-2">
              <DutyConsole />
              <LocationCard />
            </div>
          </>
        ) : (
          <ManagerDesk />
        )}
      </div>
    </div>
  );
}