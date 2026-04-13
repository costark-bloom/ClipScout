import { NextRequest } from 'next/server'
import { splitIntoChunks, analyzeChunk, validateSegments, generateScriptContext } from '@/lib/claude'
import type { ScriptSegment } from '@/lib/types'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { script } = body

  if (!script || typeof script !== 'string' || script.trim().length === 0) {
    return new Response(JSON.stringify({ error: 'A script is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (script.length > 100000) {
    return new Response(JSON.stringify({ error: 'Script is too long (max 100,000 characters)' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const trimmed = script.trim()
  const chunks = splitIntoChunks(trimmed)
  const encoder = new TextEncoder()
  let segmentCounter = 0

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Generate script context summary before analyzing any chunks.
        // This fast Haiku call (~1s) gives every chunk specific topic/location/event context.
        const scriptContext = await generateScriptContext(trimmed)

        const processChunk = async (chunk: { text: string; offset: number }, index: number) => {
          const contextBefore = trimmed.slice(Math.max(0, chunk.offset - 400), chunk.offset)
          const raw = await analyzeChunk(chunk.text, chunk.offset, index + 1, index + 1, scriptContext, contextBefore)
          const validated = validateSegments(trimmed, raw).map((seg) => ({
            ...seg,
            id: `seg_${++segmentCounter}`,
          }))
          if (validated.length > 0) {
            controller.enqueue(
              encoder.encode(JSON.stringify({ segments: validated as ScriptSegment[] }) + '\n')
            )
          }
        }

        // Process chunk 1 first so chapter 1 search can start immediately
        await processChunk(chunks[0], 0)

        // Process remaining chunks in parallel
        if (chunks.length > 1) {
          await Promise.all(chunks.slice(1).map((chunk, i) => processChunk(chunk, i + 1)))
        }
      } catch (error) {
        console.error('Analyze stream error:', error)
        const message = error instanceof Error ? error.message : 'Failed to analyze script'
        controller.enqueue(encoder.encode(JSON.stringify({ error: message }) + '\n'))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  })
}
