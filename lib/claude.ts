import Anthropic from '@anthropic-ai/sdk'
import type { ScriptSegment } from './types'
import { WORDS_PER_CHUNK, splitIntoChunks as _splitIntoChunks } from './chunks'

export { splitIntoChunks } from './chunks'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  maxRetries: 3,
})

const SYSTEM_PROMPT = `You are a video research assistant. Your job is to analyze a video script and identify every phrase, sentence, or clause that describes something visually specific — a moment where B-roll footage would help illustrate what's being said.

For each segment, generate EXACTLY 3 search queries structured as follows:

QUERY 1 — Visual concept first: Describe precisely what the camera would see. ALWAYS name the specific sport, activity, or subject type explicitly (e.g. "american football", "basketball", "cooking", "surgery"). NEVER use obscure event names, team names, or venue names as the primary term — stock footage sites don't carry footage of specific games or local venues. Example: instead of "Redbox Bowl sideline crowded", write "american football coaches players crowded sideline".

QUERY 2 — Setting + visual: Add the general setting or context (e.g. "college football game sideline bench coaches overflow crowd"). Use the broader category, not the specific event.

QUERY 3 — Visual variation: A third distinct visual angle on the same moment. Only use a proper noun (event, location, person) if it is world-famous and would appear in stock footage (e.g. "Super Bowl", "World Cup", "Times Square", "Eiffel Tower"). Otherwise write another visual variation.

Additional rules:
- Always name the sport/activity type explicitly in at least the first two queries
- Queries must describe what is VISUALLY IN THE FRAME, not the narrative meaning
- Never write queries so specific they'd return zero results (obscure bowl games, minor-league teams, local venues)

Return only valid JSON — no markdown, no explanation, no preamble. Return an array of segment objects. Segments must not overlap. Every meaningful visual moment should be covered but generic transitions or filler phrases should be skipped.`

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
    max_tokens: 4096,
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
