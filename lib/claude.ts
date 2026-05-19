import Anthropic from '@anthropic-ai/sdk'
import type { ScriptSegment } from './types'
import { WORDS_PER_CHUNK, splitIntoChunks } from './chunks'

export { splitIntoChunks } from './chunks'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  maxRetries: 3,
})

const SYSTEM_PROMPT = `You are a video research assistant. Your job is to analyze a video script and identify every distinct visual moment that deserves its own B-roll footage — then generate search queries that find the most visually compelling and tonally accurate clips.

For each segment, generate EXACTLY 3 search queries structured as follows:

QUERY 1 — Primary visual: What does the camera see at the emotional peak of this moment? ALWAYS name the specific sport, activity, or subject type explicitly (e.g. "american football", "basketball", "cooking", "surgery"). NEVER use obscure event names, team names, or venue names as the primary term.

QUERY 2 — Setting + mood: Add the general setting, time of day, or emotional tone (e.g. "person dancing alone at night kitchen", "city streets empty quiet night"). Use broad, stockable terms.

QUERY 3 — Visual variation: A distinct third angle — wider, closer, or from a different perspective on the same moment.

CRITICAL RULES — READ CAREFULLY:

1. GRANULARITY — ONE SEGMENT = ONE VISUAL MOMENT (very important):
   Within a single clause or sentence, if multiple distinct visual moments are described (e.g. a subject AND a separate setting, two unrelated actions, an object AND a creature), extract them as SEPARATE non-overlapping segments — each anchored to its own verbatim text span.

   Examples of CORRECT granular splitting:
   - "He marched his way up to the castle in the forest" → TWO segments:
     • text: "marched his way up" → person hiking up a steep path
     • text: "castle in the forest" → medieval castle in wooded landscape
   - "took all of the water he could, since it was a long trek" → TWO segments:
     • text: "took all of the water he could" → filling/carrying water for a journey
     • text: "a long trek" → exhausted traveler on a long trail
   - "saw a dragon standing next to a bridge" → ONE segment (the dragon and bridge form ONE visual scene together)
   - "He took out his sword" → ONE segment (single coherent action)

   Rule of thumb: if you'd want TWO different stock clips to cover what the narrator is describing, extract TWO segments. If one clip naturally covers it, extract one. Err on the side of MORE granular, not less.

2. FIGURATIVE AND COLLOQUIAL LANGUAGE: When a phrase is clearly figurative or colloquial (e.g. "I start the party", "burning the midnight oil", "light at the end of the tunnel", "on fire"), DO NOT take it literally. Identify the intended visual mood or energy instead. "I start the party" = solo late-night energy, person dancing alone, someone coming alive while others sleep — NOT a party or people lying down.

3. SETUP vs. PUNCHLINE: For segments with a setup + punchline structure ("when X happens, I do Y"), the PUNCHLINE is the primary visual. The setup is context. Focus your first two queries on the punchline's visual energy, not the setup's literal action.

4. CONTRAST AS VISUAL OPPORTUNITY: When a segment contrasts two states (sleeping vs. awake, quiet vs. energetic, before vs. after), consider capturing both sides. The contrast itself is a visual story.

5. MOOD AND TONE OVER LITERAL NOUNS: If a phrase carries strong emotional energy (rebellious, joyful, melancholic, chaotic), let that tone guide the queries toward footage that FEELS right, even if it doesn't directly depict the literal words.

6. VISUAL SPECIFICITY: Queries must describe what the camera would show. Never use abstract concepts as search terms. "Freedom" is not a query; "person running on open road arms outstretched" is.

7. Never write queries so specific they'd return zero results (obscure bowl games, minor-league teams, local venues).

Return only valid JSON — no markdown, no explanation, no preamble. Return an array of segment objects. Segments must not overlap (each verbatim text span can only appear in one segment). Cover every distinct visual moment in the excerpt; skip only pure filler phrases ("you see", "as I said", etc.).`

// Re-export so callers of lib/claude.ts still work
const _wordsPerChunk = WORDS_PER_CHUNK
void _wordsPerChunk

