import Anthropic from "npm:@anthropic-ai/sdk"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"
import { corsHeaders } from "../_shared/cors.ts"

const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! })

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
)

// ── Type name mappings ────────────────────────────────────────────────────────

const HEART_TYPE_NAMES: Record<number, string> = {
  1: 'Conviction', 2: 'Devotion', 3: 'Ambition', 4: 'Longing',
  5: 'Wonder', 6: 'Vigilance', 7: 'Anticipation', 8: 'Intensity', 9: 'Serenity',
}

// ── Low-confidence reframes (verbatim, router-time injected, not cached) ─────
// Source: Content Designer 1.1, locked April 2026. Do not paraphrase.

const LOW_CONFIDENCE_REFRAMES: Record<number, string> = {
  1: "People sometimes read this as being naturally principled or conscientious. It's not quite that — it's that you're organized around an internal standard that doesn't switch off, and 'principled' is how the pattern presents itself from inside. The resentment that builds when others don't meet the standard is part of the pattern, not separate from it.",
  2: "People sometimes read this as being naturally warm or generous. It's not that — it's that you're organized around being needed, and the warmth is how you secure the connection you fear losing. The hidden ledger is part of the pattern, not a deviation from it.",
  3: "People sometimes read this as being naturally driven or capable. It's not that — it's that you're organized around visible success as a substitute for a clear sense of self. The capability is real, and the gap underneath is also real.",
  4: "People sometimes read this as being naturally deep or sensitive. It's not that — it's that you're organized around a search for what's authentic, using emotional intensity as evidence. The depth is real; the search can become the avoidance of landing anywhere.",
  5: "People sometimes read this as being naturally analytical or introverted. It's not quite that — it's that you're organized around protecting internal resources from depletion, and the analytical reserve is how the protection runs. The depth of thought is real; the conservation is the pattern.",
  6: "People sometimes read this as being naturally careful, or conversely as being naturally direct. It's not quite either — it's that you're organized around testing whether things can be trusted, which shows up as caution or as confrontation depending on context. Both are the same pattern expressing differently.",
  7: "People sometimes read this as being naturally enthusiastic or open-minded. It's not quite that — it's that you're organized around keeping motion forward so something painful doesn't catch up. The enthusiasm is real; the avoidance it also performs is the pattern.",
  8: "People sometimes read this as being naturally strong or decisive. It's not quite that — it's that you're organized around maintaining control so you're not vulnerable to people who haven't earned your trust. The strength is real; the aversion to softness is the pattern.",
  9: "People sometimes read this as being naturally easygoing or peaceful. It's not that — it's that you're organized around maintaining internal peace by adapting to what's around you before you've checked whether you want to. The peacefulness is real; the preference-avoidance is the pattern.",
}

// ── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a precise, perceptive, clinically-informed analyst writing a paid personality synthesis for the SPARK platform.

Write in second person. Do not mention any frameworks or systems by name. Do not use numbers to reference types.

Your tone is grounded, direct, and insightful — not poetic, not sentimental, not abstract. Do not use metaphors unless they add real clarity. Do not use soft or emotional filler language.

The Heart pattern is primary and must shape the overall tone, pacing, and behavioral tendencies throughout the entire profile. The Head and Hand modify how it expresses but do not override it.

Every sentence must be specific to this exact type combination. If a sentence could apply to many people, remove it and replace it with something more precise.

Prioritize:
- Observable behavior patterns
- Decision-making tendencies
- How this person shows up in relationships and under pressure
- Work style under both strength and friction
- Timing — when they act, when they wait, when they disengage

Avoid:
- Vague emotional language
- Generic personal growth phrasing
- Anything that sounds like a horoscope or inspirational writing
- Metaphors that sound good but cannot be tested against real behavior
- Do not assume leadership, charisma, or influence unless explicitly supported by the combination
- Do not introduce traits not clearly implied by the inputs — if a behavior isn't directly supported by the given types, leave it out

Do not describe internal traits unless they are directly tied to a visible behavior or decision pattern.

Every paragraph must include at least one observable behavior.

The profile must center on one core behavioral pattern that shows up consistently across contexts — not a list of traits.

