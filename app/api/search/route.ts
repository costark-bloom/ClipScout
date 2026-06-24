import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { searchYouTube, type YouTubeLicenseMode } from '@/lib/youtube'
import { searchPexels } from '@/lib/pexels'
import { searchPixabay } from '@/lib/pixabay'
import { searchFreepik } from '@/lib/freepik'
import { enrichWithTranscripts } from '@/lib/transcript-matcher'
import { enrichWithMetadata } from '@/lib/metadata-matcher'
import { generateFallbackQueries, prepareKeywordForSearch } from '@/lib/claude'
import { deductCredit } from '@/lib/credits'
import { getSubscriptionAccess } from '@/lib/access'
import { supabase } from '@/lib/supabase'
import type { ScriptSegment, SearchResults, VideoResult, VideoOrientation, VideoSource } from '@/lib/types'
import { ALL_VIDEO_SOURCES } from '@/lib/types'

/**
 * Decides the YouTube license fetch mode given the user's selected sources.
 * Returns null if YouTube should be skipped entirely.
 */
function youtubeModeFor(sources: VideoSource[]): YouTubeLicenseMode | null {
  const wantsCc = sources.includes('youtube_cc')
  const wantsStandard = sources.includes('youtube_protected')
  if (wantsCc && wantsStandard) return 'all'
  if (wantsCc) return 'cc'
  if (wantsStandard) return 'standard'
  return null
}

const MAX_PER_SOURCE = 3
const MAX_PER_SOURCE_LITERAL = 8  // brand/person/place searches deserve more candidates
const MAX_PER_SEGMENT = 12

function deduplicateByUrl(videos: VideoResult[]): VideoResult[] {
  const seen = new Set<string>()
  return videos.filter((v) => {
    if (seen.has(v.sourceUrl)) return false
    seen.add(v.sourceUrl)
    return true
  })
}

/**
 * For literal-match segments, only keep videos whose title or tags mention the
 * entity. Generic same-category clips that don't reference the entity by name
 * are misleading B-roll — better to show nothing than to show "Burger King"
 * footage for an "Arby's" search.
 */
function filterByEntityReference(videos: VideoResult[], entityName: string): VideoResult[] {
  // Strip punctuation for fuzzy matching: "Arby's" → "arbys", "Tesla Model 3" → "tesla model 3"
  const needle = entityName.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim()
  if (!needle) return videos
  return videos.filter((v) => {
    const haystack = [v.title, ...(v.tags ?? [])]
      .join(' ')
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, ' ')
    return haystack.includes(needle)
  })
}

