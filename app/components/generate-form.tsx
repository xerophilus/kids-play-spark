"use client";

import { useState, useEffect, useCallback } from "react";
import posthog from "posthog-js";
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

const LS_KEY_COUNT = "kps_gen_count";
const LS_KEY_DATE = "kps_gen_date";
const LS_KEY_SIGNED_UP = "kps_signed_up";

const FREE_LIMIT = 3;
const SIGNED_UP_LIMIT = 5;

function getTodayStr() {
  return new Date().toISOString().split("T")[0];
}

function getGenerationState(): { count: number; signedUp: boolean } {
  const signedUp = localStorage.getItem(LS_KEY_SIGNED_UP) === "true";
  const storedDate = localStorage.getItem(LS_KEY_DATE);
  const today = getTodayStr();

  // Reset count if it's a new day (only matters for signed-up users)
  if (storedDate !== today && signedUp) {
    localStorage.setItem(LS_KEY_COUNT, "0");
    localStorage.setItem(LS_KEY_DATE, today);
    return { count: 0, signedUp };
  }

  const count = parseInt(localStorage.getItem(LS_KEY_COUNT) || "0", 10);
  return { count, signedUp };
}

function incrementCount() {
  const current = parseInt(localStorage.getItem(LS_KEY_COUNT) || "0", 10);
  localStorage.setItem(LS_KEY_COUNT, String(current + 1));
  localStorage.setItem(LS_KEY_DATE, getTodayStr());
}

function markSignedUp() {
  localStorage.setItem(LS_KEY_SIGNED_UP, "true");
  localStorage.setItem(LS_KEY_COUNT, "0");
  localStorage.setItem(LS_KEY_DATE, getTodayStr());
}

export function GenerateForm() {
  const [age, setAge] = useState(5);
  const [setting, setSetting] = useState<"indoor" | "outdoor">("indoor");
  const [time, setTime] = useState(30);
  const [energy, setEnergy] = useState<"low" | "medium" | "high">("medium");
  const [materials, setMaterials] = useState("");
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [genCount, setGenCount] = useState(0);
  const [signedUp, setSignedUp] = useState(false);
  const [showWall, setShowWall] = useState(false);
  const [wallEmail, setWallEmail] = useState("");
  const [wallStatus, setWallStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [wallMessage, setWallMessage] = useState("");
  const [mounted, setMounted] = useState(false);

  const refreshState = useCallback(() => {
    const state = getGenerationState();
    setGenCount(state.count);
    setSignedUp(state.signedUp);
  }, []);

  useEffect(() => {
    refreshState();
    setMounted(true);
  }, [refreshState]);

  const limit = signedUp ? SIGNED_UP_LIMIT : FREE_LIMIT;
  const remaining = Math.max(0, limit - genCount);
  const atLimit = genCount >= limit;

  async function handleGenerate() {
    // Check limit before generating
    const state = getGenerationState();
    const currentLimit = state.signedUp ? SIGNED_UP_LIMIT : FREE_LIMIT;

    if (state.count >= currentLimit) {
      if (!state.signedUp) {
        setShowWall(true);
        posthog.capture("generation_limit_reached", {
          limit_type: "free",
          limit: FREE_LIMIT,
        });
      } else {
        posthog.capture("generation_limit_reached", {
          limit_type: "signed_up",
          limit: SIGNED_UP_LIMIT,
        });
      }
      refreshState();
      return;
    }

    setLoading(true);
    setError("");
    setActivity(null);
    setShowWall(false);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-POSTHOG-DISTINCT-ID": posthog.get_distinct_id() ?? "",
        },
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
      incrementCount();
      refreshState();

      posthog.capture("activity_generated", {
        child_age: age,
        setting,
        time_available: time,
        energy_level: energy,
        has_materials: !!materials,
        activity_name: data.name,
      });

      // Show wall instead of result if they just hit the free limit
      const newState = getGenerationState();
      if (!newState.signedUp && newState.count >= FREE_LIMIT) {
        setActivity(data);
      } else {
        setActivity(data);
      }
    } catch (err) {
      posthog.captureException(err);
      setError("Couldn't generate an activity. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleWallSubmit(e: React.FormEvent) {
    e.preventDefault();
    setWallStatus("loading");
    setWallMessage("");

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: wallEmail }),
      });
      const data = await res.json();

      if (!res.ok) {
        setWallStatus("error");
        setWallMessage(data.error || "Something went wrong");
        return;
      }

      posthog.identify(wallEmail, { email: wallEmail });
      posthog.capture("waitlist_signup_from_wall", { source: "generation_wall" });

      markSignedUp();
      refreshState();
      setWallStatus("success");
      setWallMessage("You're in! You now get 5 ideas per day.");
      setShowWall(false);
      setWallEmail("");
    } catch (err) {
      posthog.captureException(err);
      setWallStatus("error");
      setWallMessage("Something went wrong. Please try again.");
    }
  }

  const counterLabel = mounted
    ? signedUp
      ? `${remaining} of ${SIGNED_UP_LIMIT} daily ideas left`
      : `${remaining} of ${FREE_LIMIT} free ideas left`
    : null;

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
          disabled={loading || (atLimit && signedUp)}
          className="mt-6 w-full rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-700 disabled:opacity-50"
        >
          {loading
            ? "Generating..."
            : atLimit && signedUp
              ? "No ideas left today"
              : "Generate Activity"}
        </button>

        {mounted && counterLabel && (
          <p className="mt-2 text-center text-xs text-gray-400">
            {counterLabel}
          </p>
        )}
      </div>

      {/* Email signup wall — shown when free user hits limit */}
      {showWall && !signedUp && (
        <div className="rounded-2xl border-2 border-violet-200 bg-violet-50 p-6 text-center sm:p-8">
          <h3 className="mb-2 text-lg font-bold text-gray-900">
            You&apos;ve used your {FREE_LIMIT} free ideas
          </h3>
          <p className="mb-5 text-sm text-gray-600">
            Drop your email to unlock {SIGNED_UP_LIMIT} more per day.
          </p>
          <form onSubmit={handleWallSubmit} className="mx-auto flex max-w-md gap-2">
            <input
              type="email"
              value={wallEmail}
              onChange={(e) => setWallEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200"
            />
            <button
              type="submit"
              disabled={wallStatus === "loading"}
              className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-700 disabled:opacity-50"
            >
              {wallStatus === "loading" ? "..." : "Unlock"}
            </button>
          </form>
          {wallMessage && (
            <p
              className={`mt-2 text-sm ${
                wallStatus === "error" ? "text-red-600" : "text-green-600"
              }`}
            >
              {wallMessage}
            </p>
          )}
        </div>
      )}

      {/* Daily limit message for signed-up users */}
      {atLimit && signedUp && mounted && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center sm:p-8">
          <p className="mb-2 text-sm text-gray-600">
            You&apos;ve used today&apos;s ideas. Come back tomorrow — or go
            unlimited for $4.99/mo.
          </p>
          <p className="text-xs text-gray-400">Unlimited plan coming soon.</p>
        </div>
      )}

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
