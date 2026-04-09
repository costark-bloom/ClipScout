import { NextRequest, NextResponse } from 'next/server'
import { searchYouTube } from '@/lib/youtube'
import { searchPexels } from '@/lib/pexels'
import { searchPixabay } from '@/lib/pixabay'
import { enrichWithTranscripts } from '@/lib/transcript-matcher'
import { enrichWithMetadata } from '@/lib/metadata-matcher'
import type { ScriptSegment, SearchResults, VideoResult } from '@/lib/types'

const MAX_PER_SOURCE = 4
const MAX_PER_SEGMENT = 12

function deduplicateByUrl(videos: VideoResult[]): VideoResult[] {
  const seen = new Set<string>()
  return videos.filter((v) => {
    if (seen.has(v.sourceUrl)) return false
    seen.add(v.sourceUrl)
    return true
  })
}

async function searchForSegment(segment: ScriptSegment): Promise<SearchResults> {
  const queries = segment.searchQueries.slice(0, 3)

  // Run all queries across all platforms concurrently
  const allPromises = queries.flatMap((query) => [
    searchPexels(query, 5).catch(() => [] as VideoResult[]),
    searchPixabay(query, 5).catch(() => [] as VideoResult[]),
    searchYouTube(query, 5).catch(() => [] as VideoResult[]),
  ])

  const allResults = await Promise.all(allPromises)

  const pexelsResults: VideoResult[] = []
  const pixabayResults: VideoResult[] = []
  const youtubeResults: VideoResult[] = []

  allResults.forEach((results, idx) => {
    const platformIdx = idx % 3
    if (platformIdx === 0) pexelsResults.push(...results)
    else if (platformIdx === 1) pixabayResults.push(...results)
    else youtubeResults.push(...results)
  })

  const dedupedPexels = deduplicateByUrl(pexelsResults).slice(0, MAX_PER_SOURCE)
  const dedupedPixabay = deduplicateByUrl(pixabayResults).slice(0, MAX_PER_SOURCE)
  const dedupedYoutube = deduplicateByUrl(youtubeResults).slice(0, MAX_PER_SOURCE)

  // Combine Pexels + Pixabay into one Claude call, run alongside transcript enrichment
  const allStock = [...dedupedPexels, ...dedupedPixabay]
  const [enrichedStock, transcriptEnriched] = await Promise.all([
    enrichWithMetadata(segment.text, allStock).catch(() => allStock),
    enrichWithTranscripts(segment.text, dedupedYoutube).catch(() => dedupedYoutube),
  ])

  const enrichedPexels = enrichedStock.filter((v) => v.platform === 'pexels')
  const enrichedPixabay = enrichedStock.filter((v) => v.platform === 'pixabay')

  // Fall back to metadata scoring for any YouTube videos that didn't get transcript scores
  const unscoredYoutube = transcriptEnriched.filter((v) => v.relevanceScore === undefined)
  const scoredYoutube = transcriptEnriched.filter((v) => v.relevanceScore !== undefined)
  const metadataFallback = unscoredYoutube.length > 0
    ? await enrichWithMetadata(segment.text, unscoredYoutube).catch(() => unscoredYoutube)
    : []
  const enrichedYoutube = [...scoredYoutube, ...metadataFallback]

  // Filter out results with very low relevance scores (< 0.2)
  const filterLowRelevance = (videos: VideoResult[]) =>
    videos.filter((v) => v.relevanceScore === undefined || v.relevanceScore >= 0.2)

  // Combine all platforms and sort by relevance score descending
  // Videos without a score (enrichment failed) go to the end
  const combined = [
    ...filterLowRelevance(enrichedPexels),
    ...filterLowRelevance(enrichedPixabay),
    ...filterLowRelevance(enrichedYoutube),
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
    const { segments } = body

    if (!Array.isArray(segments)) {
      return NextResponse.json({ error: 'segments array is required' }, { status: 400 })
    }

    if (segments.length === 0) {
      return NextResponse.json({ results: [] })
    }

    // Process max 2 segments concurrently to avoid overwhelming Claude API
    const results = await withConcurrencyLimit(
      segments as ScriptSegment[],
      2,
      searchForSegment
    )

    return NextResponse.json({ results })
  } catch (error) {
    console.error('Search route error:', error)
    const message = error instanceof Error ? error.message : 'Failed to search videos'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
