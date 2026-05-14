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

export async function expandKeywordToEnglishQueries(keyword: string, originalContext?: string): Promise<string[]> {
  try {
    // Detect non-Latin script (non-English) — only translate when needed
    const hasNonLatin = /[^\u0000-\u007F]/.test(keyword)

    let englishMeaning = keyword
    if (hasNonLatin) {
      // Translate the keyword itself — Google Translate handles slang/idioms correctly.
      // If translation fails AND we have a longer original phrase, try that as a fallback
      // since longer text gives the translator more context to disambiguate.
      const translated = await translateToEnglish(keyword)
      if (translated) {
        englishMeaning = translated
      } else if (originalContext && originalContext !== keyword) {
        const ctxTranslated = await translateToEnglish(originalContext)
        if (ctxTranslated) englishMeaning = ctxTranslated
      }
    }
    console.log(`[expandKeyword] "${keyword}" → "${englishMeaning}"`)

    // Generate stock footage search queries from the (now English) meaning
    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 150,
      messages: [{
        role: 'user',
        content: `Generate 2-3 English search queries for finding stock footage on Pexels, Pixabay, and YouTube that matches this concept:

"${englishMeaning}"

Rules:
- Describe what the camera would literally see (people, actions, settings, objects)
- Use broad, stockable terms — avoid proper nouns unless world-famous
- Each query should be a distinct visual angle on the same concept

Return ONLY a JSON array of 2-3 English query strings. No markdown, no explanation.`,
      }],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
    const match = raw.match(/\[[\s\S]*\]/)
    if (!match) return [englishMeaning]
    const parsed = JSON.parse(match[0])
    if (Array.isArray(parsed) && parsed.every((q) => typeof q === 'string') && parsed.length > 0) {
      console.log(`[expandKeyword] queries for "${englishMeaning}": ${JSON.stringify(parsed)}`)
      return parsed as string[]
    }
    return [englishMeaning]
  } catch (err) {
    console.error('[expandKeyword] error:', err)
    return [keyword]
  }
}

/**
 * Generate fresh search queries for a segment that already has results,
 * intentionally avoiding the original queries so we surface new footage.
 */
export async function generateMoreQueries(
  segmentText: string,
  topic: string,
  existingQueries: string[]
): Promise<string[]> {
  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: `A user wants MORE stock footage options for this video segment. The existing searches already ran:
${existingQueries.map((q) => `- "${q}"`).join('\n')}

Generate 3 DIFFERENT search queries that approach the same visual topic from fresh angles (different framing, synonyms, related imagery, wider/narrower scope).

Rules:
- Describe only what the camera would literally see
- Use broad generic terms stock footage sites carry
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
