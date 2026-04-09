import Anthropic from '@anthropic-ai/sdk'
import type { ScriptSegment } from './types'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const SYSTEM_PROMPT = `You are a video research assistant. Your job is to analyze a video script and identify every phrase, sentence, or clause that describes something visually specific — a moment where B-roll footage would help illustrate what's being said. For each segment, return the exact verbatim text from the script (no paraphrasing), the character start and end indices of that text within the full script, a short visual topic label, and 2-3 optimized search queries. Return only valid JSON — no markdown, no explanation, no preamble. Return an array of segment objects. Segments must not overlap. Every meaningful visual moment should be covered but generic transitions or filler phrases should be skipped.`

function validateSegments(script: string, segments: ScriptSegment[]): ScriptSegment[] {
  const validated: ScriptSegment[] = []

  for (const seg of segments) {
    // First try the indices Claude provided
    const slice = script.slice(seg.startIndex, seg.endIndex)
    if (slice === seg.text) {
      validated.push(seg)
      continue
    }

    // Claude's indices were off — search for the text in the script
    const foundIndex = script.indexOf(seg.text)
    if (foundIndex !== -1) {
      validated.push({
        ...seg,
        startIndex: foundIndex,
        endIndex: foundIndex + seg.text.length,
      })
      continue
    }

    // Try a case-insensitive match as last resort
    const lower = script.toLowerCase()
    const foundLower = lower.indexOf(seg.text.toLowerCase())
    if (foundLower !== -1) {
      const correctedText = script.slice(foundLower, foundLower + seg.text.length)
      validated.push({
        ...seg,
        text: correctedText,
        startIndex: foundLower,
        endIndex: foundLower + seg.text.length,
      })
    }
    // If not found at all, discard the segment
  }

  return validated
}

export async function analyzeScript(script: string): Promise<ScriptSegment[]> {
  const userMessage = `Analyze this script and return a JSON array of segments. Each object must have: id (string, e.g. seg_1), text (exact verbatim phrase from the script), startIndex (number), endIndex (number), topic (short visual label), searchQueries (array of 2-3 strings), chapter (integer starting from 1 — group segments into logical thematic chapters based on natural breaks in the script; aim for 3-6 segments per chapter; if the script is short, use 1 chapter). Script: ${script}`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: userMessage,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude')
  }

  let rawText = content.text.trim()

  console.log('[claude] raw response (first 500 chars):', rawText.slice(0, 500))

  // Strip markdown code fences
  if (rawText.includes('```')) {
    rawText = rawText.replace(/```(?:json)?\n?/g, '').trim()
  }

  // Extract the JSON array from anywhere in the response
  const arrayMatch = rawText.match(/\[[\s\S]*\]/)
  if (arrayMatch) {
    rawText = arrayMatch[0]
  }

  console.log('[claude] cleaned text (first 500 chars):', rawText.slice(0, 500))

  let parsed: unknown
  try {
    parsed = JSON.parse(rawText)
  } catch (e) {
    console.error('[claude] JSON parse error:', e)
    console.error('[claude] full raw text:', content.text)
    throw new Error('Claude returned invalid JSON — try a shorter script')
  }

  if (!Array.isArray(parsed)) {
    throw new Error('Claude response is not an array')
  }

  const segments = parsed as ScriptSegment[]
  const validated = validateSegments(script, segments)

  return validated
}