Name at least one way this pattern causes missed impact or friction — do not soften it.
Whenever possible, link strength and cost directly (e.g., 'this allows X, but leads to Y').

Include at least one sentence describing how others are likely to experience this pattern.

Each paragraph must develop a single clear pattern, not a list of unrelated traits.

The title must be 3-5 words and describe a real behavioral pattern or tension — not abstract or poetic.

Before writing, internally identify what makes this specific combination distinct from similar profiles. Emphasize that difference throughout — do not write what any intelligent person could guess about these types individually.

Target length: 220-300 words. Depth comes from precision, not length.

When the type combination is inherently relational or people-oriented, resist the pull toward warm or affirming language — apply the same behavioral precision you would for any other combination. Relational patterns have costs and blind spots too; name them directly.

If the three results create internal tension or apparent contradiction, name it directly as a feature of the person's complexity — not as a problem to resolve. The tension IS the profile.

Never use these words: uniquely, gifted, rare, special.

Never use the word 'balance' to describe the interaction between results. Name the specific mechanism instead.

Describe what the person actually does in daily life — observable behavior, not abstract traits.

Never use these words in the composite title: architect, navigator, bridge, compass, beacon, anchor, weaver.

Name one specific way two results reinforce each other and one specific way they create friction.`

const heartDescriptions: Record<string, string> = {
  'Conviction': 'Constantly scanning for what is wrong or could be improved. Holds others and themselves to high standards. Tends to over-explain their reasoning to preempt criticism. Suppresses anger by becoming more rigid or critical. Others experience them as principled but sometimes hard to satisfy.',
  'Devotion': 'Reads the needs of others before their own. Gives help to earn connection, not just to be kind. Has difficulty saying no. Becomes indirect or wounded when unappreciated. Others experience them as warm and capable but occasionally smothering.',
  'Ambition': 'Constantly adapting their presentation to fit what will be well-received. Moves fast, keeps things efficient, avoids emotional slowdown. Loses touch with what they actually feel. Others experience them as impressive and energizing but hard to know.',
  'Longing': 'Intensifies experiences by focusing on what is missing. Pulls back when things feel ordinary. Resists being understood too quickly. Creates meaning through contrast and depth. Others experience them as compelling but emotionally unpredictable.',
  'Wonder': 'Prepares extensively before engaging. Withdraws to think before responding. Rations emotional and social energy carefully. Becomes detached when overwhelmed. Others experience them as insightful but hard to reach.',
  'Vigilance': 'Tests loyalty before trusting. Thinks in terms of what could go wrong. Oscillates between certainty and doubt. Becomes reactive when they feel unsupported. Others experience them as reliable and perceptive but anxious or questioning.',
  'Anticipation': 'Reframes pain into possibility. Keeps options open, resists commitment to one path. Starts things enthusiastically and loses energy before completion. Others experience them as fun and generative but scattered or unavailable for hard things.',
  'Intensity': 'Takes up space deliberately. Tests others to see if they can handle directness. Moves against obstacles rather than around them. Has difficulty showing vulnerability. Others experience them as powerful and honest but intimidating or controlling.',
  'Serenity': 'Merges with others\' agendas, sometimes losing their own. Delays asserting preferences to preserve harmony. Holds clear internal opinions they rarely voice early enough. Others experience them as easygoing and steady but hard to read or unexpectedly stubborn.',
}

const headDescriptions: Record<string, string> = {
  'Blueprint': 'Independent, strategic, long-range thinker. Dominant function: introverted intuition. Sees systems and patterns. Values competence and vision.',
  'Vision': 'Insightful, principled, quietly intense. Dominant function: introverted intuition with feeling. Sees meaning and potential in people.',
  'Hypothesis': 'Energetic, idea-driven, debate-loving. Dominant function: extraverted intuition. Generates possibilities and challenges assumptions.',
  'Possibility': 'Warm, imaginative, connection-seeking. Dominant function: extraverted intuition with feeling. Sees potential in people and ideas.',
  'Framework': 'Precise, logical, internally complex. Dominant function: introverted thinking. Builds accurate mental models independently.',
  'Ideal': 'Values-driven, empathetic, deeply authentic. Dominant function: introverted feeling. Leads from personal values and meaning.',
  'Strategy': 'Decisive, efficient, systems-oriented leader. Dominant function: extraverted thinking. Organizes people and resources toward goals.',
  'Narrative': 'People-focused, persuasive, harmony-seeking. Dominant function: extraverted feeling. Moves people through story and vision.',
  'Protocol': 'Reliable, detailed, duty-bound. Dominant function: introverted sensing. Values tradition, process, and proven methods.',
  'Memory': 'Warm, attentive, service-oriented. Dominant function: introverted sensing with feeling. Preserves relationships and cares for others.',
  'Standard': 'Organized, decisive, community-minded. Dominant function: extraverted thinking with sensing. Gets things done through systems.',
  'Consensus': 'Sociable, responsible, harmony-focused. Dominant function: extraverted feeling with sensing. Maintains group cohesion.',
  'Mechanism': 'Observant, pragmatic, hands-on. Dominant function: introverted thinking with sensing. Understands how things actually work.',
  'Impression': 'Gentle, aesthetic, present-focused. Dominant function: introverted feeling with sensing. Lives in sensory beauty and authentic experience.',
  'Opportunity': 'Bold, action-oriented, resourceful. Dominant function: extraverted sensing with thinking. Acts decisively on immediate possibilities.',
  'Moment': 'Enthusiastic, spontaneous, people-energizing. Dominant function: extraverted sensing with feeling. Brings joy and energy to the present.',
}

const handGeniusDescriptions: Record<string, string> = {
  'The Lantern': 'Natural genius of Wonder — asks the questions others have not thought to ask. Energized by pondering possibilities.',
  'The Forge': 'Natural genius of Invention — creates original solutions from scratch. Energized by blank-slate problems.',
  'The Compass': 'Natural genius of Discernment — instinctively knows what will work before others can see it. Energized by evaluating ideas.',
  'The Drum': 'Natural genius of Galvanizing — moves people to action through enthusiasm and rallying. Energized by inspiring others.',
  'The Scaffold': 'Natural genius of Enablement — provides what people need to succeed. Energized by supporting others.',
  'The Anchor': 'Natural genius of Tenacity — pushes through until the work is actually done. Energized by completion.',
}

const handFrustDescriptions: Record<string, string> = {
  'The Lantern': 'Sitting with open questions drains them — they want clarity, not pondering.',
  'The Forge': 'Creating from scratch exhausts them — they prefer building on what exists.',
  'The Compass': 'Gut-checking ideas feels like a burden — they would rather just move forward.',
  'The Drum': 'Rallying others takes everything out of them — motivation feels forced.',
  'The Scaffold': 'Supporting someone else\'s agenda drains them — they need their own direction.',
  'The Anchor': 'Pushing through tedious details is exhausting — they lose steam after the interesting part.',
}

const GENIUS_ID_TO_NAME: Record<string, string> = {
  W: 'The Lantern', I: 'The Forge', D: 'The Compass',
  G: 'The Drum', E: 'The Scaffold', T: 'The Anchor',
}

function idsToNames(ids: string[]): string[] {
  return ids.map(id => GENIUS_ID_TO_NAME[id] || id)
}

// ── Synthesis variant block ───────────────────────────────────────────────────

function buildVariantBlock(
  synthesisVariant: string,
  heartTypeName: string,
  secondaryTypeNumber: number | null,
): string {
  const secondaryName = secondaryTypeNumber ? (HEART_TYPE_NAMES[secondaryTypeNumber] ?? null) : null

  if (synthesisVariant === 'synthesis_high') {
    return `CONFIDENCE NOTE: High confidence read. Do not include a secondary type sentence. Write the profile as a clean, decisive assessment.`
  }

  if (synthesisVariant === 'synthesis_moderate') {
    const blendSentence = secondaryName
      ? `Your results suggest ${heartTypeName} with some characteristics of ${secondaryName}. This is common — most people have overlap between neighboring types.`
      : `Your results suggest a strong ${heartTypeName} pattern with some secondary overlap.`
    return `CONFIDENCE NOTE: Moderate confidence read. Include this exact sentence in the Core Motivation paragraph (append after the generated content): "${blendSentence}"`
  }

  if (synthesisVariant === 'synthesis_low') {
    const typeNumber = Object.entries(HEART_TYPE_NAMES).find(([, name]) => name === heartTypeName)?.[0]
    const reframe = typeNumber ? (LOW_CONFIDENCE_REFRAMES[Number(typeNumber)] ?? '') : ''
    const blendSentence = secondaryName
      ? `Your results suggest ${heartTypeName} with some characteristics of ${secondaryName}. This is common — most people have overlap between neighboring types.`
      : `Your results suggest a ${heartTypeName} pattern, though the read carries uncertainty.`
    return `CONFIDENCE NOTE: Low confidence read. Begin the Core Motivation paragraph with this exact sentence verbatim, before the generated content: "${reframe}" Then, at the end of Core Motivation, include this sentence: "${blendSentence}"`
  }

  return ''
}

// ── User prompt builder ───────────────────────────────────────────────────────

function buildUserPrompt(
  heartType: string, headType: string, handType: string,
  handFrustrationTypes: string[] | null,
  synthesisVariant: string | null,
  secondaryTypeNumber: number | null,
): string {
  const heartMeaning = heartDescriptions[heartType] || heartType
  const headMeaning = headDescriptions[headType] || headType

  const geniusIds = handType ? handType.split('') : []
  const geniusNames = idsToNames(geniusIds)

  const frustNames = handFrustrationTypes ? idsToNames(handFrustrationTypes) : []

  const variantBlock = synthesisVariant ? buildVariantBlock(synthesisVariant, heartType, secondaryTypeNumber) : ''

  return `Write a SPARK composite profile for this specific person. Use ONLY the details provided below — do not import assumptions from other systems.