async function searchForSegment(
  segment: ScriptSegment,
  freepikApiKey?: string,
  orientation: VideoOrientation = 'both',
  enabledSources: VideoSource[] = ALL_VIDEO_SOURCES
): Promise<SearchResults> {
  const queries = segment.searchQueries.slice(0, 3)

  // Resolve which APIs to actually hit. Disabled sources cost zero API
  // quota and return an empty array placeholder so downstream indexing stays stable.
  const pexelsOn = enabledSources.includes('pexels')
  const pixabayOn = enabledSources.includes('pixabay')
  const ytMode = youtubeModeFor(enabledSources)
  // YouTube "standard" mode has no API-level filter — over-fetch and drop CC.
  const ytFetchCount = ytMode === 'standard' ? 10 : 5

  // For vertical mode, request more Pixabay results to compensate for its sparse portrait library.
  const pixabayPerPage = orientation === 'vertical' ? 12 : 5
  const allPromises = queries.flatMap((query) => [
    pexelsOn
      ? searchPexels(query, 5, orientation).catch(() => [] as VideoResult[])
      : Promise.resolve([] as VideoResult[]),
    pixabayOn
      ? searchPixabay(query, pixabayPerPage, orientation).catch(() => [] as VideoResult[])
      : Promise.resolve([] as VideoResult[]),
    ytMode
      ? searchYouTube(query, ytFetchCount, ytMode).catch(() => [] as VideoResult[])
      : Promise.resolve([] as VideoResult[]),
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

  // For literal-match segments (brands, people, sports teams, places), apply a
  // deterministic entity-name filter BEFORE the per-source cap. This way we keep
  // the top brand-matching results instead of arbitrary first-N.
  let processedPexels = deduplicateByUrl(pexelsResults)
  let processedPixabay = deduplicateByUrl(pixabayResults)
  let processedYoutube = deduplicateByUrl(youtubeResults)
  let processedFreepik = deduplicateByUrl(freepikResults)

  const perSourceCap = segment.requiresLiteralMatch ? MAX_PER_SOURCE_LITERAL : MAX_PER_SOURCE

  if (segment.requiresLiteralMatch) {
    const entityName = segment.topic || segment.text
    const beforePex = processedPexels.length
    const beforePix = processedPixabay.length
    const beforeFp = processedFreepik.length
    // Strict filter for stock libraries — they genuinely don't carry trademarked
    // content, so anything that comes back without the entity name is generic noise.
    processedPexels = filterByEntityReference(processedPexels, entityName)
    processedPixabay = filterByEntityReference(processedPixabay, entityName)
    processedFreepik = filterByEntityReference(processedFreepik, entityName)
    // DON'T filter YouTube — its search algorithm + Claude scoring handles relevance
    // well, and the title-match filter is too strict (titles often describe the action,
    // e.g. "Drive-thru without a car" instead of mentioning the brand explicitly).
    console.log(
      `[search] literal-match entity-filter for "${entityName}": ` +
      `Pexels ${processedPexels.length}/${beforePex}, ` +
      `Pixabay ${processedPixabay.length}/${beforePix}, ` +
      `YouTube ${processedYoutube.length} (unfiltered — relies on Claude scoring), ` +
      `Freepik ${processedFreepik.length}/${beforeFp}`
    )
  }

  const dedupedPexels = processedPexels.slice(0, perSourceCap)
  const dedupedPixabay = processedPixabay.slice(0, perSourceCap)
  const dedupedYoutube = processedYoutube.slice(0, perSourceCap)
  const dedupedFreepik = processedFreepik.slice(0, perSourceCap)

  // Enrich all stock sources (Pexels + Pixabay + Freepik) in one Claude call, passing topic for sport-mismatch detection
  const allStock = [...dedupedPexels, ...dedupedPixabay, ...dedupedFreepik]
  const [enrichedStock, transcriptEnriched] = await Promise.all([
    enrichWithMetadata(segment.text, allStock, segment.topic, queries, segment.requiresLiteralMatch).catch(() => allStock),
    enrichWithTranscripts(segment.text, dedupedYoutube, segment.requiresLiteralMatch).catch(() => dedupedYoutube),
  ])

  const enrichedPexels = enrichedStock.filter((v) => v.platform === 'pexels')
  const enrichedPixabay = enrichedStock.filter((v) => v.platform === 'pixabay')
  const enrichedFreepik = enrichedStock.filter((v) => v.platform === 'freepik')

  // Fall back to metadata scoring for any YouTube videos that didn't get transcript scores
  const unscoredYoutube = transcriptEnriched.filter((v) => v.relevanceScore === undefined)
  const scoredYoutube = transcriptEnriched.filter((v) => v.relevanceScore !== undefined)
  const metadataFallback = unscoredYoutube.length > 0
    ? await enrichWithMetadata(segment.text, unscoredYoutube, segment.topic, queries, segment.requiresLiteralMatch).catch(() => unscoredYoutube)
    : []
  const enrichedYoutube = [...scoredYoutube, ...metadataFallback]

  // Filter out results with low relevance scores (< 0.35)
  const filterLowRelevance = (videos: VideoResult[]) =>
    videos.filter((v) => v.relevanceScore === undefined || v.relevanceScore >= 0.35)

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
        pexelsOn
          ? searchPexels(query, 5, orientation).catch(() => [] as VideoResult[])
          : Promise.resolve([] as VideoResult[]),
        pixabayOn
          ? searchPixabay(query, pixabayPerPage, orientation).catch(() => [] as VideoResult[])
          : Promise.resolve([] as VideoResult[]),
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
        // Score fallback results against the fallback queries (broader visual terms) plus the original queries
        const enrichedFallback = await enrichWithMetadata(
          segment.text,
          newVideos,
          segment.topic,
          [...queries, ...fallbackQueries],
          segment.requiresLiteralMatch
        ).catch(() => newVideos)
        const filteredFallback = filterLowRelevance(enrichedFallback)
        console.log(`[search] fallback found ${filteredFallback.length} usable new results for "${segment.topic}"`)
        // Merge: put fallback results alongside original, then sort
        finalStock = [...filteredStock, ...filteredFallback]
      }
    }
  }

  // Combine all platforms and sort by relevance score descending
  let combined = [
    ...finalStock,
    ...filteredYoutube,
  ].sort((a, b) => (b.relevanceScore ?? -1) - (a.relevanceScore ?? -1))

  // Safety net: if strict filtering produced nothing, surface the best of what we found
  // anyway (down to score >= 0.2). Showing a few imperfect options beats showing nothing
  // for short/niche segments where the scorer is conservative.
  if (combined.length === 0) {
    const allEnriched = [...enrichedPexels, ...enrichedPixabay, ...enrichedFreepik, ...enrichedYoutube]
    const fallbackKept = allEnriched
      .filter((v) => v.relevanceScore === undefined || v.relevanceScore >= 0.2)
      .sort((a, b) => (b.relevanceScore ?? -1) - (a.relevanceScore ?? -1))
    if (fallbackKept.length > 0) {
      console.log(`[search] zero filtered results for "${segment.topic}" — surfacing ${fallbackKept.length} lower-scored candidates as safety net`)
      combined = fallbackKept
    }
  }

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
    const {
      segments,
      orientation = 'both',
      deductCreditsPerSegment = false,
      creditsToCharge,
      enabledSources: rawSources,
    } = body as {
      segments: unknown
      orientation?: VideoOrientation
      deductCreditsPerSegment?: boolean
      creditsToCharge?: number
      enabledSources?: VideoSource[]
    }

    // Validate enabledSources: fall back to "all" if missing, empty, or junk.
    const enabledSources: VideoSource[] = Array.isArray(rawSources) && rawSources.length > 0
      ? rawSources.filter((s): s is VideoSource => ALL_VIDEO_SOURCES.includes(s as VideoSource))
      : [...ALL_VIDEO_SOURCES]
    const finalSources = enabledSources.length > 0 ? enabledSources : [...ALL_VIDEO_SOURCES]

    if (!Array.isArray(segments)) {
      return NextResponse.json({ error: 'segments array is required' }, { status: 400 })
    }

    if (segments.length === 0) {
      return NextResponse.json({ results: [] })
    }

    const session = await getServerSession(authOptions)
    const userEmail = session?.user?.email ?? null

    // Credit count: if the client provides creditsToCharge, use that exact number
    // (e.g. for keyword mode where auto-splits produce more segments than the user
    // actually paid for). Otherwise fall back to 1 credit per segment.
    const creditCount = typeof creditsToCharge === 'number' && creditsToCharge >= 0
      ? creditsToCharge
      : segments.length

    if (deductCreditsPerSegment && userEmail && creditCount > 0) {
      const access = await getSubscriptionAccess(userEmail, creditCount)
      if (access.kind === 'inactive') {
        return NextResponse.json(
          { error: 'SUBSCRIPTION_INACTIVE', status: access.status },
          { status: 402 },
        )
      }
      if (access.kind === 'no_credits') {
        return NextResponse.json({ error: 'INSUFFICIENT_CREDITS' }, { status: 402 })
      }
    }

    // Look up user's Freepik key if they're signed in
    let freepikApiKey: string | undefined
    try {
      if (userEmail) {
        const { data } = await supabase
          .from('user_settings')
          .select('freepik_api_key')
          .eq('user_email', userEmail)
          .single()
        freepikApiKey = data?.freepik_api_key ?? undefined
        if (freepikApiKey) {
          console.log('[search] Freepik key found — including Freepik results')
        }
      }
    } catch {
      // Non-fatal — proceed without Freepik
    }

    // For keyword mode, expand each segment's search queries to English so
    // non-English keywords still match English-indexed stock libraries.
    let searchSegments = segments as ScriptSegment[]
    if (deductCreditsPerSegment) {
      searchSegments = await Promise.all(
        (segments as ScriptSegment[]).map(async (seg) => {
          const { queries: englishQueries, requiresLiteralMatch, canonicalName } = await prepareKeywordForSearch(
            seg.searchQueries[0] ?? seg.text,
            seg.originalContext
          )
          // For literal entities (brands, people, places) keep the topic as the canonical
          // name so the UI and scorer both retain entity identity. For concept keywords,
          // use the first English query as text/topic so translation correctly propagates
          // through scoring + fallback query generation.
          const englishText = requiresLiteralMatch
            ? (canonicalName ?? seg.text)
            : (englishQueries[0] ?? seg.text)
          return {
            ...seg,
            searchQueries: englishQueries,
            text: englishText,
            topic: englishText,
            requiresLiteralMatch,
          }
        })
      )
    }

    // Process max 3 segments concurrently
    const results = await withConcurrencyLimit(
      searchSegments,
      3,
      (segment) => searchForSegment(segment, freepikApiKey, orientation, finalSources)
    )

    // Deduct credits after a successful search
    if (deductCreditsPerSegment && userEmail && creditCount > 0) {
      const deductPromises = [] as Promise<unknown>[]
      for (let i = 0; i < creditCount; i++) {
        deductPromises.push(deductCredit(userEmail))
      }
      await Promise.all(deductPromises)
      console.log(`[credits] deducted ${creditCount} credit(s) for ${userEmail} (keyword search, ${segments.length} segment(s))`)
    }

    // Also return the (possibly enriched) segments so the client can persist
    // server-side metadata like requiresLiteralMatch and the canonical topic/text.
    // This is critical for follow-up calls (e.g. /api/search/more) so they know
    // the segment is a brand/literal match without re-classifying.
    return NextResponse.json({ results, segments: searchSegments })
  } catch (error) {
    console.error('Search route error:', error)
    const message = error instanceof Error ? error.message : 'Failed to search videos'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
