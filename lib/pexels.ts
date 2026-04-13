import type { VideoResult } from './types'

interface PexelsVideoFile {
  quality: string
  link: string
  file_type: string
}

interface PexelsVideo {
  id: number
  url: string
  image: string
  duration: number
  user: { name: string }
  video_files: PexelsVideoFile[]
}

interface PexelsResponse {
  videos: PexelsVideo[]
}

export async function searchPexels(query: string, perPage = 5): Promise<VideoResult[]> {
  const apiKey = process.env.PEXELS_API_KEY
  if (!apiKey) {
    console.warn('PEXELS_API_KEY not set, skipping Pexels search')
    return []
  }

  const params = new URLSearchParams({
    query,
    per_page: String(perPage),
  })

  const res = await fetch(`https://api.pexels.com/videos/search?${params}`, {
    headers: { Authorization: apiKey },
  })

  if (!res.ok) {
    console.error(`Pexels API error: ${res.status}`)
    return []
  }

  const data: PexelsResponse = await res.json()
  if (!data.videos) return []

  return data.videos.map((video) => {
    const minutes = Math.floor(video.duration / 60)
    const seconds = video.duration % 60
    const duration = `${minutes}:${String(seconds).padStart(2, '0')}`

    // Skip first ~10% of stock footage to avoid fade-ins, max 3s offset
    const startTimestamp = video.duration > 10 ? Math.min(Math.round(video.duration * 0.1), 3) : 0

    // Extract keywords from the Pexels URL slug (e.g. "person-walking-in-rain" → ["person", "walking", "rain"])
    const slugMatch = video.url.match(/\/video\/([^/]+)\//)
    const tags = slugMatch
      ? slugMatch[1].split('-').filter((w: string) => w.length > 2)
      : []

    // Use direct MP4 file URL for preview — the Pexels iframe player blocks cross-origin embedding
    const hdFile = video.video_files.find((f) => f.quality === 'hd' && f.file_type === 'video/mp4')
    const sdFile = video.video_files.find((f) => f.quality === 'sd' && f.file_type === 'video/mp4')
    const anyFile = video.video_files.find((f) => f.file_type === 'video/mp4') ?? video.video_files[0]
    const embedUrl = (hdFile ?? sdFile ?? anyFile)?.link

    return {
      id: `px_${video.id}`,
      title: tags.length > 0
        ? tags.map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') + ' — Pexels'
        : `Pexels Video #${video.id}`,
      thumbnailUrl: video.image,
      sourceUrl: video.url,
      embedUrl,
      platform: 'pexels' as const,
      license: 'royalty-free' as const,
      duration,
      durationSeconds: video.duration,
      channelOrAuthor: video.user.name,
      startTimestamp,
      tags,
    }
  })
}
