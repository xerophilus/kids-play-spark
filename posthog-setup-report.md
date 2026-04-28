<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into KidPlaySpark. Here's a summary of all changes made:

- **`instrumentation-client.ts`** — Updated to use `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`, switched to the `/ingest` reverse proxy, added `capture_exceptions: true` for error tracking, and set the required `defaults` date.
- **`next.config.ts`** — Added PostHog reverse proxy rewrites (`/ingest/static/*`, `/ingest/array/*`, `/ingest/*`) and `skipTrailingSlashRedirect: true`.
- **`lib/posthog-server.ts`** — Created a singleton `getPostHogClient()` helper for server-side event capture via `posthog-node`.
- **`app/components/email-form.tsx`** — Tracks waitlist signups and identifies users on success; captures exceptions on error.
- **`app/components/generate-form.tsx`** — Tracks activity generation, generation limit events, and wall signups; identifies users on wall signup; captures exceptions.
- **`app/api/waitlist/route.ts`** — Server-side waitlist signup event with user identification.
- **`app/api/generate/route.ts`** — Server-side activity generation event, correlated to the client's distinct ID via `X-POSTHOG-DISTINCT-ID` header.
- **`app/api/unsubscribe/route.ts`** — Captures unsubscribe events as a churn signal.
- **`app/api/generate-daily/route.ts`** — Captures daily idea generation by the cron job.
- **`app/api/send-daily-email/route.ts`** — Captures daily email send metrics (sent, total, failed).
- **`.env.local`** — `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` and `NEXT_PUBLIC_POSTHOG_HOST` set.

## Events

| Event | Description | File |
|-------|-------------|------|
| `waitlist_signup` | User signed up for the waitlist via the hero email form | `app/components/email-form.tsx` |
| `activity_generated` | User successfully generated a custom activity | `app/components/generate-form.tsx` |
| `generation_limit_reached` | User hit the free or signed-up daily generation limit | `app/components/generate-form.tsx` |
| `waitlist_signup_from_wall` | User signed up via the generation limit wall | `app/components/generate-form.tsx` |
| `waitlist_signup_server` | Server-side confirmation of a new waitlist signup | `app/api/waitlist/route.ts` |
| `activity_generated_server` | Server-side activity generation succeeded | `app/api/generate/route.ts` |
| `user_unsubscribed` | User unsubscribed from the daily email | `app/api/unsubscribe/route.ts` |
| `daily_idea_generated` | Cron job generated and stored the daily activity idea | `app/api/generate-daily/route.ts` |
| `daily_emails_sent` | Cron job finished sending the daily email batch | `app/api/send-daily-email/route.ts` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- **Dashboard — Analytics basics:** https://us.posthog.com/project/401744/dashboard/1521644
- **Activity Generation Trend:** https://us.posthog.com/project/401744/insights/uBBWcaaI
- **Waitlist Signup Conversion Funnel:** https://us.posthog.com/project/401744/insights/7WKgIH3E
- **Waitlist Signups Over Time:** https://us.posthog.com/project/401744/insights/XYqzlbKJ
- **Generation Limit Reached by Type:** https://us.posthog.com/project/401744/insights/EeMVRkgK
- **Unsubscribes Over Time:** https://us.posthog.com/project/401744/insights/yu5r8Mkg

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
