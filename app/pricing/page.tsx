'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import HomeHeader from '@/components/HomeHeader'
import CreditBoostModal from '@/components/CreditBoostModal'
import type { PlanId, BillingInterval } from '@/lib/stripe'

// ─── Pricing data ────────────────────────────────────────────────────────────

const PLANS = [
  {
    id: 'creator',
    name: 'Creator',
    tagline: 'For content creators getting started with AI b-roll',
    monthly: 12,
    quarterly: 9,   // per month, billed $27/quarter
    annual: 8,      // per month, billed $96/year
    quarterlyTotal: 27,
    annualTotal: 96,
    credits: 75,
    rollover: 150,
    popular: false,
    features: [
      '75 credits / month',
      'Credits rollover (up to 150)',
      'Save unlimited scripts',
      'YouTube, Pexels & Pixabay search',
      'Connect your Freepik account',
      'AI transcript matching',
      'Standard processing speed',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'For serious creators who need more volume and speed',
    monthly: 29,
    quarterly: 22,  // per month, billed $66/quarter
    annual: 20,     // per month, billed $240/year
    quarterlyTotal: 66,
    annualTotal: 240,
    credits: 200,
    rollover: 400,
    popular: true,
    features: [
      '200 credits / month',
      'Credits rollover (up to 400)',
      'Save unlimited scripts',
      'YouTube, Pexels & Pixabay search',
      'Connect your Freepik account',
      'AI transcript matching',
      'Priority processing speed',
      'Early access to new features',
      'Priority support',
    ],
  },
  {
    id: 'agency',
    name: 'Agency',
    tagline: 'For studios and teams producing content at scale',
    monthly: 79,
    quarterly: 59,  // per month, billed $177/quarter
    annual: 52,     // per month, billed $624/year
    quarterlyTotal: 177,
    annualTotal: 624,
    credits: 600,
    rollover: 1200,
    popular: false,
    features: [
      '600 credits / month',
      'Credits rollover (up to 1,200)',
      'Save unlimited scripts',
      'YouTube, Pexels & Pixabay search',
      'Connect your Freepik account',
      'AI transcript matching',
      'Priority processing speed',
      'Up to 5 team seats',
      'Early access to new features',
      'Dedicated priority support',
    ],
  },
]

// ─── Quarterly upsell modal ───────────────────────────────────────────────────

function QuarterlyModal({
  plan,
  onQuarterly,
  onMonthly,
  onClose,
}: {
  plan: (typeof PLANS)[0]
  onQuarterly: () => void
  onMonthly: () => void
  onClose: () => void
}) {
  const savings = ((plan.monthly - plan.quarterly) * 3).toFixed(0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-purple-950/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl flex flex-col sm:flex-row">
        {/* Left — offer details */}
        <div className="bg-white flex-1 p-8">
          <p className="text-xs font-bold uppercase tracking-widest text-purple-500 mb-1">{plan.name}</p>
          <div className="flex items-end gap-2 mb-1">
            <span className="text-5xl font-extrabold text-purple-950">${plan.quarterly}</span>
            <span className="text-sm text-purple-500 mb-2 line-through">${plan.monthly}</span>
            <span className="text-sm text-purple-500 mb-2">per month</span>
          </div>
          <p className="text-sm text-purple-700 mb-6">
            Pay 3 months upfront for a total of <strong>${plan.quarterlyTotal}</strong>
          </p>

          <ul className="space-y-3 mb-8">
            {[
              'You can still cancel anytime',
              'We bill you only once every quarter',
              `Save a total of $${savings} over 3 months`,
            ].map((item) => (
              <li key={item} className="flex items-center gap-2.5 text-sm text-purple-800">
                <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                {item}
              </li>
            ))}
          </ul>

          <button
            onClick={onQuarterly}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-xl transition-colors duration-150 text-sm"
          >
            Yes, save {Math.round(((plan.monthly - plan.quarterly) / plan.monthly) * 100)}% and pay quarterly
          </button>
          <button
            onClick={onMonthly}
            className="w-full mt-3 text-sm text-purple-500 hover:text-purple-700 transition-colors"
          >
            No, skip discount and pay monthly &rsaquo;
          </button>
        </div>

        {/* Right — savings callout */}
        <div className="bg-gradient-to-br from-purple-600 to-indigo-600 flex-1 p-8 flex flex-col justify-center">
          <p className="text-4xl font-extrabold text-white mb-3">
            Save {Math.round(((plan.monthly - plan.quarterly) / plan.monthly) * 100)}% with<br />Quarterly Billing
          </p>
          <p className="text-purple-200 text-sm leading-relaxed">
            Ready to commit for at least 3 months? Pay quarterly and save ${savings}.
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Check icon ───────────────────────────────────────────────────────────────

function Check() {
  return (
    <svg className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const [annual, setAnnual] = useState(true)
  const [quarterlyModal, setQuarterlyModal] = useState<(typeof PLANS)[0] | null>(null)
  const [boostModal, setBoostModal] = useState<{ plan: (typeof PLANS)[0]; interval: BillingInterval } | null>(null)
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const { data: session } = useSession()

  const startCheckout = async (planId: PlanId, interval: BillingInterval, packId?: string | null) => {
    setCheckoutLoading(true)
    setLoadingPlan(`${planId}-${interval}`)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, interval, packId: packId ?? null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      window.location.href = data.url
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setLoadingPlan(null)
      setCheckoutLoading(false)
    }
  }

  const handleGetStarted = (plan: (typeof PLANS)[0]) => {
    if (!session) {
      window.location.href = '/?signin=1'
      return
    }
    if (!annual) {
      setQuarterlyModal(plan)
    } else {
      setBoostModal({ plan, interval: 'annual' })
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ position: 'relative', zIndex: 1 }}>
      <HomeHeader />

      <main className="flex-1 px-6 py-16 max-w-5xl mx-auto w-full">
        {/* Heading */}
        <div className="text-center mb-10">
          <span className="inline-block mb-4 text-xs font-bold uppercase tracking-widest text-purple-500 bg-purple-100 border border-purple-200 px-3 py-1 rounded-full">
            Plans &amp; Pricing
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-purple-950 mb-4 tracking-tight leading-tight">
            The right plan for<br />
            <span className="bg-gradient-to-r from-purple-600 to-indigo-500 bg-clip-text text-transparent">
              every creator
            </span>
          </h1>
          <p className="text-purple-600 text-base max-w-md mx-auto">
            Pay only for the footage searches you run. No subscriptions that waste money when you&apos;re between projects.
          </p>

          {/* How credits work — anchors to explainer below */}
          <div className="mt-3">
            <a
              href="#credits"
              className="inline-flex items-center gap-1.5 text-sm text-purple-500 hover:text-purple-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
              </svg>
              How do credits work?
            </a>
          </div>

          {/* Annual toggle */}
          <div className="mt-6 inline-flex items-center gap-3">
            <span className={`text-sm font-medium transition-colors ${annual ? 'text-purple-500' : 'text-purple-950'}`}>
              Monthly
            </span>
            <button
              onClick={() => setAnnual((a) => !a)}
              className={`relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none ${
                annual ? 'bg-purple-600' : 'bg-purple-200'
              }`}
              aria-label="Toggle annual billing"
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                  annual ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
            <span className={`text-sm font-medium transition-colors flex items-center gap-1.5 ${annual ? 'text-purple-950' : 'text-purple-500'}`}>
              Annual
              <span className="text-[11px] font-bold bg-green-100 text-green-700 border border-green-200 px-1.5 py-0.5 rounded-full">
                Save 33%
              </span>
            </span>
          </div>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {PLANS.map((plan) => {
            const price = annual ? plan.annual : plan.monthly
            const billingNote = annual
              ? `Billed $${plan.annualTotal}/year`
              : 'Billed monthly'

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl border flex flex-col transition-all duration-200 ${
                  plan.popular
                    ? 'border-purple-400 bg-white shadow-xl shadow-purple-200/50'
                    : 'border-purple-200 bg-white/80 shadow-md shadow-purple-100/40'
                }`}
              >
                {/* Most popular badge */}
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="bg-purple-600 text-white text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="p-7 flex flex-col flex-1">
                  {/* Plan name */}
                  <h2 className="text-xl font-bold text-purple-950 mb-0.5">{plan.name}</h2>
                  <p className="text-xs text-purple-500 mb-5">{plan.tagline}</p>

                  {/* Price */}
                  <div className="mb-1">
                    <div className="flex items-end gap-1">
                      <span className="text-5xl font-extrabold text-purple-950 leading-none">${price}</span>
                      <span className="text-sm text-purple-500 mb-1">/month</span>
                    </div>
                    <p className="text-xs text-purple-400 mt-1">{billingNote}</p>
                  </div>

                  {/* Credits highlight */}
                  <div className="mt-4 mb-5">
                    <p className="text-sm font-bold text-purple-600">
                      {plan.credits} credits/month
                    </p>
                    <p className="text-xs text-purple-400">Rollover up to {plan.rollover}</p>
                  </div>

                  {/* Features */}
                  <ul className="space-y-2.5 mb-8 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-purple-800">
                        <Check />
                        {f}
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <button
                    onClick={() => handleGetStarted(plan)}
                    disabled={!!loadingPlan}
                    className={`w-full py-3 rounded-xl font-semibold text-sm transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed ${
                      plan.popular
                        ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-300/40'
                        : 'bg-purple-100 hover:bg-purple-200 text-purple-800 border border-purple-200'
                    }`}
                  >
                    {loadingPlan?.startsWith(plan.id) ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        Redirecting…
                      </>
                    ) : (
                      'Get Started'
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Free trial note */}
        <p className="text-center text-sm text-purple-500 mt-8">
          Not ready to commit?{' '}
          <Link href="/" className="text-purple-700 font-medium hover:text-purple-950 underline underline-offset-2 transition-colors">
            Try ClipScout free
          </Link>{' '}
          — no credit card required.
        </p>

        {/* Credits explainer */}
        <div id="credits" className="mt-14 max-w-2xl mx-auto bg-white/70 border border-purple-200 rounded-2xl p-7 backdrop-blur-sm scroll-mt-24">
          <h3 className="text-base font-bold text-purple-950 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
            How credits work
          </h3>
          <div className="space-y-2 text-sm text-purple-700 leading-relaxed">
            <p>
              <strong className="text-purple-950">1 credit = 1 chapter analyzed.</strong> ClipScout automatically breaks your script into ~400-word chapters.
              Each chapter costs 1 credit — AI analyzes the text, finds visual moments, and searches for matching b-roll footage.
            </p>
            <p>
              A typical 800-word YouTube script uses <strong className="text-purple-950">2 credits</strong>.
              A longer 2,000-word video essay uses <strong className="text-purple-950">~5 credits</strong>.
            </p>
            <p>
              Unused credits roll over to the next month (up to your plan&apos;s rollover limit), so you never lose what you&apos;ve paid for.
            </p>
          </div>
        </div>
      </main>

      {/* Quarterly upsell modal */}
      {quarterlyModal && (
        <QuarterlyModal
          plan={quarterlyModal}
          onQuarterly={() => {
            const plan = quarterlyModal
            setQuarterlyModal(null)
            setBoostModal({ plan, interval: 'quarterly' })
          }}
          onMonthly={() => {
            const plan = quarterlyModal
            setQuarterlyModal(null)
            setBoostModal({ plan, interval: 'monthly' })
          }}
          onClose={() => setQuarterlyModal(null)}
        />
      )}

      {boostModal && (
        <CreditBoostModal
          planName={boostModal.plan.name}
          billingLabel={
            boostModal.interval === 'annual'
              ? `Billed $${boostModal.plan.annualTotal}/year`
              : boostModal.interval === 'quarterly'
              ? `Billed $${boostModal.plan.quarterlyTotal}/quarter`
              : 'Billed monthly'
          }
          planPrice={
            boostModal.interval === 'annual'
              ? boostModal.plan.annual
              : boostModal.interval === 'quarterly'
              ? boostModal.plan.quarterly
              : boostModal.plan.monthly
          }
          onCheckout={(packId) => {
            const { plan, interval } = boostModal
            startCheckout(plan.id as PlanId, interval, packId)
          }}
          onBack={() => setBoostModal(null)}
          loading={checkoutLoading}
        />
      )}
    </div>
  )
}
