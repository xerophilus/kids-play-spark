import { createClient } from "@supabase/supabase-js";
import ws from "ws";

// ws is required for Node.js < 22 which lacks native WebSocket support.
// @supabase/realtime-js v2.103.0 calls WebSocketFactory.getWebSocketConstructor()
// in the RealtimeClient constructor, which throws on Node.js < 22.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const realtimeOptions = { transport: ws as any };

export function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { realtime: realtimeOptions }
  );
}

export function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { realtime: realtimeOptions }
  );
}
