import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  maxRetries: 2,
})

export const maxDuration = 15

export async function POST(req: NextRequest) {
  const { keyword } = await req.json()

  if (!keyword || typeof keyword !== 'string' || keyword.trim().split(/\s+/).length <= 2) {
    return NextResponse.json({ shouldSplit: false, parts: null })
  }

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 120,
      messages: [{
        role: 'user',
        content: `Does this phrase contain two distinct visual ideas that would produce better stock footage results as two separate searches rather than one?

Phrase: "${keyword.trim()}"

Rules:
- Split when the phrase joins two unrelated subjects with "and"/"or"/"&" — e.g. "bananas and baseball" → ["bananas", "baseball"]
- Split when there are two different visual moments connected by a clause break — e.g. "when everyone goes to bed I start the party" → ["when everyone goes to bed", "I start the party"]
- Do NOT split phrases that describe ONE unified visual idea, even if multi-word — e.g. "sunset over the ocean", "golden hour beach waves", "old man fishing on a boat", "person cutting paper with scissors" all stay as one
- Do NOT split simple adjective+noun compounds — e.g. "red car", "happy children"
- The split point should be at the natural grammatical boundary (conjunction, comma, clause break)
- Each part must still make sense as a standalone search keyword
- IMPORTANT: Return the parts in the SAME LANGUAGE as the input phrase. Do not translate.

Return ONLY valid JSON, no explanation:
{"shouldSplit": true, "parts": ["first idea", "second idea"]}
or
{"shouldSplit": false, "parts": null}`,
      }],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return NextResponse.json({ shouldSplit: false, parts: null })

    const parsed = JSON.parse(match[0])
    if (
      typeof parsed.shouldSplit === 'boolean' &&
      (parsed.parts === null || (Array.isArray(parsed.parts) && parsed.parts.length === 2))
    ) {
      return NextResponse.json(parsed)
    }

    return NextResponse.json({ shouldSplit: false, parts: null })
  } catch {
    return NextResponse.json({ shouldSplit: false, parts: null })
  }
}
