import Anthropic from '@anthropic-ai/sdk'
import type { ScriptSegment } from './types'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  maxRetries: 3,
})

const SYSTEM_PROMPT = `You are a video research assistant. Your job is to analyze a video script and identify every phrase, sentence, or clause that describes something visually specific — a moment where B-roll footage would help illustrate what's being said.

For each segment:
- Return the exact verbatim text from the script (no paraphrasing)
- Return the character start and end indices within the excerpt
- Write a short visual topic label
- Write 2-3 search queries that are SPECIFIC and CONTEXTUAL — always incorporate the script's topic, location, event name, or key proper nouns into the queries. Never write generic queries that could apply to any script. For example, if the script is about the Redbox Bowl at AT&T Park, a query for "crowded sideline" should be "Redbox Bowl crowded sideline AT&T Park" not just "crowded football sideline".

Return only valid JSON — no markdown, no explanation, no preamble. Return an array of segment objects. Segments must not overlap. Every meaningful visual moment should be covered but generic transitions or filler phrases should be skipped.`

const WORDS_PER_CHUNK = 400

// Split script into chunks of ~400 words at paragraph boundaries
export function splitIntoChunks(script: string): Array<{ text: string; offset: number }> {
  const paragraphs = script.split(/\n\n+/)
  const chunks: Array<{ text: string; offset: number }> = []

  let currentChunk = ''
  let currentOffset = 0
  let chunkStartOffset = 0

  for (const paragraph of paragraphs) {
    const wordCount = (currentChunk + paragraph).split(/\s+/).filter(Boolean).length

    if (currentChunk && wordCount > WORDS_PER_CHUNK) {
      // Save current chunk and start a new one
      chunks.push({ text: currentChunk.trim(), offset: chunkStartOffset })
      // Find where this paragraph starts in the original script
      chunkStartOffset = currentOffset
      currentChunk = paragraph + '\n\n'
    } else {
      currentChunk += paragraph + '\n\n'
    }

    currentOffset = script.indexOf(paragraph, currentOffset) + paragraph.length + 2
  }

  if (currentChunk.trim()) {
    chunks.push({ text: currentChunk.trim(), offset: chunkStartOffset })
  }

  return chunks
}

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
