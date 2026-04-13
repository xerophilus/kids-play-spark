import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const anthropic = new Anthropic();

const SYSTEM_PROMPT = `You are a children's activity designer who creates genuinely creative, specific, and practical play ideas for kids. You specialize in activities that make parents think "oh, that's clever!"

Your activities must be:
- SPECIFIC: Not "play with blocks" but "Build a block tower, then design a paper airplane runway from cardboard and see which planes knock it down from different distances"
- SURPRISING: Combine unexpected elements. Use household items in creative ways.
- PRACTICAL: Only use materials commonly found at home.
- EDUCATIONAL (sneakily): Embed learning without making it feel like school.
- ENGAGING: Activities should have a clear goal, element of discovery, or satisfying result.

You MUST respond with valid JSON only, no markdown formatting, no code fences. Return exactly this structure:
{
  "name": "Activity name — catchy and descriptive",
  "age_range": "e.g., 3-5 years",
  "duration": "e.g., 30-45 minutes",
  "setting": "indoor or outdoor",
  "energy_level": "low, medium, or high",
  "materials": ["list", "of", "specific", "materials"],
  "steps": ["Step 1: Clear instruction", "Step 2: Next step", "..."],
  "tips": "A helpful tip for the parent"
}`;

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase environment variables");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const ages = [3, 4, 5, 6, 7, 8];
  const settings = ["indoor", "outdoor"] as const;
  const energies = ["low", "medium", "high"] as const;

  const age = ages[Math.floor(Math.random() * ages.length)];
  const setting = settings[Math.floor(Math.random() * settings.length)];
  const energy = energies[Math.floor(Math.random() * energies.length)];
  const time = [30, 45, 60][Math.floor(Math.random() * 3)];

  console.log(`Generating: age=${age}, setting=${setting}, energy=${energy}, time=${time}min`);

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Create a ${setting} activity for a ${age}-year-old child. Time available: ${time} minutes. Energy level: ${energy}. Use only common household items. Be SPECIFIC and CREATIVE.`,
      },
    ],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    console.error("No text response from Claude");
    process.exit(1);
  }

  const activity = JSON.parse(textBlock.text);
  console.log(`Generated: ${activity.name}`);

  const today = new Date().toISOString().split("T")[0];

  const { error } = await supabase.from("daily_ideas").insert({
    idea_json: activity,
    display_date: today,
  });

  if (error) {
    console.error("Failed to save to Supabase:", error);
    process.exit(1);
  }

  console.log(`Saved daily idea for ${today}`);
}

main();
