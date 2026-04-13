import { createClient } from "@supabase/supabase-js";
import { ActivityCard } from "./components/activity-card";
import { EmailForm } from "./components/email-form";
import { GenerateForm } from "./components/generate-form";
import type { Activity } from "@/lib/types";

async function getTodaysIdea(): Promise<Activity | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  const supabase = createClient(url, key);
  const today = new Date().toISOString().split("T")[0];

  const { data } = await supabase
    .from("daily_ideas")
    .select("idea_json")
    .eq("display_date", today)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return data?.idea_json ?? null;
}

export default async function Home() {
  const todaysIdea = await getTodaysIdea();

  return (
    <div className="flex min-h-full flex-col bg-gray-50">
      {/* Hero */}
      <section className="bg-white px-4 pb-16 pt-20 sm:px-6 sm:pt-28">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-violet-600">
            For parents who hear it daily
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            &ldquo;I&apos;m bored&rdquo; &mdash; solved.
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            Clever, specific play ideas tailored to your kid&apos;s age, energy,
            and what you have around the house. No more &ldquo;go play
            outside.&rdquo;
          </p>
        </div>
      </section>

      {/* Today's Idea */}
      <section className="px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-6 text-center text-2xl font-bold text-gray-900">
            Today&apos;s Activity Idea
          </h2>
          {todaysIdea ? (
            <ActivityCard activity={todaysIdea} />
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
              <p className="text-gray-500">
                Today&apos;s idea is being generated. Try the builder below to
                get a custom activity right now!
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Email Capture */}
      <section className="bg-violet-50 px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mb-2 text-xl font-bold text-gray-900">
            Want a fresh idea in your inbox every morning?
          </h2>
          <p className="mb-6 text-sm text-gray-600">
            Join the waitlist. One clever activity, every day, free.
          </p>
          <EmailForm />
        </div>
      </section>

      {/* Try It */}
      <section className="px-4 py-16 sm:px-6" id="try-it">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900">
              Build Your Own Activity
            </h2>
            <p className="mt-2 text-gray-600">
              Tell us about your kid and we&apos;ll create something perfect.
            </p>
          </div>
          <GenerateForm />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-2xl text-center text-sm text-gray-400">
          <p>
            Built by{" "}
            <a
              href="#"
              className="font-medium text-gray-600 hover:text-gray-900"
            >
              KidPlaySpark
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
