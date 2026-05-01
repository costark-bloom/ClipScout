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

  return data.hits
    .filter((hit) => {
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
    .map((hit) => {
      // Prefer the 640x360 thumbnail; broken images handled client-side via onError
      const thumbnailUrl = `https://i.vimeocdn.com/video/${hit.picture_id}_640x360.jpg`
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
        thumbnailUrl,
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
