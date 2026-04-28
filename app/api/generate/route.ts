import Anthropic from "@anthropic-ai/sdk";
import type { GenerateRequest } from "@/lib/types";
import { getPostHogClient } from "@/lib/posthog-server";

const anthropic = new Anthropic();

const SYSTEM_PROMPT = `You are a children's activity designer who creates genuinely creative, specific, and practical play ideas for kids. You specialize in activities that make parents think "oh, that's clever!"

Your activities must be:
- SPECIFIC: Not "play with blocks" but "Build a block tower, then design a paper airplane runway from cardboard and see which planes knock it down from different distances"
- SURPRISING: Combine unexpected elements. Use household items in creative ways. Make the mundane magical.
- PRACTICAL: Only use materials commonly found at home. No specialty supplies.
- EDUCATIONAL (sneakily): Embed learning without making it feel like school. Physics through marble runs, math through baking ratios, storytelling through puppet shows.
- ENGAGING: Activities should have a clear goal, element of discovery, or satisfying result. Kids should WANT to do them.

Examples of the quality bar:
- "Kitchen Science Lab: Mix baking soda volcanos? Too basic. Instead: fill ice cube trays with water + different food colorings, freeze them, then put the colored ice cubes in a baking dish of warm water with a drop of dish soap and watch the colors swirl and mix as they melt — predict which color combinations emerge first"
- "Tape Town: Use painter's tape to create roads on the floor, but add a twist — build cardboard 'buildings' with doors that open, create a working 'car wash' from a shoebox with strips of felt hanging down, and make paper money for a toll booth"
- "Shadow Theater: Hang a white sheet, set up a lamp behind it, and create shadow puppets — but not hand shadows. Cut characters from cardboard, tape them to chopsticks, and perform a retelling of the kid's favorite story with sound effects from pots and spoons"

You MUST respond with valid JSON only, no markdown formatting, no code fences. Return exactly this structure:
{
  "name": "Activity name — catchy and descriptive",
  "age_range": "e.g., 3-5 years",
  "duration": "e.g., 30-45 minutes",
  "setting": "indoor or outdoor",
  "energy_level": "low, medium, or high",
  "materials": ["list", "of", "specific", "materials"],
  "steps": ["Step 1: Clear instruction", "Step 2: Next step", "..."],
  "tips": "A helpful tip for the parent — what to watch for, how to extend the activity, or how to adapt for different ages"
}`;

export async function POST(request: Request) {
  const distinctId = request.headers.get("X-POSTHOG-DISTINCT-ID") || "anonymous";

  try {
    const body: GenerateRequest = await request.json();
    const { child_age, setting, time_available, energy_level, materials_on_hand } = body;

    const userPrompt = `Create a ${setting} activity for a ${child_age}-year-old child.
Time available: ${time_available} minutes.
Energy level: ${energy_level}.
${materials_on_hand ? `Materials the parent has on hand: ${materials_on_hand}` : "Use only common household items."}

Remember: be SPECIFIC and CREATIVE. No generic suggestions. This should make a parent think "oh that's clever, my kid would love that."`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
      system: SYSTEM_PROMPT,
    });

    const textBlock = message.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return Response.json({ error: "No response generated" }, { status: 500 });
    }

    const activity = JSON.parse(textBlock.text);

    const posthog = getPostHogClient();
    posthog.capture({
      distinctId,
      event: "activity_generated_server",
      properties: {
        child_age,
        setting,
        time_available,
        energy_level,
        has_materials: !!materials_on_hand,
        activity_name: activity.name,
      },
    });

    return Response.json(activity);
  } catch (error) {
    console.error("Generation error:", error);
    return Response.json(
      { error: "Failed to generate activity" },
      { status: 500 }
    );
  }
}
