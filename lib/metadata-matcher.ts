import Anthropic from '@anthropic-ai/sdk'
import type { VideoResult } from './types'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  maxRetries: 3,
})

interface ClaudeMatch {
  videoId: string
  relevanceScore: number  // 0.0 – 1.0
  reason: string          // 1-sentence explanation shown in UI
}

async function matchMetadataWithClaude(
  segmentText: string,
  videos: VideoResult[]
): Promise<ClaudeMatch[]> {
  if (videos.length === 0) return []

  const videoDescriptions = videos
    .map((v) => {
      const tagStr = v.tags && v.tags.length > 0 ? v.tags.join(', ') : 'none'
      return `VIDEO_ID: ${v.id}\nPLATFORM: ${v.platform}\nTITLE: ${v.title}\nTAGS: ${tagStr}\nDURATION: ${v.duration ?? 'unknown'}`
    })
    .join('\n\n---\n\n')

  const prompt = `You are a video research assistant helping a content creator find B-roll stock footage.

SCRIPT SEGMENT (what the creator is narrating):
"${segmentText}"

Below are stock footage clips from Pexels and Pixabay. Each clip is described by its title and tags — there is no transcript since these are silent stock clips.

For each clip, score how visually relevant it is to the script segment — meaning: would this footage work well as B-roll playing while the creator narrates those words?

Score 1.0 = the clip would be a perfect visual match for this narration
Score 0.0 = the clip has nothing to do with what's being described

Return ONLY a valid JSON array. No markdown, no explanation. Each object must have:
- videoId (string)
- relevanceScore (number, 0.0–1.0)
- reason (string, 1 sentence max — explain what visual content makes it relevant or irrelevant)

${videoDescriptions}`

  const message = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })

  const content = message.content[0]
  if (content.type !== 'text') return []

  let raw = content.text.trim()
  if (raw.includes('```')) raw = raw.replace(/```(?:json)?\n?/g, '').trim()
  const arrayMatch = raw.match(/\[[\s\S]*\]/)
  if (!arrayMatch) return []

  try {
    return JSON.parse(arrayMatch[0]) as ClaudeMatch[]
  } catch {
    return []
  }
}

// Enriches Pexels/Pixabay results with Claude-scored relevance based on metadata
export async function enrichWithMetadata(
  segmentText: string,
  videos: VideoResult[]
): Promise<VideoResult[]> {
  if (videos.length === 0) return []

  let matches: ClaudeMatch[] = []
  try {
    matches = await matchMetadataWithClaude(segmentText, videos)
  } catch (err) {
    console.warn('Metadata enrichment failed, using raw results:', err)
    return videos
  }

  const matchMap = new Map<string, ClaudeMatch>()
  for (const m of matches) matchMap.set(m.videoId, m)

  const enriched = videos.map((v) => {
    const match = matchMap.get(v.id)
    if (!match) return v
    return {
      ...v,
      relevanceScore: match.relevanceScore,
      transcriptReason: match.reason,
    }
  })

  // Sort by relevance score descending
  return enriched.sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0))
}
