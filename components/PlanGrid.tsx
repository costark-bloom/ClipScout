'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { PLANS, type Plan } from '@/lib/plans'
import type { PlanId, BillingInterval } from '@/lib/stripe'
import { trackEvent } from '@/lib/analytics'
import CreditBoostModal from './CreditBoostModal'

// ─── First-month promo configuration ────────────────────────────────────────
// Visual + countdown treatment for a "new user, first month only" offer on the
// Creator plan when billed monthly. The actual discount must also be configured
// on the Stripe side (apply a coupon in the checkout session) — see startCheckout.
const PROMO = {
  planId: 'creator' as const,
  firstMonthPrice: 2,        // displayed promo price
  windowMs: 10 * 60 * 1000,  // 10 minutes
  // Bump the version suffix to reset everyone's countdown — handy when iterating
  // on the offer (e.g. v4 = relaunched promo with a different price).
  storageKey: 'clipscout_first_month_promo_started_at_v3',
}

/** Returns { msLeft, ready }. `ready` is false on the first render to avoid a
 *  flash of "promo active" before we can read localStorage.
 *
 *  Test affordance: appending `?reset_promo=1` to the URL clears the stored
 *  timestamp and starts a fresh 10-minute window. Useful when iterating on the
 *  promo treatment without juggling incognito windows. */
function usePromoCountdown(): { msLeft: number; ready: boolean } {
  // Start at 0 so the promo treatment isn't visible until after we've read
  // localStorage (no flash-of-expired-promo on stale-timer page loads).
  const [msLeft, setMsLeft] = useState<number>(0)
  const [ready, setReady] = useState<boolean>(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Reset hook for QA: `?reset_promo=1` wipes the stored timer.
    let forceFresh = false
    try {
      const params = new URLSearchParams(window.location.search)
      if (params.get('reset_promo') === '1') {
        window.localStorage.removeItem(PROMO.storageKey)
        forceFresh = true
        // Strip the param so a refresh doesn't keep resetting the timer.
        params.delete('reset_promo')
        const cleanedSearch = params.toString()
        const newUrl =
          window.location.pathname +
          (cleanedSearch ? `?${cleanedSearch}` : '') +
          window.location.hash
        window.history.replaceState({}, '', newUrl)
      }
    } catch {
      // ignore — URL/storage issues fall through to the normal path
    }

    let startedAt = 0
    try {
      if (!forceFresh) {
        const saved = window.localStorage.getItem(PROMO.storageKey)
        if (saved) {
          startedAt = parseInt(saved, 10)
          if (Number.isNaN(startedAt)) startedAt = 0
        }
      }
      if (!startedAt) {
        startedAt = Date.now()
        window.localStorage.setItem(PROMO.storageKey, String(startedAt))
      }
    } catch {
      // localStorage failures (private mode) — fall back to in-memory countdown
      startedAt = Date.now()
    }

    const tick = () => {
      const remaining = PROMO.windowMs - (Date.now() - startedAt)
      setMsLeft(Math.max(0, remaining))
    }
    tick()
    setReady(true)
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [])

  return { msLeft, ready }
}

