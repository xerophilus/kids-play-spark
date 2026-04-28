import { getServiceClient } from "@/lib/supabase";
import { getPostHogClient } from "@/lib/posthog-server";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ error: "Valid email required" }, { status: 400 });
    }

    const supabase = getServiceClient();
    const { error } = await supabase.from("waitlist").insert({ email });

    if (error) {
      if (error.code === "23505") {
        return Response.json({ message: "You're already on the list!" });
      }
      throw error;
    }

    const posthog = getPostHogClient();
    posthog.identify({ distinctId: email });
    posthog.capture({ distinctId: email, event: "waitlist_signup_server", properties: { source: "api" } });

    return Response.json({ message: "You're in! We'll send you fresh ideas soon." });
  } catch (error) {
    console.error("Waitlist error:", error);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}
