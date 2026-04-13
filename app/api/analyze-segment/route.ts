import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  maxRetries: 3,
})

export const maxDuration = 30

export async function POST(req: NextRequest) {
  let text = ''
  try {
    const body = await req.json()
    text = typeof body?.text === 'string' ? body.text.trim() : ''

    if (!text) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 })
    }

    const prompt = `You are a video research assistant. Given this script excerpt, return a JSON object with:
- "topic": a short (3-6 word) visual topic label describing what footage would illustrate this
- "searchQueries": an array of 2-3 optimized search queries for finding relevant B-roll footage

Return ONLY valid JSON, no markdown, no explanation.

Script excerpt:
"${text.slice(0, 500)}"`

    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')

    const parsed = JSON.parse(jsonMatch[0])

    return NextResponse.json({
      topic: String(parsed.topic ?? text.slice(0, 60)),
      searchQueries: Array.isArray(parsed.searchQueries)
        ? parsed.searchQueries.slice(0, 3).map(String)
        : [text.slice(0, 80)],
    })
  } catch (err) {
    console.error('[analyze-segment] error:', err)
    return NextResponse.json({
      topic: text.slice(0, 60) || 'Custom segment',
      searchQueries: [text.slice(0, 80) || 'video footage'],
    })
  }
}
