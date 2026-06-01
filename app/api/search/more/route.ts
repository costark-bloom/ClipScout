import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { searchYouTube, type YouTubeLicenseMode } from '@/lib/youtube'
import { searchPexels } from '@/lib/pexels'
import { searchPixabay } from '@/lib/pixabay'
import { searchFreepik } from '@/lib/freepik'
import { enrichWithTranscripts } from '@/lib/transcript-matcher'
import { enrichWithMetadata } from '@/lib/metadata-matcher'
import { generateMoreQueries } from '@/lib/claude'
import { getCreditsRemaining, deductCredit } from '@/lib/credits'
import { supabase } from '@/lib/supabase'
import type { ScriptSegment, VideoResult, VideoOrientation, VideoSource } from '@/lib/types'
import { ALL_VIDEO_SOURCES } from '@/lib/types'

function youtubeModeFor(sources: VideoSource[]): YouTubeLicenseMode | null {
  const wantsCc = sources.includes('youtube_cc')
  const wantsStandard = sources.includes('youtube_protected')
  if (wantsCc && wantsStandard) return 'all'
  if (wantsCc) return 'cc'
  if (wantsStandard) return 'standard'
  return null
}

export const maxDuration = 60

const MAX_PER_SOURCE = 4
const MAX_PER_SOURCE_LITERAL = 8
const MAX_RESULTS = 12

function deduplicateByUrl(videos: VideoResult[], excludeUrls: Set<string>): VideoResult[] {
  const seen = new Set<string>()
  return videos.filter((v) => {
    if (seen.has(v.sourceUrl) || excludeUrls.has(v.sourceUrl)) return false
    seen.add(v.sourceUrl)
    return true
  })
}

/**
 * For literal-match segments, only keep videos whose title or tags mention the
 * entity (case + punctuation insensitive). Mirrors the same helper in /api/search.
 */
function filterByEntityReference(videos: VideoResult[], entityName: string): VideoResult[] {
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

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 })
  }

  const userEmail = session.user.email

  const creditsRemaining = await getCreditsRemaining(userEmail)
  if (creditsRemaining < 1) {
    return NextResponse.json({ error: 'INSUFFICIENT_CREDITS' }, { status: 402 })
  }

  const body = await request.json()
  const {
    segment,
    orientation = 'both',
    excludeUrls: rawExclude = [],
    enabledSources: rawSources,
  } = body as {
    segment: ScriptSegment
    orientation?: VideoOrientation
    excludeUrls?: string[]
    enabledSources?: VideoSource[]
  }

  if (!segment?.id || !segment?.text) {
    return NextResponse.json({ error: 'segment is required' }, { status: 400 })
  }

  const enabledSources: VideoSource[] = Array.isArray(rawSources) && rawSources.length > 0
    ? rawSources.filter((s): s is VideoSource => ALL_VIDEO_SOURCES.includes(s as VideoSource))
    : [...ALL_VIDEO_SOURCES]
  const finalSources = enabledSources.length > 0 ? enabledSources : [...ALL_VIDEO_SOURCES]

  const pexelsOn = finalSources.includes('pexels')
  const pixabayOn = finalSources.includes('pixabay')
  const ytMode = youtubeModeFor(finalSources)
  const ytFetchCount = ytMode === 'standard' ? 10 : 5

  const excludeUrls = new Set<string>(rawExclude)

  // Look up Freepik key if available
  let freepikApiKey: string | undefined
  try {
    const { data } = await supabase
      .from('user_settings')
      .select('freepik_api_key')
      .eq('user_email', userEmail)
      .single()
    freepikApiKey = data?.freepik_api_key ?? undefined
  } catch {
    // non-fatal
  }

  // Generate fresh queries that differ from the ones already run.
  // Pass literal-match flag so brand-specific queries stay brand-specific
  // (otherwise the generator defaults to broad generic terms).
  const freshQueries = await generateMoreQueries(
    segment.text,
    segment.topic,
    segment.searchQueries,
    segment.requiresLiteralMatch
  )

  // Fall back to slightly varied versions of existing queries if Claude fails
  const queriesToRun = freshQueries.length > 0
    ? freshQueries
    : segment.searchQueries.map((q) => `${q} footage`)

  const pixabayPerPage = orientation === 'vertical' ? 12 : 6

  const allPromises = queriesToRun.flatMap((query) => [
    pexelsOn
      ? searchPexels(query, 6, orientation).catch(() => [] as VideoResult[])
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

  let processedPexels = deduplicateByUrl(pexelsResults, excludeUrls)
  let processedPixabay = deduplicateByUrl(pixabayResults, excludeUrls)
  let processedYoutube = deduplicateByUrl(youtubeResults, excludeUrls)
  let processedFreepik = deduplicateByUrl(freepikResults, excludeUrls)

  const perSourceCap = segment.requiresLiteralMatch ? MAX_PER_SOURCE_LITERAL : MAX_PER_SOURCE

  if (segment.requiresLiteralMatch) {
    const entityName = segment.topic || segment.text
    const beforePex = processedPexels.length
    const beforePix = processedPixabay.length
    const beforeFp = processedFreepik.length
    // Strict filter for stock libraries only — they don't carry trademarked content.
    // YouTube is unfiltered so Claude scoring can evaluate relevance from transcripts/titles.
    processedPexels = filterByEntityReference(processedPexels, entityName)
    processedPixabay = filterByEntityReference(processedPixabay, entityName)
    processedFreepik = filterByEntityReference(processedFreepik, entityName)
    console.log(
      `[search/more] literal-match entity-filter for "${entityName}": ` +
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

  const allStock = [...dedupedPexels, ...dedupedPixabay, ...dedupedFreepik]

  const [enrichedStock, transcriptEnriched] = await Promise.all([
    enrichWithMetadata(segment.text, allStock, segment.topic, queriesToRun, segment.requiresLiteralMatch).catch(() => allStock),
    enrichWithTranscripts(segment.text, dedupedYoutube, segment.requiresLiteralMatch).catch(() => dedupedYoutube),
  ])

  const filterLowRelevance = (videos: VideoResult[]) =>
    videos.filter((v) => v.relevanceScore === undefined || v.relevanceScore >= 0.35)

  const unscoredYoutube = transcriptEnriched.filter((v) => v.relevanceScore === undefined)
  const scoredYoutube = transcriptEnriched.filter((v) => v.relevanceScore !== undefined)
  const metadataFallback = unscoredYoutube.length > 0
    ? await enrichWithMetadata(segment.text, unscoredYoutube, segment.topic, queriesToRun, segment.requiresLiteralMatch).catch(() => unscoredYoutube)
    : []
  const enrichedYoutube = [...scoredYoutube, ...metadataFallback]

  const combined = [
    ...filterLowRelevance(enrichedStock),
    ...filterLowRelevance(enrichedYoutube),
  ].sort((a, b) => (b.relevanceScore ?? -1) - (a.relevanceScore ?? -1))

  const videos = combined.slice(0, MAX_RESULTS)

  // Deduct 1 credit only after a successful search
  await deductCredit(userEmail)

  return NextResponse.json({ videos, queriesUsed: queriesToRun })
}
