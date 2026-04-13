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
  videos: VideoResult[],
  topic?: string
): Promise<ClaudeMatch[]> {
  if (videos.length === 0) return []

  const videoDescriptions = videos
    .map((v) => {
      const tagStr = v.tags && v.tags.length > 0 ? v.tags.join(', ') : 'none'
      return `VIDEO_ID: ${v.id}\nPLATFORM: ${v.platform}\nTITLE: ${v.title}\nTAGS: ${tagStr}\nDURATION: ${v.duration ?? 'unknown'}`
    })
    .join('\n\n---\n\n')

  const topicLine = topic ? `\nSEGMENT TOPIC: "${topic}"\n` : ''

  const prompt = `You are a video research assistant helping a content creator find B-roll stock footage.

SCRIPT SEGMENT (what the creator is narrating):
"${segmentText}"${topicLine}

Below are stock footage clips. Each clip is described by its title and tags — there is no transcript since these are silent stock clips.

For each clip, score how visually relevant it is to the script segment — meaning: would this footage work well as B-roll playing while the creator narrates those words?

CRITICAL SCORING RULE — WRONG SPORT/ACTIVITY PENALTY:
If the script segment describes a specific sport or physical activity (e.g. American football, basketball, soccer, rugby, swimming, boxing), and a clip clearly shows a DIFFERENT sport or activity, score it 0.1 or lower — no exceptions. Showing the wrong sport as B-roll is worse than having no footage at all. For example: if the segment is about American football but the video shows rugby players, score it ≤ 0.1.

Score 1.0 = perfect visual match for this narration
Score 0.7–0.9 = strong match — clearly shows the right activity/context
Score 0.4–0.6 = partial match — related theme but not a great fit
Score 0.1–0.3 = weak or misleading match
Score 0.0–0.1 = wrong activity/sport, or completely unrelated

Return ONLY a valid JSON array. No markdown, no explanation. Each object must have:
- videoId (string)
- relevanceScore (number, 0.0–1.0)
- reason (string, 1 sentence max — explain what visual content makes it relevant or irrelevant, and flag if it shows the WRONG sport/activity)

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
  videos: VideoResult[],
  topic?: string
): Promise<VideoResult[]> {
  if (videos.length === 0) return []

  let matches: ClaudeMatch[] = []
  try {
    matches = await matchMetadataWithClaude(segmentText, videos, topic)
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
