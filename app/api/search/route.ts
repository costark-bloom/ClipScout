import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { searchYouTube } from '@/lib/youtube'
import { searchPexels } from '@/lib/pexels'
import { searchPixabay } from '@/lib/pixabay'
import { searchFreepik } from '@/lib/freepik'
import { enrichWithTranscripts } from '@/lib/transcript-matcher'
import { enrichWithMetadata } from '@/lib/metadata-matcher'
import { generateFallbackQueries } from '@/lib/claude'
import { supabase } from '@/lib/supabase'
import type { ScriptSegment, SearchResults, VideoResult, VideoOrientation } from '@/lib/types'

const MAX_PER_SOURCE = 3
const MAX_PER_SEGMENT = 12

function deduplicateByUrl(videos: VideoResult[]): VideoResult[] {
  const seen = new Set<string>()
  return videos.filter((v) => {
    if (seen.has(v.sourceUrl)) return false
    seen.add(v.sourceUrl)
    return true
  })
}

async function searchForSegment(
  segment: ScriptSegment,
  freepikApiKey?: string,
  orientation: VideoOrientation = 'both'
): Promise<SearchResults> {
  const queries = segment.searchQueries.slice(0, 3)

  // Run all queries across all platforms concurrently.
  // For vertical mode, request more Pixabay results to compensate for its sparse portrait library.
  const pixabayPerPage = orientation === 'vertical' ? 12 : 5
  const allPromises = queries.flatMap((query) => [
    searchPexels(query, 5, orientation).catch(() => [] as VideoResult[]),
    searchPixabay(query, pixabayPerPage, orientation).catch(() => [] as VideoResult[]),
    searchYouTube(query, 5).catch(() => [] as VideoResult[]),
    freepikApiKey
      ? searchFreepik(query, freepikApiKey, 5).catch(() => [] as VideoResult[])
      : Promise.resolve([] as VideoResult[]),
  ])

  const allResults = await Promise.all(allPromises)

  const pexelsResults: VideoResult[] = []
  const pixabayResults: VideoResult[] = []
  const youtubeResults: VideoResult[] = []
  const freepikResults: VideoResult[] = []

  allResults.forEach((results, idx) => {
    const platformIdx = idx % 4
    if (platformIdx === 0) pexelsResults.push(...results)
    else if (platformIdx === 1) pixabayResults.push(...results)
    else if (platformIdx === 2) youtubeResults.push(...results)
    else freepikResults.push(...results)
  })

  const dedupedPexels = deduplicateByUrl(pexelsResults).slice(0, MAX_PER_SOURCE)
  const dedupedPixabay = deduplicateByUrl(pixabayResults).slice(0, MAX_PER_SOURCE)
  const dedupedYoutube = deduplicateByUrl(youtubeResults).slice(0, MAX_PER_SOURCE)
  const dedupedFreepik = deduplicateByUrl(freepikResults).slice(0, MAX_PER_SOURCE)

  // Enrich all stock sources (Pexels + Pixabay + Freepik) in one Claude call, passing topic for sport-mismatch detection
  const allStock = [...dedupedPexels, ...dedupedPixabay, ...dedupedFreepik]
  const [enrichedStock, transcriptEnriched] = await Promise.all([
    enrichWithMetadata(segment.text, allStock, segment.topic).catch(() => allStock),
    enrichWithTranscripts(segment.text, dedupedYoutube).catch(() => dedupedYoutube),
  ])

  const enrichedPexels = enrichedStock.filter((v) => v.platform === 'pexels')
  const enrichedPixabay = enrichedStock.filter((v) => v.platform === 'pixabay')
  const enrichedFreepik = enrichedStock.filter((v) => v.platform === 'freepik')

  // Fall back to metadata scoring for any YouTube videos that didn't get transcript scores
  const unscoredYoutube = transcriptEnriched.filter((v) => v.relevanceScore === undefined)
  const scoredYoutube = transcriptEnriched.filter((v) => v.relevanceScore !== undefined)
  const metadataFallback = unscoredYoutube.length > 0
    ? await enrichWithMetadata(segment.text, unscoredYoutube, segment.topic).catch(() => unscoredYoutube)
    : []
  const enrichedYoutube = [...scoredYoutube, ...metadataFallback]

  // Filter out results with very low relevance scores (< 0.2)
  const filterLowRelevance = (videos: VideoResult[]) =>
    videos.filter((v) => v.relevanceScore === undefined || v.relevanceScore >= 0.2)

  const filteredStock = [
    ...filterLowRelevance(enrichedPexels),
    ...filterLowRelevance(enrichedPixabay),
    ...filterLowRelevance(enrichedFreepik),
  ]
  const filteredYoutube = filterLowRelevance(enrichedYoutube)

  // Cascading fallback: if all stock results are poor quality, try simplified visual queries
  const maxStockScore = Math.max(...filteredStock.map((v) => v.relevanceScore ?? 0), 0)
  let finalStock = filteredStock

  if (maxStockScore < 0.35 && allStock.length > 0) {
    console.log(`[search] poor stock results (max score ${maxStockScore.toFixed(2)}) for "${segment.topic}" — running fallback queries`)
    const fallbackQueries = await generateFallbackQueries(segment.text, segment.topic).catch(() => [] as string[])

    if (fallbackQueries.length > 0) {
      const fallbackPromises = fallbackQueries.flatMap((query) => [
        searchPexels(query, 5, orientation).catch(() => [] as VideoResult[]),
        searchPixabay(query, pixabayPerPage, orientation).catch(() => [] as VideoResult[]),
        freepikApiKey
          ? searchFreepik(query, freepikApiKey, 5).catch(() => [] as VideoResult[])
          : Promise.resolve([] as VideoResult[]),
      ])
      const fallbackResults = await Promise.all(fallbackPromises)
      const fallbackFlat = fallbackResults.flat()

      // Exclude videos we already tried
      const existingUrls = new Set(allStock.map((v) => v.sourceUrl))
      const newVideos = deduplicateByUrl(fallbackFlat.filter((v) => !existingUrls.has(v.sourceUrl)))

      if (newVideos.length > 0) {
        const enrichedFallback = await enrichWithMetadata(segment.text, newVideos, segment.topic).catch(() => newVideos)
        const filteredFallback = filterLowRelevance(enrichedFallback)
        console.log(`[search] fallback found ${filteredFallback.length} usable new results for "${segment.topic}"`)
        // Merge: put fallback results alongside original, then sort
        finalStock = [...filteredStock, ...filteredFallback]
      }
    }
  }

  // Combine all platforms and sort by relevance score descending
  const combined = [
    ...finalStock,
    ...filteredYoutube,
  ].sort((a, b) => (b.relevanceScore ?? -1) - (a.relevanceScore ?? -1))

  return {
    segmentId: segment.id,
    videos: combined.slice(0, MAX_PER_SEGMENT),
  }
}

