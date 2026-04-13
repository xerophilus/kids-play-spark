"use client";

import { useState } from "react";
import type { Activity } from "@/lib/types";
import { ActivityCard } from "./activity-card";

const AGE_OPTIONS = [
  { value: 2, label: "2 years" },
  { value: 3, label: "3 years" },
  { value: 4, label: "4 years" },
  { value: 5, label: "5 years" },
  { value: 6, label: "6 years" },
  { value: 7, label: "7 years" },
  { value: 8, label: "8 years" },
  { value: 9, label: "9 years" },
  { value: 10, label: "10 years" },
  { value: 11, label: "11 years" },
  { value: 12, label: "12 years" },
];

const TIME_OPTIONS = [
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 45, label: "45 min" },
  { value: 60, label: "60 min" },
];

export function GenerateForm() {
  const [age, setAge] = useState(5);
  const [setting, setSetting] = useState<"indoor" | "outdoor">("indoor");
  const [time, setTime] = useState(30);
  const [energy, setEnergy] = useState<"low" | "medium" | "high">("medium");
  const [materials, setMaterials] = useState("");
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleGenerate() {
    setLoading(true);
    setError("");
    setActivity(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          child_age: age,
          setting,
          time_available: time,
          energy_level: energy,
          materials_on_hand: materials || undefined,
        }),
      });

      if (!res.ok) throw new Error("Failed to generate");

      const data = await res.json();
      setActivity(data);
    } catch {
      setError("Couldn't generate an activity. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="grid gap-5 sm:grid-cols-2">
          {/* Age */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Child&apos;s age
            </label>
            <select
              value={age}
              onChange={(e) => setAge(Number(e.target.value))}
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200"
            >
              {AGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Setting */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Setting
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSetting("indoor")}
                className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${
                  setting === "indoor"
                    ? "border-violet-500 bg-violet-50 text-violet-700"
                    : "border-gray-300 text-gray-600 hover:bg-gray-50"
                }`}
              >
                Indoor
              </button>
              <button
                type="button"
                onClick={() => setSetting("outdoor")}
                className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${
                  setting === "outdoor"
                    ? "border-violet-500 bg-violet-50 text-violet-700"
                    : "border-gray-300 text-gray-600 hover:bg-gray-50"
                }`}
              >
                Outdoor
              </button>
            </div>
          </div>

          {/* Time */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Time available
            </label>
            <div className="flex gap-2">
              {TIME_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTime(opt.value)}
                  className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                    time === opt.value
                      ? "border-violet-500 bg-violet-50 text-violet-700"
                      : "border-gray-300 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Energy */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Energy level
            </label>
            <div className="flex gap-2">
              {(["low", "medium", "high"] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setEnergy(level)}
                  className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium capitalize transition-colors ${
                    energy === level
                      ? "border-violet-500 bg-violet-50 text-violet-700"
                      : "border-gray-300 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Materials */}
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Materials on hand{" "}
              <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <input
              type="text"
              value={materials}
              onChange={(e) => setMaterials(e.target.value)}
              placeholder="e.g., cardboard boxes, paint, string, paper towel tubes..."
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200"
            />
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="mt-6 w-full rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-700 disabled:opacity-50"
        >
          {loading ? "Generating..." : "Generate Activity"}
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" />
            <p className="text-sm text-gray-500">
              Cooking up something fun...
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-red-50 p-4 text-center text-sm text-red-600">
          {error}
        </div>
      )}

      {activity && <ActivityCard activity={activity} />}
    </div>
  );
}
