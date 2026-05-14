'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { AppState, ChapterStatus, ScriptSegment, SearchResults, VideoOrientation } from '@/lib/types'

interface AppStateWithHydration extends AppState {
  _hasHydrated: boolean
  showUpgradeModal: boolean
  isExampleScript: boolean
  setHasHydrated: (value: boolean) => void
  setShowUpgradeModal: (value: boolean) => void
  setIsExampleScript: (value: boolean) => void
}
const useAppStore = create<AppStateWithHydration>()(
  persist(
    (set) => ({
      script: '',
      segments: [],
      searchResults: [],
      activeSegmentId: null,
      isAnalyzing: false,
      isSearching: false,
      chapterStatus: {},
      error: null,
      _hasHydrated: false,
      showUpgradeModal: false,
      scriptChunkOffsets: [],
      scriptChunkCount: 1,
      savedScriptContext: '',
      videoOrientation: 'both' as VideoOrientation,
      isExampleScript: false,
      isKeywordMode: false,
      keywordChipCount: 0,

      setHasHydrated: (value: boolean) => set({ _hasHydrated: value }),
      setShowUpgradeModal: (value: boolean) => set({ showUpgradeModal: value }),
      setIsExampleScript: (value: boolean) => set({ isExampleScript: value }),
      setIsKeywordMode: (value: boolean) => set({ isKeywordMode: value }),
      setKeywordChipCount: (count: number) => set({ keywordChipCount: count }),
      setVideoOrientation: (orientation: VideoOrientation) => set({ videoOrientation: orientation }),
      setScriptChunks: (offsets: number[], count: number) =>
        set({ scriptChunkOffsets: offsets, scriptChunkCount: count }),
      setSavedScriptContext: (ctx: string) => set({ savedScriptContext: ctx }),
      setScript: (script: string) => set({ script }),
      setSegments: (segments: ScriptSegment[]) => set({ segments }),
      addSegments: (newSegments: ScriptSegment[]) =>
        set((state) => ({ segments: [...state.segments, ...newSegments] })),

      setSearchResults: (results: SearchResults[]) => set({ searchResults: results }),

      addSearchResults: (results: SearchResults[]) =>
        set((state) => {
          const existing = new Map(state.searchResults.map((r) => [r.segmentId, r]))
          for (const r of results) existing.set(r.segmentId, r)
          return { searchResults: Array.from(existing.values()) }
        }),

      setActiveSegment: (id: string | null) => set({ activeSegmentId: id }),
      setIsAnalyzing: (value: boolean) => set({ isAnalyzing: value }),
      setIsSearching: (value: boolean) => set({ isSearching: value }),

      setChapterStatus: (chapter: number, status: ChapterStatus) =>
        set((state) => ({
          chapterStatus: { ...state.chapterStatus, [chapter]: status },
        })),

      updateSegment: (id, updates) =>
        set((state) => ({
          segments: state.segments.map((s) => (s.id === id ? { ...s, ...updates } : s)),
        })),

      appendVideosToSegment: (segmentId, newVideos) =>
        set((state) => {
          const existing = new Map(state.searchResults.map((r) => [r.segmentId, r]))
          const current = existing.get(segmentId)
          existing.set(segmentId, {
            segmentId,
            videos: [...(current?.videos ?? []), ...newVideos],
          })
          return { searchResults: Array.from(existing.values()) }
        }),

      setError: (error: string | null) => set({ error }),

      reset: () =>
        set({
          script: '',
          segments: [],
          searchResults: [],
          activeSegmentId: null,
          isAnalyzing: false,
          isSearching: false,
          chapterStatus: {},
          error: null,
          showUpgradeModal: false,
          isExampleScript: false,
          isKeywordMode: false,
          keywordChipCount: 0,
          scriptChunkOffsets: [],
          scriptChunkCount: 1,
          savedScriptContext: '',
        }),
    }),
    {
      name: 'clipscout-session',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        script: state.script,
        segments: state.segments,
        searchResults: state.searchResults,
        chapterStatus: state.chapterStatus,
        scriptChunkOffsets: state.scriptChunkOffsets,
        scriptChunkCount: state.scriptChunkCount,
        savedScriptContext: state.savedScriptContext,
        videoOrientation: state.videoOrientation,
        isExampleScript: state.isExampleScript,
        isKeywordMode: state.isKeywordMode,
        keywordChipCount: state.keywordChipCount,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    }
  )
)

export default useAppStore