Heart type: ${heartType}
Heart meaning: ${heartMeaning}

Head type: ${headType}
Head meaning: ${headMeaning}

Hand geniuses: ${geniusNames.join(' and ')}
Hand genius meaning: ${geniusNames.map(n => handGeniusDescriptions[n] || n).join(' | ')}

Hand frustrations: ${frustNames.join(' and ')}
Hand frustration meaning: ${frustNames.map(n => handFrustDescriptions[n] || n).join(' | ')}

${variantBlock ? variantBlock + '\n\n' : ''}Write a composite title on the FIRST LINE: 3-5 words describing a real behavioral pattern or tension — not abstract or poetic.

Then write four sections using EXACTLY these labels on their own line before each section:

HEART:
Write about this person's core motivation and emotional pattern. Name what drives them beneath the surface, how their fear or core need shapes their behavior, and how others experience their emotional baseline. Every sentence must be behaviorally grounded — what they actually do, not what they internally feel. (3-4 sentences)

HEAD:
Write about this person's cognitive style and decision-making pattern. Then specifically address how their Head type interacts with their Heart type — does it amplify it, create tension with it, or redirect it? Name one thing their thinking does well and one way it creates friction or blind spots. (3-4 sentences)

HAND:
Write about when this person is most alive and effective in their work (genius). Then write about what drains them (frustration) and how that drain shows up behaviorally — not just what they dislike but what actually happens when they're stuck in it. Connect the Hand pattern back to the Heart motivation — how does what drives them shape where they work best? (3-4 sentences)

