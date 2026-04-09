import type { VideoResult } from './types'

interface YouTubeSearchItem {
  id: { videoId: string }
  snippet: {
    title: string
    channelTitle: string
    thumbnails: {
      high?: { url: string }
      medium?: { url: string }
      default?: { url: string }
    }
  }
}

interface YouTubeSearchResponse {
  items: YouTubeSearchItem[]
}

interface YouTubeVideoItem {
  id: string
  snippet: { description: string }
  contentDetails: { duration: string }
}

interface YouTubeVideoResponse {
  items: YouTubeVideoItem[]
}

// Parse ISO 8601 duration (PT1H2M3S) to seconds
function parseDuration(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return 0
  return (parseInt(match[1] ?? '0') * 3600) +
    (parseInt(match[2] ?? '0') * 60) +
    parseInt(match[3] ?? '0')
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

// Extract chapters from a YouTube description. Returns [{title, seconds}]
function parseChapters(description: string): { title: string; seconds: number }[] {
  const lines = description.split('\n')
  const chapters: { title: string; seconds: number }[] = []
  const timeRegex = /(?:^|\s)(\d{1,2}):(\d{2})(?::(\d{2}))?\s+(.+)/

  for (const line of lines) {
    const match = line.match(timeRegex)
    if (match) {
      const h = match[3] ? parseInt(match[1]) : 0
      const m = match[3] ? parseInt(match[2]) : parseInt(match[1])
      const s = match[3] ? parseInt(match[3]) : parseInt(match[2])
      const title = (match[4] || match[3] || '').trim()
      chapters.push({ title, seconds: h * 3600 + m * 60 + s })
    }
  }
  return chapters
}

// Find the best chapter for a given search query
function bestChapterTimestamp(
  chapters: { title: string; seconds: number }[],
  query: string
): number {
  if (chapters.length === 0) return 0
  const queryWords = query.toLowerCase().split(/\s+/)
  let bestScore = -1
  let bestSeconds = 0

  for (const chapter of chapters) {
    const score = queryWords.filter((w) =>
      chapter.title.toLowerCase().includes(w)
    ).length
    if (score > bestScore) {
      bestScore = score
      bestSeconds = chapter.seconds
    }
  }
  return bestSeconds
}

// Track quota-exhausted keys in memory — persists for the lifetime of the server process
const exhaustedKeys = new Set<string>()

// Returns available YouTube API keys in order, skipping exhausted ones
function getApiKeys(): string[] {
  return [
    process.env.YOUTUBE_API_KEY,
    process.env.YOUTUBE_API_KEY_2,
    process.env.YOUTUBE_API_KEY_3,
  ].filter((k): k is string => typeof k === 'string' && !exhaustedKeys.has(k))
}

// Try each API key in order, rotating on 403 quota errors
async function fetchWithKeyRotation(buildUrl: (key: string) => string): Promise<Response | null> {
  const keys = getApiKeys()
  if (keys.length === 0) {
    console.error('[youtube] All API keys exhausted or quota exceeded')
    return null
  }
  for (const key of keys) {
    const res = await fetch(buildUrl(key))
    if (res.ok) return res
    if (res.status === 403) {
      console.warn(`[youtube] Key ending in ...${key.slice(-6)} hit quota/403, marking exhausted`)
      exhaustedKeys.add(key)
      continue
    }
    // Non-403 error — don't retry with another key
    console.error(`[youtube] API error: ${res.status}`)
    return null
  }
  console.error('[youtube] All API keys exhausted or quota exceeded')
  return null
}

export async function searchYouTube(query: string, maxResults = 5): Promise<VideoResult[]> {
  const keys = getApiKeys()
  if (keys.length === 0) {
    console.warn('No YOUTUBE_API_KEY set, skipping YouTube search')
    return []
  }

  const res = await fetchWithKeyRotation((key) => {
    const searchParams = new URLSearchParams({
      part: 'snippet',
      type: 'video',
      videoEmbeddable: 'true',
      maxResults: String(maxResults),
      q: query,
      key,
    })
    return `https://www.googleapis.com/youtube/v3/search?${searchParams}`
  })

  if (!res) return []

  const data: YouTubeSearchResponse = await res.json()
  if (!data.items || data.items.length === 0) return []

  // Fetch video details (duration + full description for chapters) in one batch call
  const videoIds = data.items.map((i) => i.id.videoId).join(',')
  let detailMap: Record<string, YouTubeVideoItem> = {}
  try {
    const detailRes = await fetchWithKeyRotation((key) => {
      const detailParams = new URLSearchParams({
        part: 'snippet,contentDetails',
        id: videoIds,
        key,
      })
      return `https://www.googleapis.com/youtube/v3/videos?${detailParams}`
    })
    if (detailRes) {
      const detailData: YouTubeVideoResponse = await detailRes.json()
      for (const item of detailData.items ?? []) {
        detailMap[item.id] = item
      }
    }
  } catch {
    // Non-fatal — we'll just skip chapter/duration enrichment
  }

  return data.items.map((item) => {
    const videoId = item.id.videoId
    const thumbnail =
      item.snippet.thumbnails.high?.url ||
      item.snippet.thumbnails.medium?.url ||
      item.snippet.thumbnails.default?.url ||
      ''

    const detail = detailMap[videoId]
    const durationSeconds = detail ? parseDuration(detail.contentDetails.duration) : undefined
    const duration = durationSeconds !== undefined ? formatDuration(durationSeconds) : undefined

    // Find best chapter timestamp from video description
    let startTimestamp = 0
    if (detail?.snippet?.description) {
      const chapters = parseChapters(detail.snippet.description)
      startTimestamp = bestChapterTimestamp(chapters, query)
    }

    return {
      id: `yt_${videoId}`,
      title: item.snippet.title,
      thumbnailUrl: thumbnail,
      sourceUrl: `https://www.youtube.com/watch?v=${videoId}&t=${startTimestamp}s`,
      embedUrl: `https://www.youtube.com/embed/${videoId}`,
      platform: 'youtube' as const,
      duration,
      durationSeconds,
      channelOrAuthor: item.snippet.channelTitle,
      startTimestamp,
    }
  })
}