// Process items with a max concurrency limit to avoid rate limiting
async function withConcurrencyLimit<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<SearchResults>
): Promise<SearchResults[]> {
  const results: SearchResults[] = []
  for (let i = 0; i < items.length; i += limit) {
    const batch = items.slice(i, i + limit)
    const batchResults = await Promise.all(batch.map(fn))
    results.push(...batchResults)
  }
  return results
}

export const maxDuration = 120 // allow up to 2 minutes for large scripts

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { segments, orientation = 'both' } = body as { segments: unknown; orientation?: VideoOrientation }

    if (!Array.isArray(segments)) {
      return NextResponse.json({ error: 'segments array is required' }, { status: 400 })
    }

    if (segments.length === 0) {
      return NextResponse.json({ results: [] })
    }

    // Look up user's Freepik key if they're signed in
    let freepikApiKey: string | undefined
    try {
      const session = await getServerSession(authOptions)
      if (session?.user?.email) {
        const { data } = await supabase
          .from('user_settings')
          .select('freepik_api_key')
          .eq('user_email', session.user.email)
          .single()
        freepikApiKey = data?.freepik_api_key ?? undefined
        if (freepikApiKey) {
          console.log('[search] Freepik key found — including Freepik results')
        }
      }
    } catch {
      // Non-fatal — proceed without Freepik
    }

    // Process max 3 segments concurrently
    const results = await withConcurrencyLimit(
      segments as ScriptSegment[],
      3,
      (segment) => searchForSegment(segment, freepikApiKey, orientation)
    )

    return NextResponse.json({ results })
  } catch (error) {
    console.error('Search route error:', error)
    const message = error instanceof Error ? error.message : 'Failed to search videos'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
