'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { AppState, ChapterStatus, ScriptSegment, SearchResults } from '@/lib/types'

interface AppStateWithHydration extends AppState {
  _hasHydrated: boolean
  showUpgradeModal: boolean
  setHasHydrated: (value: boolean) => void
  setShowUpgradeModal: (value: boolean) => void
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

      setHasHydrated: (value: boolean) => set({ _hasHydrated: value }),
      setShowUpgradeModal: (value: boolean) => set({ showUpgradeModal: value }),
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
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    }
  )
)

export default useAppStore
