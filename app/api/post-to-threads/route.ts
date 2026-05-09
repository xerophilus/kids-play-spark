import { getServiceClient } from "@/lib/supabase";
import type { Activity } from "@/lib/types";

const THREADS_API = "https://graph.threads.net/v1.0";

function buildPostText(activity: Activity): string {
  const hook = activity.steps[0] ?? "";
  const footer = "\n\nCustom ideas → kidplayspark.com";
  const header = `💡 Today's Play Idea: ${activity.name}\n\nAges ${activity.age_range} · ${activity.duration} · ${activity.energy_level}\n\n`;
  const full = header + hook + footer;

  if (full.length <= 500) return full;

  const budget = 500 - header.length - footer.length;
  const truncated = hook.slice(0, budget - 1) + "…";
  return header + truncated + footer;
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = process.env.THREADS_USER_ID;
  const accessToken = process.env.THREADS_ACCESS_TOKEN;
  if (!userId || !accessToken) {
    return Response.json({ error: "Missing Threads credentials" }, { status: 500 });
  }

  const supabase = getServiceClient();
  const today = new Date().toISOString().split("T")[0];

  const { data: ideaRow, error: ideaError } = await supabase
    .from("daily_ideas")
    .select("idea_json")
    .eq("display_date", today)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (ideaError || !ideaRow) {
    return Response.json({ error: "No daily idea found for today" }, { status: 404 });
  }

  const activity: Activity = ideaRow.idea_json;
  const text = buildPostText(activity);

  // Step 1: create container
  const containerUrl = new URL(`${THREADS_API}/${userId}/threads`);
  containerUrl.searchParams.set("media_type", "TEXT");
  containerUrl.searchParams.set("text", text);
  containerUrl.searchParams.set("access_token", accessToken);

  const containerRes = await fetch(containerUrl.toString(), { method: "POST" });
  const containerData = await containerRes.json();

  if (!containerRes.ok || !containerData.id) {
    console.error("Threads container creation failed:", containerData);
    return Response.json({ error: "Failed to create Threads container", details: containerData }, { status: 502 });
  }

  // Step 2: publish container
  const publishUrl = new URL(`${THREADS_API}/${userId}/threads_publish`);
  publishUrl.searchParams.set("creation_id", containerData.id);
  publishUrl.searchParams.set("access_token", accessToken);

  const publishRes = await fetch(publishUrl.toString(), { method: "POST" });
  const publishData = await publishRes.json();

  if (!publishRes.ok || !publishData.id) {
    console.error("Threads publish failed:", publishData);
    return Response.json({ error: "Failed to publish Threads post", details: publishData }, { status: 502 });
  }

  console.log("Threads post published, id:", publishData.id);
  return Response.json({ published_id: publishData.id });
}
