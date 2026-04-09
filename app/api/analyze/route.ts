import { NextRequest, NextResponse } from 'next/server'
import { analyzeScript } from '@/lib/claude'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { script } = body

    if (!script || typeof script !== 'string' || script.trim().length === 0) {
      return NextResponse.json({ error: 'A script is required' }, { status: 400 })
    }

    if (script.length > 100000) {
      return NextResponse.json({ error: 'Script is too long (max 100,000 characters)' }, { status: 400 })
    }

    const segments = await analyzeScript(script.trim())

    return NextResponse.json({ segments })
  } catch (error) {
    console.error('Analyze route error:', error)
    const message = error instanceof Error ? error.message : 'Failed to analyze script'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
