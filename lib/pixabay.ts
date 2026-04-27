import type { VideoResult, VideoOrientation } from './types'

interface PixabayVideoSizes {
  large?: { url: string; width: number; height: number; size: number }
  medium?: { url: string; width: number; height: number; size: number }
  small?: { url: string; width: number; height: number; size: number }
  tiny?: { url: string; width: number; height: number; size: number }
}

interface PixabayHit {
  id: number
  pageURL: string
  picture_id: string
  user: string
  duration: number
  videos: PixabayVideoSizes
  tags: string
}

interface PixabayResponse {
  hits: PixabayHit[]
}

export async function searchPixabay(query: string, perPage = 5, orientation: VideoOrientation = 'both'): Promise<VideoResult[]> {
  const apiKey = process.env.PIXABAY_API_KEY
  if (!apiKey) {
    console.warn('PIXABAY_API_KEY not set, skipping Pixabay search')
    return []
  }

  const params = new URLSearchParams({
    key: apiKey,
    q: query,
    per_page: String(perPage),
    video_type: 'all',
  })

  const res = await fetch(`https://pixabay.com/api/videos/?${params}`)
  if (!res.ok) {
    console.error(`Pixabay API error: ${res.status}`)
    return []
  }

  const data: PixabayResponse = await res.json()
  if (!data.hits) return []

  // Resolve the best available thumbnail URL for a Pixabay hit.
  // Vimeo CDN hosts the thumbnails — try the 640x360 variant first, then fall back to 295x166.
  async function resolveThumbnail(pictureId: string): Promise<string | null> {
    const candidates = [
      `https://i.vimeocdn.com/video/${pictureId}_640x360.jpg`,
      `https://i.vimeocdn.com/video/${pictureId}_295x166.jpg`,
    ]
    for (const url of candidates) {
      try {
        const res = await Promise.race([
          fetch(url, { method: 'HEAD' }),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 1500)),
        ])
        if (res.ok) return url
      } catch {
        // try next candidate
      }
    }
    return null
  }

  // Resolve thumbnails in parallel, then filter out hits with no valid thumbnail
  const resolved = await Promise.all(
    data.hits.map(async (hit) => ({
      hit,
      thumbnailUrl: await resolveThumbnail(hit.picture_id),
    }))
  )

  return resolved
    .filter(({ thumbnailUrl, hit }) => {
      if (thumbnailUrl === null) return false
      // Filter by orientation using medium (or largest available) video dimensions
      if (orientation !== 'both') {
        const dims =
          hit.videos.medium ??
          hit.videos.large ??
          hit.videos.small ??
          hit.videos.tiny
        if (dims) {
          const isPortrait = dims.height > dims.width
          if (orientation === 'vertical' && !isPortrait) return false
          if (orientation === 'horizontal' && isPortrait) return false
        }
      }
      return true
    })
    .map(({ hit, thumbnailUrl }) => {
      const embedUrl =
        hit.videos.medium?.url ||
        hit.videos.large?.url ||
        hit.videos.small?.url ||
        hit.videos.tiny?.url

      const minutes = Math.floor(hit.duration / 60)
      const seconds = hit.duration % 60
      const duration = `${minutes}:${String(seconds).padStart(2, '0')}`

      const startTimestamp = hit.duration > 10 ? Math.min(Math.round(hit.duration * 0.1), 3) : 0

      const tagList = hit.tags
        ? hit.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
        : []

      return {
        id: `pbay_${hit.id}`,
        title: tagList.length > 0
          ? `${tagList[0]} — Pixabay`
          : `Pixabay Video #${hit.id}`,
        thumbnailUrl: thumbnailUrl!,
        sourceUrl: hit.pageURL,
        embedUrl,
        platform: 'pixabay' as const,
        license: 'royalty-free' as const,
        duration,
        durationSeconds: hit.duration,
        channelOrAuthor: hit.user,
        startTimestamp,
        tags: tagList,
      }
    })
}
