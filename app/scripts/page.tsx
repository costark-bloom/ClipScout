'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import useAppStore from '@/store/useAppStore'
import type { SavedScript } from '@/lib/supabase'

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

export default function ScriptsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { setScript, reset } = useAppStore()

  const [scripts, setScripts] = useState<SavedScript[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/')
  }, [status, router])

  useEffect(() => {
    if (status !== 'authenticated') return
    fetch('/api/scripts')
      .then((r) => r.json())
      .then(({ scripts }) => setScripts(scripts ?? []))
      .finally(() => setLoading(false))
  }, [status])

  const { setIsAnalyzing, setSegments, setError } = useAppStore()

  const handleLoad = async (s: SavedScript) => {
    setLoadingId(s.id)
    reset()
    setScript(s.content)
    setIsAnalyzing(true)
    router.push('/results')

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script: s.content }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to analyze script')
      }
      const { segments } = await res.json()
      setSegments(segments)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsAnalyzing(false)
      setLoadingId(null)
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    await fetch(`/api/scripts/${id}`, { method: 'DELETE' })
    setScripts((prev) => prev.filter((s) => s.id !== id))
    setDeletingId(null)
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500 text-sm">
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          Loading your scripts…
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-gray-400 hover:text-gray-200 transition-colors text-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Back to ClipScout
        </button>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-indigo-500 rounded-md flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-gray-100">ClipScout</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-100 mb-1">Saved scripts</h1>
          <p className="text-sm text-gray-500">
            {session?.user?.email && `Signed in as ${session.user.email} · `}
            {scripts.length} {scripts.length === 1 ? 'script' : 'scripts'} saved
          </p>
        </div>

        {scripts.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-gray-800 rounded-2xl">
            <div className="w-12 h-12 bg-gray-900 rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
              </svg>
            </div>
            <p className="text-gray-500 text-sm mb-4">No saved scripts yet.</p>
            <button
              onClick={() => router.push('/')}
              className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Analyze a script to get started →
            </button>
          </div>
        ) : (
          <ul className="space-y-3">
            {scripts.map((s) => (
              <li
                key={s.id}
                className="group bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-2xl p-5 flex items-start justify-between gap-4 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-100 truncate mb-1">{s.title}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-600">
                    {s.segment_count > 0 && (
                      <span>{s.segment_count} segments</span>
                    )}
                    <span>{timeAgo(s.created_at)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleLoad(s)}
                    disabled={loadingId === s.id}
                    className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 border border-indigo-900/60 hover:border-indigo-800 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
                  >
                    {loadingId === s.id ? (
                      <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
                      </svg>
                    )}
                    {loadingId === s.id ? 'Analyzing…' : 'Load'}
                  </button>
                  <button
                    onClick={() => handleDelete(s.id)}
                    disabled={deletingId === s.id}
                    className="flex items-center justify-center w-7 h-7 text-gray-600 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-all disabled:opacity-40"
                    aria-label="Delete script"
                  >
                    {deletingId === s.id ? (
                      <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    )}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