function parseClaudeResponse(rawText: string): ScriptSegment[] {
  let text = rawText.trim()

  if (text.includes('```')) {
    text = text.replace(/```(?:json)?\n?/g, '').trim()
  }

  const arrayMatch = text.match(/\[[\s\S]*\]/)
  if (arrayMatch) text = arrayMatch[0]

  try {
    const parsed = JSON.parse(text)
    if (Array.isArray(parsed)) return parsed as ScriptSegment[]
  } catch {
    // Attempt partial recovery for truncated responses
    const objectMatches = text.match(/\{[^{}]*"searchQueries"\s*:\s*\[[^\]]*\][^{}]*\}/g)
    if (objectMatches && objectMatches.length > 0) {
      try {
        const recovered = JSON.parse(`[${objectMatches.join(',')}]`)
        console.log(`[claude] recovered ${objectMatches.length} segments from truncated response`)
        return recovered as ScriptSegment[]
      } catch { /* fall through */ }
    }
  }

  return []
}

export function validateSegments(script: string, segments: ScriptSegment[]): ScriptSegment[] {
  const validated: ScriptSegment[] = []

  for (const seg of segments) {
    const slice = script.slice(seg.startIndex, seg.endIndex)
    if (slice === seg.text) {
      validated.push(seg)
      continue
    }

    const foundIndex = script.indexOf(seg.text)
    if (foundIndex !== -1) {
      validated.push({ ...seg, startIndex: foundIndex, endIndex: foundIndex + seg.text.length })
      continue
    }

    const lower = script.toLowerCase()
    const foundLower = lower.indexOf(seg.text.toLowerCase())
    if (foundLower !== -1) {
      validated.push({
        ...seg,
        text: script.slice(foundLower, foundLower + seg.text.length),
        startIndex: foundLower,
        endIndex: foundLower + seg.text.length,
      })
    }
  }

  return validated
}

// Generate a brief context summary of the full script using a fast Haiku call.
// This anchors every chunk's search queries to the script's topic/event/location.
export async function generateScriptContext(script: string): Promise<string> {
  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 150,
      messages: [{
        role: 'user',
        content: `In 1-2 sentences, summarize what this script is about for a video researcher — include the specific topic, event name, location, people, or organization if mentioned. Be specific, not generic.\n\nScript:\n${script.slice(0, 2000)}`,
      }],
    })
    const text = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
    console.log(`[claude] script context: ${text}`)
    return text
  } catch {
    return '' // non-fatal — analysis continues without context
  }
}

export async function analyzeChunk(
  chunkText: string,
  offset: number,
  chapterNumber: number,
  chunkIndex: number,
  scriptContext?: string,
  contextBefore?: string
): Promise<ScriptSegment[]> {
  const contextSection = scriptContext
    ? `SCRIPT CONTEXT (use this to make search queries specific):\n${scriptContext}\n\n`
    : ''

  const precedingSection = contextBefore?.trim()
    ? `PRECEDING NARRATIVE (for context — do not extract segments from this):\n${contextBefore.trim()}\n\n`
    : ''

  const userMessage = `${contextSection}${precedingSection}Analyze the CURRENT EXCERPT below and return a JSON array of segments. Each object must have: id (string, e.g. seg_${chunkIndex}_1), text (exact verbatim phrase from the excerpt), startIndex (number — character index within this excerpt), endIndex (number), topic (short visual label), searchQueries (array of 2-3 strings — must be specific to the script's topic/event/location using the context above), chapter (use ${chapterNumber} for all segments in this response). Return only valid JSON with no markdown or explanation.\n\nCURRENT EXCERPT:\n${chunkText}`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-5',
    // Higher cap so dense passages with many granular segments don't get truncated
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  })

  const content = message.content[0]
  if (content.type !== 'text') return []

  console.log(`[claude] chunk ${chunkIndex} response (first 300 chars):`, content.text.slice(0, 300))

  const segments = parseClaudeResponse(content.text)

  // Offset all indices to be relative to the full script
  return segments.map((seg) => ({
    ...seg,
    startIndex: seg.startIndex + offset,
    endIndex: seg.endIndex + offset,
    chapter: chapterNumber,
  }))
}

// When initial search results are all low-relevance, generate pure visual fallback queries.
// Strips proper nouns and focuses on what the camera would literally show.
export async function generateFallbackQueries(segmentText: string, topic: string): Promise<string[]> {
  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: `A stock footage search returned poor results for this script segment. Generate 2 new search queries that are purely visual and highly searchable on stock footage sites.

Rules:
- Describe only what the CAMERA WOULD LITERALLY SEE (actions, objects, settings, body language)
- Always explicitly name the sport, activity, or subject type (e.g. "american football", "basketball", "cooking", "medical")
- DO NOT use specific event names, team names, venue names, or any proper nouns
- Use broad, generic terms that stock footage sites would have

Topic hint: ${topic}
Script segment: "${segmentText.slice(0, 300)}"

Return ONLY a JSON array of 2 query strings. No markdown, no explanation.`,
      }],
    })
    const text = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
    const match = text.match(/\[[\s\S]*\]/)
    if (!match) return []
    const parsed = JSON.parse(match[0])
    if (Array.isArray(parsed) && parsed.every((q) => typeof q === 'string')) {
      console.log('[claude] fallback queries:', parsed)
      return parsed as string[]
    }
    return []
  } catch {
    return []
  }
}

