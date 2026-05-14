import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { searchYouTube } from '@/lib/youtube'
import { searchPexels } from '@/lib/pexels'
import { searchPixabay } from '@/lib/pixabay'
import { searchFreepik } from '@/lib/freepik'
import { enrichWithTranscripts } from '@/lib/transcript-matcher'
import { enrichWithMetadata } from '@/lib/metadata-matcher'
import { generateMoreQueries } from '@/lib/claude'
import { getCreditsRemaining, deductCredit } from '@/lib/credits'
import { supabase } from '@/lib/supabase'
import type { ScriptSegment, VideoResult, VideoOrientation } from '@/lib/types'

export const maxDuration = 60

const MAX_PER_SOURCE = 4
const MAX_RESULTS = 12

function deduplicateByUrl(videos: VideoResult[], excludeUrls: Set<string>): VideoResult[] {
  const seen = new Set<string>()
  return videos.filter((v) => {
    if (seen.has(v.sourceUrl) || excludeUrls.has(v.sourceUrl)) return false
    seen.add(v.sourceUrl)
    return true
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
  } = body as {
    segment: ScriptSegment
    orientation?: VideoOrientation
    excludeUrls?: string[]
  }

  if (!segment?.id || !segment?.text) {
    return NextResponse.json({ error: 'segment is required' }, { status: 400 })
  }

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

  // Generate fresh queries that differ from the ones already run
  const freshQueries = await generateMoreQueries(
    segment.text,
    segment.topic,
    segment.searchQueries
  )

  // Fall back to slightly varied versions of existing queries if Claude fails
  const queriesToRun = freshQueries.length > 0
    ? freshQueries
    : segment.searchQueries.map((q) => `${q} footage`)

  const pixabayPerPage = orientation === 'vertical' ? 12 : 6

  const allPromises = queriesToRun.flatMap((query) => [
    searchPexels(query, 6, orientation).catch(() => [] as VideoResult[]),
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

  const dedupedPexels = deduplicateByUrl(pexelsResults, excludeUrls).slice(0, MAX_PER_SOURCE)
  const dedupedPixabay = deduplicateByUrl(pixabayResults, excludeUrls).slice(0, MAX_PER_SOURCE)
  const dedupedYoutube = deduplicateByUrl(youtubeResults, excludeUrls).slice(0, MAX_PER_SOURCE)
  const dedupedFreepik = deduplicateByUrl(freepikResults, excludeUrls).slice(0, MAX_PER_SOURCE)

  const allStock = [...dedupedPexels, ...dedupedPixabay, ...dedupedFreepik]

  const [enrichedStock, transcriptEnriched] = await Promise.all([
    enrichWithMetadata(segment.text, allStock, segment.topic, queriesToRun).catch(() => allStock),
    enrichWithTranscripts(segment.text, dedupedYoutube).catch(() => dedupedYoutube),
  ])

  const filterLowRelevance = (videos: VideoResult[]) =>
    videos.filter((v) => v.relevanceScore === undefined || v.relevanceScore >= 0.35)

  const unscoredYoutube = transcriptEnriched.filter((v) => v.relevanceScore === undefined)
  const scoredYoutube = transcriptEnriched.filter((v) => v.relevanceScore !== undefined)
  const metadataFallback = unscoredYoutube.length > 0
    ? await enrichWithMetadata(segment.text, unscoredYoutube, segment.topic, queriesToRun).catch(() => unscoredYoutube)
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
