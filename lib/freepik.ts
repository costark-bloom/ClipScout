import type { VideoResult } from './types'

interface FreepikResource {
  id: number
  title: string
  url: string
  author?: { name: string; avatar?: string }
  thumbnails?: { url: string; width: number; height: number }[]
  preview?: { url: string }
  tags?: { name: string }[]
}

interface FreepikResponse {
  data: FreepikResource[]
}

export async function searchFreepik(
  query: string,
  apiKey: string,
  maxResults = 5
): Promise<VideoResult[]> {
  try {
    const params = new URLSearchParams({
      term: query,
      'filters[content_type][video]': '1',
      limit: String(maxResults),
      locale: 'en-US',
    })

    const res = await fetch(`https://api.freepik.com/v1/resources?${params}`, {
      headers: {
        'x-freepik-api-key': apiKey,
        Accept: 'application/json',
      },
    })

    if (!res.ok) {
      console.warn(`[freepik] API error: ${res.status}`)
      return []
    }

    const data: FreepikResponse = await res.json()
    if (!Array.isArray(data?.data)) return []

    return data.data.map((item) => {
      const thumbnail = item.thumbnails?.[0]?.url ?? ''
      const tags = item.tags?.map((t) => t.name) ?? []

      return {
        id: `freepik_${item.id}`,
        title: item.title,
        thumbnailUrl: thumbnail,
        sourceUrl: item.url,
        embedUrl: item.preview?.url,
        platform: 'freepik' as const,
        license: 'royalty-free' as const,
        channelOrAuthor: item.author?.name,
        tags,
      }
    })
  } catch (err) {
    console.warn('[freepik] Search failed:', err)
    return []
  }
}