function formatCountdown(ms: number): string {
  const total = Math.ceil(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

interface Props {
  /** 'full' = pricing-page sizing; 'compact' = tighter spacing for in-modal use */
  variant?: 'full' | 'compact'
  /** Optional analytics prefix so we can tell pricing-page clicks apart from modal clicks */
  analyticsContext?: string
}

function Check() {
  return (
    <svg className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  )
}

function QuarterlyModal({
  plan,
  onQuarterly,
  onMonthly,
  onClose,
}: {
  plan: Plan
  onQuarterly: () => void
  onMonthly: () => void
  onClose: () => void
}) {
  const savings = ((plan.monthly - plan.quarterly) * 3).toFixed(0)
  const percentOff = Math.round(((plan.monthly - plan.quarterly) / plan.monthly) * 100)
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-purple-950/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl my-8 rounded-2xl overflow-hidden shadow-2xl flex flex-col sm:flex-row">
        <div className="bg-white flex-1 p-6 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-widest text-purple-500 mb-1">{plan.name}</p>
          <div className="flex items-end gap-2 mb-1 flex-wrap">
            <span className="text-5xl font-extrabold text-purple-950 leading-none">${plan.quarterly}</span>
            <span className="text-sm text-purple-500 mb-1 line-through">${plan.monthly}</span>
            <span className="text-sm text-purple-500 mb-1 whitespace-nowrap">per month</span>
          </div>
          <p className="text-sm text-purple-700 mb-6 mt-2">
            Pay 3 months upfront for a total of <strong>${plan.quarterlyTotal}</strong>
          </p>
          <ul className="space-y-3 mb-8">
            {['You can still cancel anytime', 'We bill you only once every quarter', `Save a total of $${savings} over 3 months`].map((item) => (
              <li key={item} className="flex items-center gap-2.5 text-sm text-purple-800">
                <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                {item}
              </li>
            ))}
          </ul>
          <button onClick={onQuarterly} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors duration-150 text-sm whitespace-nowrap">
            Yes, save {percentOff}% and pay quarterly
          </button>
          <button onClick={onMonthly} className="w-full mt-3 text-sm text-purple-500 hover:text-purple-700 transition-colors">
            No, skip discount and pay monthly &rsaquo;
          </button>
        </div>
        <div className="bg-gradient-to-br from-purple-600 to-indigo-600 flex-1 p-6 sm:p-8 flex flex-col justify-center">
          <p className="text-3xl sm:text-4xl font-extrabold text-white mb-3 leading-tight">
            Save {percentOff}% with Quarterly Billing
          </p>
          <p className="text-purple-200 text-sm leading-relaxed">
            Ready to commit for at least 3 months? Pay quarterly and save ${savings}.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function PlanGrid({ variant = 'full', analyticsContext = 'Pricing' }: Props) {
  const { data: session } = useSession()
  const [annual, setAnnual] = useState(false)
  const [quarterlyModal, setQuarterlyModal] = useState<Plan | null>(null)
  const [boostModal, setBoostModal] = useState<{ plan: Plan; interval: BillingInterval } | null>(null)
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const [checkoutLoading, setCheckoutLoading] = useState(false)

  const { msLeft: promoMsLeft, ready: promoReady } = usePromoCountdown()
  // Promo only applies to monthly billing on the targeted plan, and only while
  // the countdown is still running. `promoReady` keeps the treatment hidden
  // until after we've read localStorage on mount (prevents flash).
  const promoActive = promoReady && promoMsLeft > 0 && !annual

  const startCheckout = async (planId: PlanId, interval: BillingInterval, packId?: string | null) => {
    // Apply first-month promo at checkout when the user is buying the promo plan
    // monthly and the timer hasn't expired. NOTE: the Stripe-side coupon must be
    // configured for this to actually discount the user — see /api/stripe/checkout.
    const promoApplied = promoActive && planId === PROMO.planId && interval === 'monthly'

    trackEvent(`${analyticsContext} — Checkout Started`, {
      plan: planId,
      interval,
      pack: packId ?? null,
      first_month_promo: promoApplied,
    })
    setCheckoutLoading(true)
    setLoadingPlan(`${planId}-${interval}`)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          interval,
          packId: packId ?? null,
          // The backend should look at this flag and attach the configured first-month
          // coupon to the Stripe Checkout Session (e.g. discounts: [{ coupon: ... }]).
          firstMonthPromo: promoApplied,
        }),
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

  const handleGetStarted = (plan: Plan) => {
    if (!session) {
      trackEvent(`${analyticsContext} — Get Started (Not Signed In)`, { plan: plan.name })
      window.location.href = '/?signin=1'
      return
    }
    const promoEligible = promoActive && plan.id === PROMO.planId && !annual
    trackEvent(`${analyticsContext} — Get Started Clicked`, {
      plan: plan.name,
      billing: annual ? 'annual' : 'monthly',
      first_month_promo: promoEligible,
    })
    if (promoEligible) {
      // Skip the quarterly upsell — the promo is the offer we want to convert on.
      setBoostModal({ plan, interval: 'monthly' })
      return
    }
    if (!annual) {
      setQuarterlyModal(plan)
    } else {
      setBoostModal({ plan, interval: 'annual' })
    }
  }

  const compact = variant === 'compact'
  const cardPadding = compact ? 'p-5' : 'p-7'
  const priceSize = compact ? 'text-4xl' : 'text-5xl'
  const featureSpacing = compact ? 'space-y-1.5 mb-5' : 'space-y-2.5 mb-8'
  // When space is tight, only show the first ~4 features per card. The full list
  // is still on the pricing page for users who want to compare exhaustively.
  const featureLimit = compact ? 4 : 99

  return (
    <>
      {/* Annual toggle */}
      <div className={`flex justify-center mb-${compact ? '4' : '6'}`}>
        <div className="inline-flex items-center gap-3">
          <span className={`text-sm font-medium transition-colors ${annual ? 'text-purple-500' : 'text-purple-950'}`}>
            Monthly
          </span>
          <button
            onClick={() => { const next = !annual; setAnnual(next); trackEvent(`${analyticsContext} — Billing Toggle`, { billing: next ? 'annual' : 'monthly' }) }}
            className={`relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none ${annual ? 'bg-purple-600' : 'bg-purple-200'}`}
            aria-label="Toggle annual billing"
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${annual ? 'translate-x-6' : 'translate-x-0'}`} />
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
      <div className={`grid grid-cols-1 md:grid-cols-3 gap-${compact ? '4' : '6'} ${promoActive ? 'mt-2' : ''}`}>
        {PLANS.map((plan) => {
          const regularPrice = annual ? plan.annual : plan.monthly
          const billingNote = annual ? `Billed $${plan.annualTotal}/year` : 'Billed monthly'
          const visibleFeatures = plan.features.slice(0, featureLimit)
          const isPromoCard = promoActive && plan.id === PROMO.planId

          return (
            <div
              key={plan.id}
              className={`relative rounded-2xl border flex flex-col transition-all duration-200 ${
                isPromoCard
                  ? 'border-amber-400 bg-white shadow-xl shadow-amber-200/50 ring-2 ring-amber-200/60'
                  : plan.popular
                  ? 'border-purple-400 bg-white shadow-xl shadow-purple-200/50'
                  : 'border-purple-200 bg-white/80 shadow-md shadow-purple-100/40'
              }`}
            >
              {/* Badges (promo takes priority over "Most Popular" since they'd overlap visually) */}
              {isPromoCard ? (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                  <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow flex items-center gap-1.5">
                    <span className="inline-block w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    Limited time · {formatCountdown(promoMsLeft)}
                  </span>
                </div>
              ) : plan.popular ? (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="bg-purple-600 text-white text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow">
                    Most Popular
                  </span>
                </div>
              ) : null}

              <div className={`${cardPadding} flex flex-col flex-1`}>
                <h2 className={`${compact ? 'text-lg' : 'text-xl'} font-bold text-purple-950 mb-0.5`}>{plan.name}</h2>
                {!compact && <p className="text-xs text-purple-500 mb-5">{plan.tagline}</p>}

                <div className={compact ? 'mb-1 mt-1' : 'mb-1'}>
                  <div className="flex items-end gap-1.5">
                    <span className={`${priceSize} font-extrabold text-purple-950 leading-none`}>
                      ${isPromoCard ? PROMO.firstMonthPrice : regularPrice}
                    </span>
                    {isPromoCard && (
                      <span className="text-base text-purple-400 mb-1 line-through font-medium">${regularPrice}</span>
                    )}
                    <span className="text-sm text-purple-500 mb-1">{isPromoCard ? '/first month' : '/month'}</span>
                  </div>
                  <p className="text-xs text-purple-400 mt-1">
                    {isPromoCard ? `Then $${regularPrice}/month after` : billingNote}
                  </p>
                  {isPromoCard && (
                    <p className="text-[11px] text-amber-700 mt-2 font-medium flex items-start gap-1.5">
                      <svg className="w-3 h-3 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>New user promo — ends in {formatCountdown(promoMsLeft)}</span>
                    </p>
                  )}
                </div>

                <div className={compact ? 'mt-3 mb-3' : 'mt-4 mb-5'}>
                  <p className="text-sm font-bold text-purple-600">{plan.credits} credits/month</p>
                  <p className="text-xs text-purple-400">Rollover up to {plan.rollover}</p>
                </div>

                <ul className={`${featureSpacing} flex-1`}>
                  {visibleFeatures.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-purple-800">
                      <Check />
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleGetStarted(plan)}
                  disabled={!!loadingPlan}
                  className={`w-full py-${compact ? '2.5' : '3'} rounded-xl font-semibold text-sm transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed ${
                    isPromoCard
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md shadow-amber-300/50'
                      : plan.popular
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
                  ) : isPromoCard ? (
                    `Claim $${PROMO.firstMonthPrice} first month`
                  ) : (
                    'Get Started'
                  )}
                </button>
              </div>
            </div>
          )
        })}
      </div>

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

      {/* Credit-boost cross-sell modal */}
      {boostModal && (() => {
        const regularPrice =
          boostModal.interval === 'annual'
            ? boostModal.plan.annual
            : boostModal.interval === 'quarterly'
            ? boostModal.plan.quarterly
            : boostModal.plan.monthly
        const promoApplies =
          promoActive && boostModal.plan.id === PROMO.planId && boostModal.interval === 'monthly'
        const displayedPrice = promoApplies ? PROMO.firstMonthPrice : regularPrice

        return (
          <CreditBoostModal
            planName={boostModal.plan.name}
            billingLabel={
              boostModal.interval === 'annual'
                ? `Billed $${boostModal.plan.annualTotal}/year`
                : boostModal.interval === 'quarterly'
                ? `Billed $${boostModal.plan.quarterlyTotal}/quarter`
                : 'Billed monthly'
            }
            planPrice={displayedPrice}
            promoFirstMonth={promoApplies ? { regularPrice } : undefined}
            onCheckout={(packId) => {
              const { plan, interval } = boostModal
              startCheckout(plan.id as PlanId, interval, packId)
            }}
            onBack={() => setBoostModal(null)}
            loading={checkoutLoading}
          />
        )
      })()}
    </>
  )
}
