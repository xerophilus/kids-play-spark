"use client";

import type { Activity } from "@/lib/types";

const energyColors = {
  low: "bg-blue-100 text-blue-700",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-rose-100 text-rose-700",
};

const energyLabels = {
  low: "Chill",
  medium: "Active",
  high: "High Energy",
};

export function ActivityCard({ activity }: { activity: Activity }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <h3 className="text-xl font-semibold text-gray-900 sm:text-2xl">
          {activity.name}
        </h3>
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${energyColors[activity.energy_level]}`}
        >
          {energyLabels[activity.energy_level]}
        </span>
      </div>

      <div className="mb-5 flex flex-wrap gap-3 text-sm text-gray-500">
        <span className="inline-flex items-center gap-1">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0" /></svg>
          {activity.age_range}
        </span>
        <span className="inline-flex items-center gap-1">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
          {activity.duration}
        </span>
        <span className="inline-flex items-center gap-1">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955a1.126 1.126 0 0 1 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75" /></svg>
          {activity.setting === "indoor" ? "Indoor" : "Outdoor"}
        </span>
      </div>

      <div className="mb-5">
        <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-400">
          Materials
        </h4>
        <div className="flex flex-wrap gap-2">
          {activity.materials.map((material, i) => (
            <span
              key={i}
              className="rounded-lg bg-gray-100 px-3 py-1 text-sm text-gray-700"
            >
              {material}
            </span>
          ))}
        </div>
      </div>

      <div className="mb-5">
        <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-400">
          Steps
        </h4>
        <ol className="space-y-2">
          {activity.steps.map((step, i) => (
            <li key={i} className="flex gap-3 text-sm text-gray-700">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-semibold text-violet-700">
                {i + 1}
              </span>
              <span className="pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {activity.tips && (
        <div className="rounded-xl bg-amber-50 p-4">
          <p className="text-sm text-amber-800">
            <span className="font-semibold">Parent tip:</span> {activity.tips}
          </p>
        </div>
      )}
    </div>
  );
}