INTERSECTION:
Name one specific way two or more of these three layers reinforce each other — be precise, not generic. Name one specific friction point where these layers work against each other. End with one honest, direct sentence about what growth looks like for this combination — not a platitude. (2-3 sentences)

Total target: 220-280 words across all four sections. Each section must be tight and specific. No filler sentences.`
}

// ── Section parser ────────────────────────────────────────────────────────────

function parseSections(raw: string): { title: string, heart: string, head: string, hand: string, intersection: string } {
  const lines = raw.trim().split("\n")
  const title = lines[0]?.replace(/^#+\s*/, '').trim() || "Your SPARK Synthesis"

  function extractSection(label: string): string {
    const fullText = raw.trim()
    const labelIdx = fullText.search(new RegExp(label + "\\s*:?", "i"))
    if (labelIdx === -1) return ""
    const afterLabel = fullText.slice(labelIdx).replace(new RegExp("^" + label + "\\s*:?\\s*", "i"), "")
    const nextSection = afterLabel.search(/\n\s*(HEART|HEAD|HAND|INTERSECTION)\s*:/i)
    const section = nextSection === -1 ? afterLabel : afterLabel.slice(0, nextSection)
    return section.trim()
  }

  return {
    title,
    heart: extractSection("HEART"),
    head: extractSection("HEAD"),
    hand: extractSection("HAND"),
    intersection: extractSection("INTERSECTION"),
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const {
      userId,
      heartType: directHeart,
      headType: directHead,
      handGeniusTypes: directGeniuses,
      handFrustrationTypes: directFrusts,
      synthesis_variant: directSynthesisVariant,
      heart_secondary: directHeartSecondary,
    } = body
    const isDirectMode = directHeart && directHead && directGeniuses

    let heartType: string
    let headType: string
    let handType: string
    let handFrustrationTypes: string[] | null
    let synthesisVariant: string | null
    let secondaryTypeNumber: number | null = null

    if (isDirectMode) {
      heartType = directHeart
      headType = directHead
      handType = (directGeniuses as string[]).join('')
      handFrustrationTypes = directFrusts || null
      synthesisVariant = directSynthesisVariant ?? 'synthesis_high'
      secondaryTypeNumber = directHeartSecondary ?? null
    } else {
      if (!userId) {
        return new Response(JSON.stringify({ error: "userId or direct type parameters required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select("heart_type, head_type, hand_type, hand_frustration_types, tier")
        .eq("user_id", userId)
        .single()

      if (profileErr || !profile) {
        return new Response(JSON.stringify({ error: "Profile not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      if (profile.tier !== "individual" && profile.tier !== "pro") {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      if (!profile.heart_type || !profile.head_type || !profile.hand_type) {
        return new Response(JSON.stringify({ error: "All three assessments must be completed" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      const heartTypeRaw = profile.heart_type
      const heartTypeNumber = typeof heartTypeRaw === 'number' ? heartTypeRaw : parseInt(heartTypeRaw, 10)
      heartType = HEART_TYPE_NAMES[heartTypeNumber] ?? String(heartTypeRaw)

      headType = profile.head_type
      handType = profile.hand_type
      handFrustrationTypes = profile.hand_frustration_types

      const { data: heartAssessment } = await supabase
        .from("heart_assessments")
        .select("synthesis_variant, two_candidate, final_secondary")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      const rawTwoCandidate = heartAssessment?.two_candidate ?? false
      synthesisVariant = heartAssessment?.synthesis_variant ?? 'synthesis_high'
      secondaryTypeNumber = heartAssessment?.final_secondary ?? null

      if (rawTwoCandidate || synthesisVariant === null) {
        return new Response(JSON.stringify({
          twoCandidate: true,
          error: "Two-candidate result — synthesis is not generated for ambiguous reads.",
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }
    }

    const anthropicMsg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [
        { role: "user", content: buildUserPrompt(heartType, headType, handType, handFrustrationTypes, synthesisVariant, secondaryTypeNumber) },
      ],
    })

    const firstBlock = anthropicMsg.content[0]
    const synthesis = firstBlock.type === "text" ? firstBlock.text.trim() : ""

    if (!synthesis) {
      return new Response(JSON.stringify({ error: "Empty synthesis returned" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const sections = parseSections(synthesis)
    const fullSynthesis = [sections.heart, sections.head, sections.hand, sections.intersection].filter(Boolean).join('\n\n')

    if (!isDirectMode && userId) {
      const { error: updateErr } = await supabase
        .from("profiles")
        .update({
          tier2_title: sections.title,
          tier2_synthesis: fullSynthesis,
          tier2_heart_section: sections.heart,
          tier2_head_section: sections.head,
          tier2_hand_section: sections.hand,
          tier2_intersection_section: sections.intersection,
          generated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)

      if (updateErr) console.error("Profile update error:", updateErr)
    }

    return new Response(JSON.stringify({
      title: sections.title,
      heartSection: sections.heart,
      headSection: sections.head,
      handSection: sections.hand,
      intersectionSection: sections.intersection,
      synthesis: fullSynthesis,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err) {
    console.error("generate-synthesis error:", err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
