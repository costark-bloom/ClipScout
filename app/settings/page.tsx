'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SettingsPage() {
  const { status } = useSession()
  const router = useRouter()

  const [freepikKey, setFreepikKey] = useState('')
  const [hasKey, setHasKey] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/')
      return
    }
    if (status === 'authenticated') {
      fetch('/api/user/settings')
        .then((r) => r.json())
        .then((d) => {
          setHasKey(!!d.hasFreepikKey)
          setLoading(false)
        })
        .catch(() => setLoading(false))
    }
  }, [status, router])

  const handleSave = async () => {
    if (!freepikKey.trim()) return
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/user/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ freepikApiKey: freepikKey.trim() }),
      })
      if (!res.ok) throw new Error('Failed to save')
      setHasKey(true)
      setFreepikKey('')
      setMessage({ type: 'success', text: 'Freepik API key saved! Freepik results will now appear in your searches.' })
    } catch {
      setMessage({ type: 'error', text: 'Failed to save API key. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async () => {
    setRemoving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/user/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ freepikApiKey: '' }),
      })
      if (!res.ok) throw new Error('Failed to remove')
      setHasKey(false)
      setFreepikKey('')
      setMessage({ type: 'success', text: 'Freepik API key removed.' })
    } catch {
      setMessage({ type: 'error', text: 'Failed to remove API key. Please try again.' })
    } finally {
      setRemoving(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-transparent text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-900 px-6 py-4 flex items-center gap-4">
        <Link href="/" className="text-gray-400 hover:text-gray-200 transition-colors flex items-center gap-2 text-sm">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Back
        </Link>
        <h1 className="text-lg font-semibold text-gray-100">Settings</h1>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">

        {/* Connected sources */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-500 mb-4">
            Connected Sources
          </h2>

          {/* Freepik card */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-start gap-4">
              {/* Freepik icon */}
              <div className="w-10 h-10 rounded-xl bg-[#1273EB]/10 border border-[#1273EB]/20 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-[#1273EB]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
                </svg>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-gray-100">Freepik</h3>
                  {hasKey ? (
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-green-900/40 text-green-400 border border-green-800/50 px-2 py-0.5 rounded-full">
                      Connected
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-gray-800 text-gray-500 border border-gray-700 px-2 py-0.5 rounded-full">
                      Not connected
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-400 mt-1 leading-relaxed">
                  Connect your Freepik account to include premium stock footage and motion graphics in your search results. Requires a Freepik Premium or API subscription.
                </p>
              </div>
            </div>

            {hasKey ? (
              <div className="flex items-center justify-between bg-green-950/20 border border-green-900/30 rounded-xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                  <span className="text-sm text-green-300">API key saved securely</span>
                </div>
                <button
                  onClick={handleRemove}
                  disabled={removing}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                >
                  {removing ? 'Removing…' : 'Remove'}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label htmlFor="freepik-key" className="block text-xs font-medium text-gray-400 mb-1.5">
                    Freepik API Key
                  </label>
                  <input
                    id="freepik-key"
                    type="password"
                    value={freepikKey}
                    onChange={(e) => setFreepikKey(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                    placeholder="Paste your Freepik API key…"
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <button
                  onClick={handleSave}
                  disabled={!freepikKey.trim() || saving}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl py-2.5 transition-colors"
                >
                  {saving ? 'Saving…' : 'Save API Key'}
                </button>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Your key is encrypted and stored securely. It&apos;s only used to run video searches on your behalf.{' '}
                  <a
                    href="https://www.freepik.com/api"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-400 hover:text-indigo-300 underline"
                  >
                    Get a Freepik API key →
                  </a>
                </p>
              </div>
            )}

            {message && (
              <div className={`flex items-start gap-2 rounded-xl px-4 py-3 text-sm ${
                message.type === 'success'
                  ? 'bg-green-950/30 border border-green-900/30 text-green-300'
                  : 'bg-red-950/30 border border-red-900/30 text-red-300'
              }`}>
                <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  {message.type === 'success'
                    ? <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    : <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                  }
                </svg>
                {message.text}
              </div>
            )}
          </div>
        </section>

        {/* Coming soon */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-500 mb-4">
            Coming Soon
          </h2>
          <div className="grid gap-3">
            {['Storyblocks', 'Getty Images', 'Adobe Stock'].map((name) => (
              <div
                key={name}
                className="bg-gray-900/50 border border-gray-800/50 rounded-2xl px-5 py-4 flex items-center justify-between opacity-50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-800 border border-gray-700" />
                  <span className="text-sm font-medium text-gray-400">{name}</span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-600 border border-gray-700 px-2 py-0.5 rounded-full">
                  Soon
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
