import Anthropic from '@anthropic-ai/sdk'
import type { VideoResult } from './types'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

interface TranscriptLine {
  text: string
  offset: number  // milliseconds
  duration: number
}

interface VideoTranscript {
  videoId: string
  title: string
  lines: TranscriptLine[]
}

interface ClaudeMatch {
  videoId: string
  relevanceScore: number   // 0.0 – 1.0
  startTimestamp: number   // seconds
  reason: string           // short explanation shown in UI
  transcriptSnippet: string // the matching transcript text
}

// Format transcript lines into a readable string with timestamps
function formatTranscript(lines: TranscriptLine[], maxWords = 600): string {
  let wordCount = 0
  const parts: string[] = []

  for (const line of lines) {
    const seconds = Math.floor(line.offset / 1000)
    const m = Math.floor(seconds / 60)
    const s = String(seconds % 60).padStart(2, '0')
    const text = line.text.replace(/\n/g, ' ').trim()
    parts.push(`[${m}:${s}] ${text}`)
    wordCount += text.split(/\s+/).length
    if (wordCount >= maxWords) break
  }

  return parts.join('\n')
}

// Fetch transcript via Supadata — works from cloud servers unlike youtube-transcript
async function fetchTranscript(videoId: string): Promise<TranscriptLine[] | null> {
  const apiKey = process.env.SUPADATA_API_KEY
  if (!apiKey) {
    console.warn('[transcript] SUPADATA_API_KEY not set, skipping transcript fetch')
    return null
  }

  try {
    const res = await Promise.race([
      fetch(`https://api.supadata.ai/v1/youtube/transcript?videoId=${videoId}&lang=en`, {
        headers: { 'x-api-key': apiKey },
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 8000)
      ),
    ])

    if (!res.ok) {
      console.warn(`[transcript] Supadata ${res.status} for ${videoId}`)
      return null
    }

    const data = await res.json()
    if (!Array.isArray(data.content)) return null

    return data.content as TranscriptLine[]
  } catch {
    return null
  }
}

// Ask Claude to score and timestamp-match all transcripts against the script segment
async function matchTranscriptsWithClaude(
  segmentText: string,
  transcripts: VideoTranscript[]
): Promise<ClaudeMatch[]> {
  if (transcripts.length === 0) return []

  const transcriptBlocks = transcripts
    .map((t) => {
      const formatted = formatTranscript(t.lines)
      return `VIDEO_ID: ${t.videoId}\nTITLE: ${t.title}\nTRANSCRIPT:\n${formatted}`
    })
    .join('\n\n---\n\n')

  const prompt = `You are a video research assistant helping a content creator find B-roll footage.

SCRIPT SEGMENT (what the creator is narrating):
"${segmentText}"

Below are transcripts from YouTube videos found by searching for this segment. For each video:
1. Score how visually relevant it is to the script segment (0.0 = completely irrelevant, 1.0 = perfect match)
2. Find the timestamp (in seconds) where the most relevant moment occurs
3. Write a 1-sentence reason explaining why it matches (or doesn't)
4. Quote the exact transcript line that best matches

Return ONLY a valid JSON array. No markdown, no explanation. Each object must have:
- videoId (string)
- relevanceScore (number, 0.0–1.0)
- startTimestamp (number, seconds)
- reason (string, 1 sentence)
- transcriptSnippet (string, the matching line quoted verbatim)

${transcriptBlocks}`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
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

// Main export — enriches YouTube VideoResults with transcript-based relevance + timestamps
export async function enrichWithTranscripts(
  segmentText: string,
  youtubeResults: VideoResult[]
): Promise<VideoResult[]> {
  if (youtubeResults.length === 0) return []

  // Fetch all transcripts in parallel
  const transcriptResults = await Promise.all(
    youtubeResults.map(async (video) => {
      const rawId = video.id.replace('yt_', '')
      const lines = await fetchTranscript(rawId)
      return { video, videoId: rawId, lines }
    })
  )

  const withTranscripts: VideoTranscript[] = transcriptResults
    .filter((r) => r.lines !== null && r.lines!.length > 0)
    .map((r) => ({
      videoId: r.videoId,
      title: r.video.title,
      lines: r.lines!,
    }))

  const withoutTranscripts = transcriptResults
    .filter((r) => r.lines === null || r.lines!.length === 0)
    .map((r) => r.video)

  if (withTranscripts.length === 0) {
    return youtubeResults // No transcripts available, return as-is
  }

  // One Claude call for all transcripts vs. this segment
  const matches = await matchTranscriptsWithClaude(segmentText, withTranscripts)

  const matchMap = new Map<string, ClaudeMatch>()
  for (const m of matches) matchMap.set(m.videoId, m)

  // Enrich videos that had transcripts
  const enriched: VideoResult[] = transcriptResults
    .filter((r) => r.lines !== null && r.lines!.length > 0)
    .map((r) => {
      const match = matchMap.get(r.videoId)
      if (!match) return r.video

      return {
        ...r.video,
        relevanceScore: match.relevanceScore,
        startTimestamp: match.startTimestamp,
        transcriptSnippet: match.transcriptSnippet,
        transcriptReason: match.reason,
        // Update source URL with accurate timestamp
        sourceUrl: `https://www.youtube.com/watch?v=${r.videoId}&t=${match.startTimestamp}s`,
      }
    })

  // Sort by relevance score descending, then append videos without transcripts
  const sorted = enriched.sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0))

  return [...sorted, ...withoutTranscripts]
}
