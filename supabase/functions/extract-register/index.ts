import Anthropic from "npm:@anthropic-ai/sdk"
import { corsHeaders } from "../_shared/cors.ts"

// DEV-03: spec says "claude-haiku-4-5" — using full model ID per model registry
const MODEL = "claude-haiku-4-5-20251001"

const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! })

const SYSTEM_PROMPT = `You are a neutral analyst reading short free-text responses from a psychological assessment intake. Extract the qualitative register dimensions below.

Return ONLY valid JSON matching this exact shape — no prose, no markdown:
{
  "affect": {
    "valence": "positive" | "neutral" | "negative",
    "intensity": "flat" | "moderate" | "charged"
  },
  "abstraction": "concrete" | "mixed" | "abstract",
  "agency": "actor" | "mixed" | "acted_upon",
  "closure_cue": "resolved" | "open" | "unclear"
}

Definitions:
- affect.valence: overall emotional tone of the text
- affect.intensity: how emotionally activated the language is
- abstraction: whether the text deals in specific events/people/places (concrete), general ideas (abstract), or both (mixed)
- agency: whether the person presents themselves as acting (actor), being acted upon (acted_upon), or both (mixed)
- closure_cue: whether the situation described feels resolved, unresolved/ongoing (open), or ambiguous (unclear)

Be conservative. When uncertain, prefer neutral/mixed/unclear. Never diagnose or interpret beyond what the text directly supports.`

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { turns } = await req.json() as { turns: Array<{ role: string; text: string }> }

    if (!turns || !Array.isArray(turns) || turns.length === 0) {
      return new Response(
        JSON.stringify({ error: "turns array required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    // Build a single combined text from user turns only
    const userText = turns
      .filter(t => t.role === "user")
      .map(t => t.text)
      .join("\n\n")

    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 256,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Here is the assessment intake text:\n\n${userText}\n\nReturn the JSON.`,
        },
      ],
    })

    const raw = message.content[0].type === "text" ? message.content[0].text : ""

    let qualitative: Record<string, unknown>
    try {
      qualitative = JSON.parse(raw)
    } catch {
      return new Response(
        JSON.stringify({ error: "model returned non-JSON", raw }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    return new Response(
      JSON.stringify({ qualitative, model_version: MODEL }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }
})
