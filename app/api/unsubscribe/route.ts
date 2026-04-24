import { getServiceClient } from "@/lib/supabase";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const email = url.searchParams.get("email");

  if (!email) {
    return new Response(unsubscribePage("Missing email parameter.", false), {
      status: 400,
      headers: { "Content-Type": "text/html" },
    });
  }

  const decoded = decodeURIComponent(email);

  try {
    const supabase = getServiceClient();
    const { error } = await supabase
      .from("waitlist")
      .update({ unsubscribed: true })
      .eq("email", decoded);

    if (error) throw error;

    return new Response(
      unsubscribePage("You've been unsubscribed. Sorry to see you go!", true),
      { headers: { "Content-Type": "text/html" } }
    );
  } catch (error) {
    console.error("Unsubscribe error:", error);
    return new Response(
      unsubscribePage("Something went wrong. Please try again.", false),
      { status: 500, headers: { "Content-Type": "text/html" } }
    );
  }
}

function unsubscribePage(message: string, success: boolean): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Unsubscribe — KidPlaySpark</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f9fafb; color: #374151; }
    .card { text-align: center; max-width: 400px; padding: 40px; background: white; border-radius: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .icon { font-size: 48px; margin-bottom: 16px; }
    h1 { font-size: 20px; margin: 0 0 8px; }
    p { font-size: 14px; color: #6b7280; margin: 0; }
    a { color: #7c3aed; text-decoration: none; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${success ? "👋" : "⚠️"}</div>
    <h1>${message}</h1>
    <p><a href="https://kidplayspark.com">Back to KidPlaySpark</a></p>
  </div>
</body>
</html>`;
}