/**
 * Translate a keyword (any language) into 2-3 English stock footage search queries.
 * Used in keyword mode so non-English inputs still search English-indexed stock libraries.
 */
/**
 * Translate a non-English phrase to English using the Google Translate public endpoint.
 * Auto-detects the source language and handles slang/colloquialisms correctly
 * (e.g. Bulgarian "купона" → "party", not "coupon"). No API key required.
 */
async function translateToEnglish(text: string): Promise<string | null> {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(text)}`
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) return null
    // Response shape: [[[translatedText, originalText, ...], ...], null, detectedLang, ...]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await res.json()
    if (Array.isArray(data) && Array.isArray(data[0]) && Array.isArray(data[0][0])) {
      // Concatenate all translation segments (long texts are split into chunks)
      const translated = (data[0] as [string, string][])
        .map((chunk) => chunk[0])
        .filter(Boolean)
        .join(' ')
        .trim()
      if (translated && translated.toLowerCase() !== text.toLowerCase()) {
        return translated
      }
    }
    return null
  } catch {
    return null
  }
}

export interface KeywordExpansion {
  queries: string[]
  /** True when the keyword refers to a specific named entity (brand/company/person/place/product) */
  requiresLiteralMatch: boolean
  /** Canonical display form, e.g. "arbys" → "Arby's" — only set for literal entities */
  canonicalName?: string
}

/**
 * Expand a user-typed keyword into 2-3 English stock footage search queries.
 *
 * Detects whether the keyword refers to a SPECIFIC named entity (a brand,
 * company, person, product, or place) vs. a generic concept. For literal
 * entities, the queries include the entity name verbatim so YouTube/stock
 * search actually surfaces brand-specific content, and the segment is
 * flagged so the relevance scorer rejects look-alike alternatives.
 */
export async function prepareKeywordForSearch(
  keyword: string,
  originalContext?: string
): Promise<KeywordExpansion> {
  try {
    // Translate non-Latin keywords first — Google Translate handles slang/idioms correctly.
    const hasNonLatin = /[^\u0000-\u007F]/.test(keyword)
    let textForAnalysis = keyword
    if (hasNonLatin) {
      const translated = await translateToEnglish(keyword)
      if (translated) {
        textForAnalysis = translated
      } else if (originalContext && originalContext !== keyword) {
        const ctxTranslated = await translateToEnglish(originalContext)
        if (ctxTranslated) textForAnalysis = ctxTranslated
      }
    }
    console.log(`[expandKeyword] "${keyword}" → "${textForAnalysis}"`)

    // Single Claude call: classify entity type + generate appropriate queries
    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `Analyze this keyword and generate 2-3 English search queries optimised for finding B-roll on Pexels, Pixabay, and YouTube.

Step 1 — Classify the keyword:
- "literal" — a specific NAMED ENTITY the user wants to see on screen literally. This includes:
  • Brands / companies (Arby's, McDonald's, Tesla, Apple, Nike)
  • Sports teams / leagues / clubs (Indianapolis Colts, Manchester United, Lakers, NBA, NFL, Premier League)
  • Public figures (Elon Musk, Taylor Swift, LeBron James, presidents, athletes by name)
  • Schools / universities (Harvard, Notre Dame, Michigan Wolverines)
  • Named places (Times Square, Mount Everest, Eiffel Tower, Las Vegas Strip)
  • Product lines / specific models (iPhone 15, Tesla Model 3, PlayStation 5)
  • Music acts, TV shows, movies, franchises (The Beatles, Stranger Things, Marvel)
- "concept" — anything else. Activities, emotions, generic categories, common objects, generic places (a forest, a city), or generic activities (football in general — but NOT a specific team). Examples: cooking, sunset, fast food, hiking, party, dragons.

Rule of thumb: if a Wikipedia article would exist for this exact phrase, it's likely "literal".

Step 2 — Generate queries based on classification:

If "literal", queries MUST include the entity name verbatim. The user wants to see THAT specific entity, not generic alternatives. Examples:
- "arbys" → {"type":"literal","canonicalName":"Arby's","queries":["Arby's restaurant storefront exterior","Arby's roast beef sandwich curly fries food","Arby's drive thru sign location"]}
- "indianapolis colts" → {"type":"literal","canonicalName":"Indianapolis Colts","queries":["Indianapolis Colts NFL football game highlights","Indianapolis Colts Lucas Oil Stadium home game","Indianapolis Colts players blue uniform field"]}
- "elon musk speaking" → {"type":"literal","canonicalName":"Elon Musk","queries":["Elon Musk speaking at conference podium","Elon Musk interview close up talking","Elon Musk Tesla SpaceX presentation"]}
- "times square" → {"type":"literal","canonicalName":"Times Square","queries":["Times Square New York City crowds","Times Square at night billboards lights","Times Square aerial wide shot"]}

