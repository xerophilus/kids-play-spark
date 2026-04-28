import { getServiceClient } from "@/lib/supabase";
import { Resend } from "resend";
import type { Activity } from "@/lib/types";
import { getPostHogClient } from "@/lib/posthog-server";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

function buildEmailHtml(activity: Activity): string {
  const materialsHtml = activity.materials
    .map((m) => `<li style="margin-bottom:4px;">${m}</li>`)
    .join("");

  const stepsHtml = activity.steps
    .map(
      (s, i) =>
        `<tr>
          <td style="vertical-align:top;padding-right:12px;padding-bottom:8px;">
            <div style="width:24px;height:24px;border-radius:50%;background:#ede9fe;color:#6d28d9;font-size:12px;font-weight:600;text-align:center;line-height:24px;">${i + 1}</div>
          </td>
          <td style="vertical-align:top;padding-bottom:8px;font-size:14px;color:#374151;line-height:1.5;">${s}</td>
        </tr>`
    )
    .join("");

  const energyLabel =
    activity.energy_level === "low"
      ? "Chill"
      : activity.energy_level === "medium"
        ? "Active"
        : "High Energy";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:24px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;">
        <!-- Header -->
        <tr><td style="background:#7c3aed;padding:24px 32px;text-align:center;">
          <p style="margin:0;font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#e9d5ff;">Today's Play Idea</p>
          <h1 style="margin:8px 0 0;font-size:22px;font-weight:700;color:#ffffff;line-height:1.3;">${activity.name}</h1>
        </td></tr>

        <!-- Meta -->
        <tr><td style="padding:20px 32px 0;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size:13px;color:#6b7280;">Ages: ${activity.age_range}</td>
              <td style="font-size:13px;color:#6b7280;text-align:center;">${activity.duration}</td>
              <td style="font-size:13px;color:#6b7280;text-align:right;">${energyLabel} · ${activity.setting === "indoor" ? "Indoor" : "Outdoor"}</td>
            </tr>
          </table>
        </td></tr>

        <!-- Materials -->
        <tr><td style="padding:20px 32px 0;">
          <p style="margin:0 0 8px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;">Materials</p>
          <ul style="margin:0;padding-left:20px;font-size:14px;color:#374151;line-height:1.6;">
            ${materialsHtml}
          </ul>
        </td></tr>

        <!-- Steps -->
        <tr><td style="padding:20px 32px 0;">
          <p style="margin:0 0 12px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;">Steps</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            ${stepsHtml}
          </table>
        </td></tr>

        <!-- Tip -->
        ${
          activity.tips
            ? `<tr><td style="padding:20px 32px 0;">
          <div style="background:#fffbeb;border-radius:12px;padding:14px 18px;">
            <p style="margin:0;font-size:13px;color:#92400e;line-height:1.5;"><strong>Parent tip:</strong> ${activity.tips}</p>
          </div>
        </td></tr>`
            : ""
        }

        <!-- CTA -->
        <tr><td style="padding:28px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center">
              <a href="https://kidplayspark.com/#try-it" style="display:inline-block;background:#7c3aed;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:12px;">Want a custom idea? Try the generator</a>
            </td></tr>
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:0 32px 24px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.5;">
            You're getting this because you signed up at KidPlaySpark.<br>
            <a href="https://kidplayspark.com/api/unsubscribe?email={{EMAIL}}" style="color:#9ca3af;text-decoration:underline;">Unsubscribe</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildPlainText(activity: Activity): string {
  const materials = activity.materials.map((m) => `  - ${m}`).join("\n");
  const steps = activity.steps.map((s, i) => `  ${i + 1}. ${s}`).join("\n");

  return `TODAY'S PLAY IDEA: ${activity.name}

Ages: ${activity.age_range} | ${activity.duration} | ${activity.setting === "indoor" ? "Indoor" : "Outdoor"}

MATERIALS:
${materials}

STEPS:
${steps}

${activity.tips ? `PARENT TIP: ${activity.tips}\n` : ""}
---
Want a custom idea? Try the generator: https://kidplayspark.com/#try-it

Unsubscribe: https://kidplayspark.com/api/unsubscribe?email={{EMAIL}}`;
}

export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = getServiceClient();

    // Get today's idea
    const today = new Date().toISOString().split("T")[0];
    const { data: ideaRow, error: ideaError } = await supabase
      .from("daily_ideas")
      .select("idea_json")
      .eq("display_date", today)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (ideaError || !ideaRow) {
      return Response.json(
        { error: "No daily idea found for today" },
        { status: 404 }
      );
    }

    const activity: Activity = ideaRow.idea_json;

    // Get all subscribed emails
    const { data: subscribers, error: subError } = await supabase
      .from("waitlist")
      .select("email")
      .eq("unsubscribed", false);

    if (subError) {
      throw subError;
    }

    if (!subscribers || subscribers.length === 0) {
      return Response.json({ message: "No subscribers to email", sent: 0 });
    }

    const emailClient = getResend();
    const htmlTemplate = buildEmailHtml(activity);
    const textTemplate = buildPlainText(activity);

    let sent = 0;
    const errors: string[] = [];

    for (const subscriber of subscribers) {
      const html = htmlTemplate.replace(/\{\{EMAIL\}\}/g, encodeURIComponent(subscriber.email));
      const text = textTemplate.replace(/\{\{EMAIL\}\}/g, encodeURIComponent(subscriber.email));

      try {
        await emailClient.emails.send({
          from: "KidPlaySpark <hello@mail.kidplayspark.com>",
          to: subscriber.email,
          subject: `Today's Play Idea: ${activity.name}`,
          html,
          text,
        });
        sent++;
      } catch (err) {
        errors.push(`${subscriber.email}: ${err instanceof Error ? err.message : "unknown error"}`);
      }
    }

    const posthog = getPostHogClient();
    posthog.capture({
      distinctId: "cron",
      event: "daily_emails_sent",
      properties: {
        sent,
        total: subscribers.length,
        failed: errors.length,
        activity_name: activity.name,
        date: today,
      },
    });

    return Response.json({
      message: `Sent ${sent} of ${subscribers.length} emails`,
      sent,
      total: subscribers.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Daily email error:", error);
    return Response.json(
      { error: "Failed to send daily emails" },
      { status: 500 }
    );
  }
}
