import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { analyzeChunk, validateSegments, generateScriptContext } from '@/lib/claude'
import { splitIntoChunks } from '@/lib/chunks'
import { getCreditsRemaining, deductCredit } from '@/lib/credits'
import type { ScriptSegment } from '@/lib/types'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return new Response(JSON.stringify({ error: 'You must be signed in to analyze a script.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const userEmail = session.user.email
  const body = await request.json()
  const { script, chunkIndex, segmentIdOffset = 0, scriptContext: providedContext } = body

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

  const creditsRemaining = await getCreditsRemaining(userEmail)
  if (creditsRemaining < 1) {
    return new Response(JSON.stringify({ error: 'INSUFFICIENT_CREDITS' }), {
      status: 402,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const trimmed = script.trim()
  const chunks = splitIntoChunks(trimmed)
  const encoder = new TextEncoder()
  let segmentCounter = segmentIdOffset

  // Single-chunk mode: analyze one specific chapter on demand
  if (typeof chunkIndex === 'number') {
    const chunk = chunks[chunkIndex]
    if (!chunk) {
      return new Response(JSON.stringify({ error: 'Invalid chunk index' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const scriptContext = providedContext ?? await generateScriptContext(trimmed)
          const contextBefore = trimmed.slice(Math.max(0, chunk.offset - 400), chunk.offset)
          const raw = await analyzeChunk(
            chunk.text,
            chunk.offset,
            chunkIndex + 1,
            chunkIndex + 1,
            scriptContext,
            contextBefore
          )
          const validated = validateSegments(trimmed, raw).map((seg) => ({
            ...seg,
            id: `seg_${++segmentCounter}`,
          }))

          await deductCredit(userEmail)
          console.log(`[credits] deducted 1 credit for ${userEmail} (chunk ${chunkIndex + 1})`)

          if (validated.length > 0) {
            controller.enqueue(
              encoder.encode(JSON.stringify({ segments: validated as ScriptSegment[] }) + '\n')
            )
          }
        } catch (error) {
          console.error('Analyze single-chunk error:', error)
          controller.enqueue(encoder.encode(JSON.stringify({ error: 'Failed to analyze chapter' }) + '\n'))
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

  // Default mode: analyze only chunk 0 (chapter 1)
  // Subsequent chapters are loaded on demand via chunkIndex param
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Emit chunk metadata so client knows the total chapter count + offsets
        const chunkMeta = chunks.map((c) => ({ offset: c.offset }))
        controller.enqueue(
          encoder.encode(JSON.stringify({ chunkMeta }) + '\n')
        )

        const scriptContext = await generateScriptContext(trimmed)

        // Only analyze the first chunk; remaining chapters loaded on demand
        const chunk = chunks[0]
        const contextBefore = ''
        const raw = await analyzeChunk(chunk.text, chunk.offset, 1, 1, scriptContext, contextBefore)
        const validated = validateSegments(trimmed, raw).map((seg) => ({
          ...seg,
          id: `seg_${++segmentCounter}`,
        }))

        await deductCredit(userEmail)
        console.log(`[credits] deducted 1 credit for ${userEmail} (initial chunk 1)`)

        if (validated.length > 0) {
          controller.enqueue(
            encoder.encode(JSON.stringify({ segments: validated as ScriptSegment[], scriptContext }) + '\n')
          )
        } else {
          // Even if no segments, send the context for later chapter loads
          controller.enqueue(
            encoder.encode(JSON.stringify({ scriptContext }) + '\n')
          )
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