If "concept", queries describe what the camera would literally see using broad stockable terms (NO proper nouns). Examples:
- "fast food" → {"type":"concept","queries":["fast food restaurant counter customers","burger fries soda food close up","drive thru window order pickup"]}
- "football" (generic sport, no team) → {"type":"concept","queries":["american football game tackle play","football quarterback throwing pass stadium","football helmet uniform close up huddle"]}
- "sunset over ocean" → {"type":"concept","queries":["golden hour ocean horizon waves","sunset reflecting on sea water","tropical beach sunset wide shot"]}

Keyword: "${textForAnalysis}"

Return ONLY valid JSON in the format shown above. No markdown, no explanation.`,
      }],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) {
      return { queries: [textForAnalysis], requiresLiteralMatch: false }
    }

    const parsed = JSON.parse(match[0]) as { type?: string; canonicalName?: string; queries?: unknown }
    const queries = Array.isArray(parsed.queries) && parsed.queries.every((q) => typeof q === 'string')
      ? (parsed.queries as string[])
      : null
    if (!queries || queries.length === 0) {
      return { queries: [textForAnalysis], requiresLiteralMatch: false }
    }

    const requiresLiteralMatch = parsed.type === 'literal'
    const canonicalName = requiresLiteralMatch && typeof parsed.canonicalName === 'string' ? parsed.canonicalName : undefined
    console.log(
      `[expandKeyword] queries for "${textForAnalysis}" [${requiresLiteralMatch ? `literal:${canonicalName ?? '?'}` : 'concept'}]: ${JSON.stringify(queries)}`
    )
    return { queries, requiresLiteralMatch, canonicalName }
  } catch (err) {
    console.error('[expandKeyword] error:', err)
    return { queries: [keyword], requiresLiteralMatch: false }
  }
}

/**
 * @deprecated Use {@link prepareKeywordForSearch} instead — returns richer metadata
 * (entity classification + canonical name) needed for literal-match scoring.
 */
export async function expandKeywordToEnglishQueries(keyword: string, originalContext?: string): Promise<string[]> {
  const { queries } = await prepareKeywordForSearch(keyword, originalContext)
  return queries
}

/**
 * Generate fresh search queries for a segment that already has results,
 * intentionally avoiding the original queries so we surface new footage.
 */
export async function generateMoreQueries(
  segmentText: string,
  topic: string,
  existingQueries: string[],
  requiresLiteralMatch?: boolean
): Promise<string[]> {
  try {
    const literalSection = requiresLiteralMatch
      ? `\nIMPORTANT: This segment is about the SPECIFIC named entity "${topic}". Every query you generate MUST include the entity name verbatim — the user wants more footage of THAT entity, not generic alternatives. Do NOT generate generic category queries (e.g. "fast food restaurant" when the entity is "Arby's").\n`
      : '\n- Describe only what the camera would literally see\n- Use broad generic terms stock footage sites carry\n'

    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: `A user wants MORE stock footage options for this video segment. The existing searches already ran:
${existingQueries.map((q) => `- "${q}"`).join('\n')}

Generate 3 DIFFERENT search queries that approach the same visual topic from fresh angles (different framing, synonyms, related imagery, wider/narrower scope).
${literalSection}
Rules:
- Do NOT repeat or closely paraphrase the existing queries above

Topic: ${topic}
Segment: "${segmentText.slice(0, 300)}"

Return ONLY a JSON array of 3 query strings. No markdown, no explanation.`,
      }],
    })
    const text = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
    const match = text.match(/\[[\s\S]*\]/)
    if (!match) return []
    const parsed = JSON.parse(match[0])
    if (Array.isArray(parsed) && parsed.every((q) => typeof q === 'string')) {
      return parsed as string[]
    }
    return []
  } catch {
    return []
  }
}

export async function analyzeScript(script: string): Promise<ScriptSegment[]> {
  const chunks = splitIntoChunks(script)
  console.log(`[claude] split script into ${chunks.length} chunk(s)`)

  // Generate context summary first (fast Haiku call ~1s), then run all chunks with it
  const scriptContext = await generateScriptContext(script)

  const chunkResults = await Promise.all(
    chunks.map((chunk, i) => {
      const contextBefore = script.slice(Math.max(0, chunk.offset - 400), chunk.offset)
      return analyzeChunk(chunk.text, chunk.offset, i + 1, i + 1, scriptContext, contextBefore)
    })
  )

  // Flatten, re-ID, and validate against the full script
  const allSegments = chunkResults
    .flat()
    .map((seg, i) => ({ ...seg, id: `seg_${i + 1}` }))

  const validated = validateSegments(script, allSegments)

  console.log(`[claude] total validated segments: ${validated.length}`)
  return validated
}
