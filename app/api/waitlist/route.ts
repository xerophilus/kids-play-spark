import { getServiceClient } from "@/lib/supabase";
import { getPostHogClient } from "@/lib/posthog-server";
import { Resend } from "resend";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

function buildWelcomeHtml(email: string): string {
  const unsubUrl = `https://kidplayspark.com/api/unsubscribe?email=${encodeURIComponent(email)}`;
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:24px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;">
        <!-- Header -->
        <tr><td style="background:#7c3aed;padding:32px 32px 24px;text-align:center;">
          <p style="margin:0;font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#e9d5ff;">Welcome to</p>
          <h1 style="margin:8px 0 0;font-size:26px;font-weight:700;color:#ffffff;line-height:1.3;">KidPlaySpark ✨</h1>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:28px 32px 0;">
          <p style="margin:0 0 16px;font-size:16px;color:#111827;font-weight:600;">You're on the list!</p>
          <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.6;">
            Every day we'll send you a fresh, screen-free play idea for your kids — complete with materials, steps, and a parent tip. No fluff, just real activities that work.
          </p>
          <p style="margin:0 0 24px;font-size:14px;color:#374151;line-height:1.6;">
            In the meantime, try the activity generator to get a custom idea right now.
          </p>
        </td></tr>

        <!-- CTA -->
        <tr><td style="padding:0 32px 28px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center">
              <a href="https://kidplayspark.com/#try-it" style="display:inline-block;background:#7c3aed;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:12px;">Generate a play idea now</a>
            </td></tr>
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:0 32px 24px;text-align:center;border-top:1px solid #f3f4f6;">
          <p style="margin:16px 0 0;font-size:12px;color:#9ca3af;line-height:1.5;">
            You signed up at KidPlaySpark.<br>
            <a href="${unsubUrl}" style="color:#9ca3af;text-decoration:underline;">Unsubscribe</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildWelcomePlainText(email: string): string {
  const unsubUrl = `https://kidplayspark.com/api/unsubscribe?email=${encodeURIComponent(email)}`;
  return `Welcome to KidPlaySpark!

You're on the list. Every day we'll send you a fresh, screen-free play idea for your kids — complete with materials, steps, and a parent tip.

In the meantime, try the activity generator to get a custom idea right now:
https://kidplayspark.com/#try-it

---
Unsubscribe: ${unsubUrl}`;
}

async function sendWelcomeEmail(email: string): Promise<void> {
  const resend = getResend();
  await resend.emails.send({
    from: "KidPlaySpark <hello@mail.kidplayspark.com>",
    to: email,
    subject: "You're on the list! 🎉",
    html: buildWelcomeHtml(email),
    text: buildWelcomePlainText(email),
  });
}

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

    // Fire welcome email — non-blocking so signup response is fast
    sendWelcomeEmail(email).catch((err) =>
      console.error("Welcome email failed:", err)
    );

    return Response.json({ message: "You're in! We'll send you fresh ideas soon." });
  } catch (error) {
    console.error("Waitlist error:", error);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}
