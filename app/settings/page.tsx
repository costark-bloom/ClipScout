'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import HomeHeader from '@/components/HomeHeader'

type Tab = 'general' | 'billing' | 'integrations'

const PLAN_LABELS: Record<string, { label: string; credits: number; color: string }> = {
  creator: { label: 'Creator', credits: 75,  color: 'text-purple-600 bg-purple-100 border-purple-200' },
  pro:     { label: 'Pro',     credits: 200, color: 'text-indigo-600 bg-indigo-100 border-indigo-200' },
  agency:  { label: 'Agency',  credits: 600, color: 'text-blue-600 bg-blue-100 border-blue-200' },
}

export default function SettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('general')

  // General
  const [displayName, setDisplayName] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [nameMessage, setNameMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Billing
  const [subscription, setSubscription] = useState<{
    plan: string | null
    interval: string | null
    status: string | null
    periodEnd: string | null
  }>({ plan: null, interval: null, status: null, periodEnd: null })

  const [freeCredits, setFreeCredits] = useState<{ remaining: number; used: number } | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [cancelMessage, setCancelMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  // Integrations
  const [freepikKey, setFreepikKey] = useState('')
  const [hasKey, setHasKey] = useState(false)
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [intMessage, setIntMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/'); return }
    if (status === 'authenticated') {
      setDisplayName(session?.user?.name ?? '')
      fetch('/api/user/settings')
        .then((r) => r.json())
        .then((d) => {
          setHasKey(!!d.hasFreepikKey)
          setSubscription({
            plan: d.subscription_plan ?? null,
            interval: d.subscription_interval ?? null,
            status: d.subscription_status ?? null,
            periodEnd: d.subscription_period_end ?? null,
          })
          setFreeCredits({
            remaining: d.credits_remaining ?? 3,
            used: d.credits_used ?? 0,
          })
          setLoading(false)
        })
        .catch(() => setLoading(false))
    }
  }, [status, router, session])

  const handleSaveName = async () => {
    if (!displayName.trim()) return
    setSavingName(true)
    setNameMessage(null)
    await new Promise((r) => setTimeout(r, 600))
    setNameMessage({ type: 'success', text: 'Display name updated.' })
    setSavingName(false)
  }

  const handleSaveFreepik = async () => {
    if (!freepikKey.trim()) return
    setSaving(true)
    setIntMessage(null)
    try {
      const res = await fetch('/api/user/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ freepikApiKey: freepikKey.trim() }),
      })
      if (!res.ok) throw new Error('Failed to save')
      setHasKey(true)
      setFreepikKey('')
      setIntMessage({ type: 'success', text: 'Freepik API key saved!' })
    } catch {
      setIntMessage({ type: 'error', text: 'Failed to save API key. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveFreepik = async () => {
    setRemoving(true)
    setIntMessage(null)
    try {
      const res = await fetch('/api/user/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ freepikApiKey: '' }),
      })
      if (!res.ok) throw new Error('Failed to remove')
      setHasKey(false)
      setIntMessage({ type: 'success', text: 'Freepik API key removed.' })
    } catch {
      setIntMessage({ type: 'error', text: 'Failed to remove. Please try again.' })
    } finally {
      setRemoving(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const handleCancelSubscription = async () => {
    setCancelling(true)
    setCancelMessage(null)
    try {
      const res = await fetch('/api/stripe/cancel', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to cancel')
      setSubscription((prev) => ({ ...prev, status: 'cancelling' }))
      setShowCancelConfirm(false)
      setCancelMessage({ type: 'success', text: 'Your subscription will cancel at the end of your billing period. You keep access until then.' })
    } catch (err) {
      setCancelMessage({ type: 'error', text: err instanceof Error ? err.message : 'Something went wrong.' })
    } finally {
      setCancelling(false)
    }
  }

  const planInfo = subscription.plan ? PLAN_LABELS[subscription.plan] : null
  const isActive = subscription.status === 'active' || subscription.status === 'cancelling'
  const periodEndDate = subscription.periodEnd
    ? new Date(subscription.periodEnd).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null

  const NAV_ITEMS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    {
      id: 'general',
      label: 'General',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
        </svg>
      ),
    },
    {
      id: 'billing',
      label: 'Billing',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 21Z" />
        </svg>
      ),
    },
    {
      id: 'integrations',
      label: 'Integrations',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
        </svg>
      ),
    },
  ]

  return (
    <div className="min-h-screen text-purple-950" style={{ position: 'relative', zIndex: 1 }}>

      {/* Cancel confirmation modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-purple-950/40 backdrop-blur-sm" onClick={() => setShowCancelConfirm(false)} />
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl shadow-purple-300/30 border border-purple-100 overflow-hidden">
            <div className="h-1 w-full bg-gradient-to-r from-red-400 to-red-500" />
            <div className="p-6">
              <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
              </div>
              <h2 className="text-base font-bold text-purple-950 text-center mb-2">Cancel subscription?</h2>
              <p className="text-sm text-purple-600 text-center leading-relaxed mb-6">
                You&apos;ll keep full access until the end of your current billing period. After that, your account will revert to the free plan.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  className="flex-1 text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-4 py-2.5 rounded-xl transition-colors"
                >
                  Keep plan
                </button>
                <button
                  onClick={handleCancelSubscription}
                  disabled={cancelling}
                  className="flex-1 text-sm font-medium text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {cancelling && (
                    <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                  {cancelling ? 'Cancelling…' : 'Yes, cancel'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <HomeHeader />

      <div className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-purple-950 mb-8">Settings</h1>

        <div className="flex gap-8">
          {/* Left nav */}
          <aside className="w-48 shrink-0">
            <nav className="space-y-1">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
                    tab === item.id
                      ? 'bg-white/80 text-purple-950 shadow-sm border border-purple-200'
                      : 'text-purple-600 hover:bg-white/50 hover:text-purple-950'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </nav>
          </aside>

          {/* Content */}
          <div className="flex-1 min-w-0">

            {/* ── GENERAL ── */}
            {tab === 'general' && (
              <div className="bg-white/80 border border-purple-200 rounded-2xl p-6 space-y-6 backdrop-blur-sm shadow-sm">
                <div>
                  <h2 className="text-base font-bold text-purple-950 mb-1">General</h2>
                  <p className="text-sm text-purple-500">Manage your account details.</p>
                </div>

                <div className="h-px bg-purple-100" />

                {/* Avatar */}
                <div className="flex items-center gap-4">
                  {session?.user?.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={session.user.image} alt="" className="w-14 h-14 rounded-full ring-2 ring-purple-200" />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold text-xl">
                      {session?.user?.name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-purple-950">{session?.user?.name}</p>
                    <p className="text-xs text-purple-500">{session?.user?.email}</p>
                  </div>
                </div>

                {/* Display name */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-purple-700">Display name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full bg-white border border-purple-200 rounded-xl px-3.5 py-2.5 text-sm text-purple-950 placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                  />
                </div>

                {/* Email — read only */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-purple-700">Email</label>
                  <input
                    type="email"
                    value={session?.user?.email ?? ''}
                    readOnly
                    className="w-full bg-purple-50 border border-purple-100 rounded-xl px-3.5 py-2.5 text-sm text-purple-400 cursor-not-allowed"
                  />
                  <p className="text-xs text-purple-400">Email is managed by your Google account and cannot be changed here.</p>
                </div>

                {nameMessage && (
                  <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${
                    nameMessage.type === 'success'
                      ? 'bg-green-50 border border-green-200 text-green-700'
                      : 'bg-red-50 border border-red-200 text-red-600'
                  }`}>
                    {nameMessage.text}
                  </div>
                )}

                <button
                  onClick={handleSaveName}
                  disabled={savingName}
                  className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl px-5 py-2.5 transition-colors"
                >
                  {savingName ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            )}

            {/* ── BILLING ── */}
            {tab === 'billing' && (
              <div className="space-y-4">
                {/* Current plan */}
                <div className="bg-white/80 border border-purple-200 rounded-2xl p-6 backdrop-blur-sm shadow-sm">
                  <h2 className="text-base font-bold text-purple-950 mb-4">Current plan</h2>

                  {planInfo && isActive ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <span className={`text-sm font-bold px-3 py-1 rounded-full border ${planInfo.color}`}>
                          {planInfo.label}
                        </span>
                        <span className="text-xs text-purple-500 capitalize">{subscription.interval} billing</span>
                        {subscription.status === 'cancelling' ? (
                          <span className="text-xs font-medium text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">Cancels at period end</span>
                        ) : (
                          <span className="text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">Active</span>
                        )}
                      </div>

                      {periodEndDate && (
                        <p className="text-sm text-purple-600">
                          {subscription.status === 'cancelling'
                            ? <>Access ends: <span className="font-medium text-purple-950">{periodEndDate}</span></>
                            : <>Next billing date: <span className="font-medium text-purple-950">{periodEndDate}</span></>
                          }
                        </p>
                      )}

                      {cancelMessage && (
                        <p className={`text-xs px-3 py-2 rounded-lg border ${
                          cancelMessage.type === 'success'
                            ? 'text-green-700 bg-green-50 border-green-200'
                            : 'text-red-600 bg-red-50 border-red-200'
                        }`}>
                          {cancelMessage.text}
                        </p>
                      )}

                      <div className="flex gap-3 pt-2">
                        {subscription.status !== 'cancelling' && (
                          <Link
                            href="/pricing"
                            className="text-sm font-medium bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl transition-colors"
                          >
                            Upgrade plan
                          </Link>
                        )}
                        {subscription.status === 'cancelling' ? (
                          <span className="text-sm text-orange-600 bg-orange-50 border border-orange-200 px-4 py-2 rounded-xl">
                            Cancels at period end
                          </span>
                        ) : (
                          <button
                            onClick={() => setShowCancelConfirm(true)}
                            className="text-sm font-medium text-red-500 hover:text-red-700 border border-red-200 hover:border-red-400 bg-white px-4 py-2 rounded-xl transition-all"
                          >
                            Cancel subscription
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-purple-600">You&apos;re on the <span className="font-semibold text-purple-950">Free Trial</span>. Upgrade to unlock full access.</p>
                      <Link
                        href="/pricing"
                        className="inline-flex text-sm font-semibold bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl transition-colors"
                      >
                        View plans →
                      </Link>
                    </div>
                  )}
                </div>

                {/* Credits */}
                <div className="bg-white/80 border border-purple-200 rounded-2xl p-6 backdrop-blur-sm shadow-sm">
                  {planInfo ? (
                    <>
                      <h2 className="text-base font-bold text-purple-950 mb-4">Credits this month</h2>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-purple-600">Credits used</span>
                          <span className="font-semibold text-purple-950">— / {planInfo.credits}</span>
                        </div>
                        <div className="w-full h-2 bg-purple-100 rounded-full overflow-hidden">
                          <div className="h-full bg-purple-500 rounded-full" style={{ width: '0%' }} />
                        </div>
                        <p className="text-xs text-purple-400">Credit usage tracking coming soon.</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <h2 className="text-base font-bold text-purple-950 mb-4">Free Credits Used</h2>
                      {freeCredits !== null && (
                        <div className="space-y-3 mb-4">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-purple-600">Credits remaining</span>
                            <span className="font-semibold text-purple-950">
                              {freeCredits.remaining} <span className="text-purple-400 font-normal">/ 3</span>
                            </span>
                          </div>
                          <div className="w-full h-2 bg-purple-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-purple-500 rounded-full transition-all"
                              style={{ width: `${(freeCredits.remaining / 3) * 100}%` }}
                            />
                          </div>
                          <p className="text-xs text-purple-400">
                            {freeCredits.remaining === 0
                              ? 'All free credits used.'
                              : `${freeCredits.used} of 3 free credits used.`}
                          </p>
                        </div>
                      )}
                      <p className="text-sm text-purple-500">Subscribe to a plan to track credit usage.</p>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ── INTEGRATIONS ── */}
            {tab === 'integrations' && (
              <div className="space-y-4">
                <div className="bg-white/80 border border-purple-200 rounded-2xl p-6 space-y-4 backdrop-blur-sm shadow-sm">
                  <div>
                    <h2 className="text-base font-bold text-purple-950 mb-1">Integrations</h2>
                    <p className="text-sm text-purple-500">Connect third-party services to expand your search results.</p>
                  </div>

                  <div className="h-px bg-purple-100" />

                  {/* Freepik */}
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
                        <svg className="w-5 h-5 text-[#1273EB]" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-purple-950">Freepik</h3>
                          {hasKey ? (
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-green-50 text-green-700 border border-green-300 px-2 py-0.5 rounded-full">Connected</span>
                          ) : (
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-400 border border-purple-200 px-2 py-0.5 rounded-full">Not connected</span>
                          )}
                        </div>
                        <p className="text-sm text-purple-600 mt-1 leading-relaxed">
                          Connect your Freepik account to include premium stock footage in your search results. Requires a Freepik Premium or API subscription.
                        </p>
                      </div>
                    </div>

                    {hasKey ? (
                      <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-green-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                          </svg>
                          <span className="text-sm text-green-700">API key saved securely</span>
                        </div>
                        <button
                          onClick={handleRemoveFreepik}
                          disabled={removing}
                          className="text-xs text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
                        >
                          {removing ? 'Removing…' : 'Remove'}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div>
                          <label htmlFor="freepik-key" className="block text-xs font-medium text-purple-700 mb-1.5">
                            Freepik API Key
                          </label>
                          <input
                            id="freepik-key"
                            type="password"
                            value={freepikKey}
                            onChange={(e) => setFreepikKey(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveFreepik()}
                            placeholder="Paste your Freepik API key…"
                            className="w-full bg-white border border-purple-200 rounded-xl px-3.5 py-2.5 text-sm text-purple-950 placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                          />
                        </div>
                        <button
                          onClick={handleSaveFreepik}
                          disabled={!freepikKey.trim() || saving}
                          className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl py-2.5 transition-colors"
                        >
                          {saving ? 'Saving…' : 'Save API Key'}
                        </button>
                        <p className="text-xs text-purple-400 leading-relaxed">
                          Your key is encrypted and stored securely.{' '}
                          <a href="https://www.freepik.com/api" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:text-purple-950 underline">
                            Get a Freepik API key →
                          </a>
                        </p>
                      </div>
                    )}

                    {intMessage && (
                      <div className={`flex items-start gap-2 rounded-xl px-4 py-3 text-sm ${
                        intMessage.type === 'success'
                          ? 'bg-green-50 border border-green-200 text-green-700'
                          : 'bg-red-50 border border-red-200 text-red-600'
                      }`}>
                        {intMessage.text}
                      </div>
                    )}
                  </div>
                </div>

                {/* Coming soon */}
                <div className="bg-white/50 border border-purple-100 rounded-2xl p-6">
                  <p className="text-xs font-bold uppercase tracking-widest text-purple-400 mb-3">Coming Soon</p>
                  <div className="grid gap-3">
                    {['Storyblocks', 'Getty Images', 'Adobe Stock'].map((name) => (
                      <div key={name} className="flex items-center justify-between opacity-50">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-purple-100 border border-purple-200" />
                          <span className="text-sm font-medium text-purple-600">{name}</span>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 border border-purple-200 px-2 py-0.5 rounded-full">Soon</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
