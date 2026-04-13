export interface ScriptSegment {
  id: string
  text: string
  topic: string
  searchQueries: string[]
  startIndex: number
  endIndex: number
  chapter: number  // 1-based chapter number assigned by Claude
}

export type VideoLicense = 'royalty-free' | 'creative-commons' | 'standard' | 'unknown'

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

export interface AppState {
  script: string
  segments: ScriptSegment[]
  searchResults: SearchResults[]
  activeSegmentId: string | null
  isAnalyzing: boolean
  isSearching: boolean
  chapterStatus: Record<number, ChapterStatus>
  error: string | null
  setScript: (script: string) => void
  setSegments: (segments: ScriptSegment[]) => void
  addSegments: (segments: ScriptSegment[]) => void
  addSearchResults: (results: SearchResults[]) => void
  setSearchResults: (results: SearchResults[]) => void
  setActiveSegment: (id: string | null) => void
  setIsAnalyzing: (value: boolean) => void
  setIsSearching: (value: boolean) => void
  setChapterStatus: (chapter: number, status: ChapterStatus) => void
  updateSegment: (id: string, updates: Partial<Pick<ScriptSegment, 'topic' | 'searchQueries'>>) => void
  setError: (error: string | null) => void
  reset: () => void
}
