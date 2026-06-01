export interface ScriptSegment {
  id: string
  text: string
  topic: string
  searchQueries: string[]
  startIndex: number
  endIndex: number
  chapter: number  // 1-based chapter number assigned by Claude
  originalContext?: string  // for keyword splits: the unsplit phrase, used to improve translation
  /**
   * When true, the segment refers to a specific named entity (brand, company,
   * person, product, place) and only clips that visibly show that exact entity
   * should be scored as relevant. Generic same-category clips are penalised.
   */
  requiresLiteralMatch?: boolean
}

export type VideoLicense = 'royalty-free' | 'creative-commons' | 'standard' | 'unknown'

/**
 * User-toggleable footage sources. YouTube is split into two flavours by license
 * so users can opt out of copyright-risky results without losing CC YouTube clips.
 */
export type VideoSource = 'pexels' | 'pixabay' | 'youtube_cc' | 'youtube_protected'

export const ALL_VIDEO_SOURCES: VideoSource[] = ['pexels', 'pixabay', 'youtube_cc', 'youtube_protected']

/** Maps a VideoResult onto the user-facing source bucket used by the source filter. */
export function videoToSource(video: { platform: VideoResult['platform']; license?: VideoLicense }): VideoSource | null {
  if (video.platform === 'pexels') return 'pexels'
  if (video.platform === 'pixabay') return 'pixabay'
  if (video.platform === 'youtube') {
    return video.license === 'creative-commons' ? 'youtube_cc' : 'youtube_protected'
  }
  // Freepik isn't yet user-toggleable; treat as always-on so we don't hide it.
  return null
}

export interface VideoResult {
  id: string
  title: string
  thumbnailUrl: string
  sourceUrl: string
  embedUrl?: string
  platform: 'youtube' | 'pexels' | 'pixabay' | 'freepik'
  license?: VideoLicense       // licensing type used to calculate reuse score
  duration?: string
  durationSeconds?: number
  channelOrAuthor?: string
  relevanceScore?: number
  tags?: string[]              // descriptive tags from the platform
  startTimestamp?: number      // seconds — where to start the preview
  transcriptSnippet?: string   // matching transcript line (YouTube only)
  transcriptReason?: string    // Claude's 1-sentence explanation of match
}

export interface SearchResults {
  segmentId: string
  videos: VideoResult[]
}

export type ChapterStatus = 'idle' | 'loading' | 'done'

export type VideoOrientation = 'both' | 'horizontal' | 'vertical'

export interface AppState {
  script: string
  segments: ScriptSegment[]
  searchResults: SearchResults[]
  activeSegmentId: string | null
  isAnalyzing: boolean
  isSearching: boolean
  chapterStatus: Record<number, ChapterStatus>
  error: string | null
  videoOrientation: VideoOrientation
  isKeywordMode: boolean
  /** Number of keyword chips the user originally typed (before auto-splitting), used for credit charging */
  keywordChipCount: number
  /** Which footage sources are currently enabled. Persisted across sessions. */
  enabledSources: VideoSource[]
  setVideoOrientation: (orientation: VideoOrientation) => void
  setIsKeywordMode: (value: boolean) => void
  setKeywordChipCount: (count: number) => void
  setEnabledSources: (sources: VideoSource[]) => void
  toggleSource: (source: VideoSource) => void
  setScript: (script: string) => void
  setSegments: (segments: ScriptSegment[]) => void
  addSegments: (segments: ScriptSegment[]) => void
  addSearchResults: (results: SearchResults[]) => void
  setSearchResults: (results: SearchResults[]) => void
  setActiveSegment: (id: string | null) => void
  setIsAnalyzing: (value: boolean) => void
  setIsSearching: (value: boolean) => void
  setChapterStatus: (chapter: number, status: ChapterStatus) => void
  updateSegment: (id: string, updates: Partial<Pick<ScriptSegment, 'topic' | 'searchQueries' | 'text' | 'requiresLiteralMatch'>>) => void
  appendVideosToSegment: (segmentId: string, newVideos: VideoResult[]) => void
  setError: (error: string | null) => void
  reset: () => void
  showUpgradeModal: boolean
  setShowUpgradeModal: (value: boolean) => void
  // Chapter-level metadata
  scriptChunkOffsets: number[]          // character offset where each chapter starts
  scriptChunkCount: number              // total number of chapters in the script
  savedScriptContext: string            // global context string from Claude (reused for subsequent chapters)
  setScriptChunks: (offsets: number[], count: number) => void
  setSavedScriptContext: (ctx: string) => void
}
