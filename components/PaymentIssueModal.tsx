'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { trackEvent } from '@/lib/analytics'

interface Props {
  /** The user's current subscription_status — drives the copy + primary CTA. */
  status: string
  onClose: () => void
}

/**
 * Modal shown when a user tries to spend credits but their subscription is in
 * a problematic state (past_due, unpaid, canceled, incomplete_expired).
 *
 * Distinct from UpgradeModal: that one is for "you ran out of credits, pick a
 * plan." This one is for "your card failed / your sub ended, fix billing or
 * resubscribe." Using a single modal for both was misleading — past_due users
 * were being told they'd used their 3 free trial credits.
 */
export default function PaymentIssueModal({ status, onClose }: Props) {
  const [loadingPortal, setLoadingPortal] = useState(false)

  useEffect(() => {
    trackEvent('Payment Issue Modal Viewed', { status })
  }, [status])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // past_due / unpaid → user has a card that failed; portal lets them fix it
  // canceled / incomplete_expired → sub is over; portal can't help, pricing can
  const isPaymentFailed = status === 'past_due' || status === 'unpaid'
  const isCancelledOrExpired =
    status === 'canceled' || status === 'incomplete_expired'

  const title = isPaymentFailed
    ? "Your payment didn't go through"
    : isCancelledOrExpired
    ? 'Your subscription has ended'
    : 'Your subscription needs attention'

  const subtitle = isPaymentFailed
    ? "Your card on file was declined when we tried to charge it. Update your payment method to keep finding b-roll."
    : isCancelledOrExpired
    ? 'Reactivate your plan to keep finding b-roll for your scripts.'
    : 'Your billing needs an update before you can continue.'

  const openPortal = async () => {
    trackEvent('Payment Issue Modal — Open Portal Clicked', { status })
    setLoadingPortal(true)
    try {
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          returnUrl:
            typeof window !== 'undefined' ? window.location.href : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error || 'Portal unavailable')
      window.location.href = data.url
    } catch (err) {
      console.error('[payment-issue] portal error:', err)
      alert(
        err instanceof Error
          ? err.message
          : "We couldn't open the billing portal. Try again in a moment.",
      )
      setLoadingPortal(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-purple-950/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl shadow-purple-300/30 border border-purple-100 overflow-hidden">
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 to-rose-500" />

        <button
          onClick={onClose}
          aria-label="Close payment issue modal"
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-purple-50 hover:bg-purple-100 text-purple-500 hover:text-purple-800 flex items-center justify-center transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="px-8 pt-8 pb-2 text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-7 h-7 text-amber-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-extrabold text-purple-950 mb-2">{title}</h2>
          <p className="text-sm text-purple-600 leading-relaxed">{subtitle}</p>
        </div>

        <div className="px-8 py-6 space-y-2.5">
          {isPaymentFailed ? (
            <>
              <button
                onClick={openPortal}
                disabled={loadingPortal}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 disabled:cursor-not-allowed text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
              >
                {loadingPortal ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Opening portal…
                  </>
                ) : (
                  'Update payment method'
                )}
              </button>
              <Link
                href="/settings"
                onClick={() =>
                  trackEvent('Payment Issue Modal — Settings Clicked', { status })
                }
                className="block w-full text-center bg-white hover:bg-purple-50 text-purple-700 font-semibold py-2.5 px-4 rounded-xl text-sm border border-purple-200 transition-colors"
              >
                Go to settings
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/pricing"
                onClick={() =>
                  trackEvent('Payment Issue Modal — Pricing Clicked', { status })
                }
                className="block w-full text-center bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition-colors"
              >
                Reactivate plan
              </Link>
              <button
                onClick={openPortal}
                disabled={loadingPortal}
                className="w-full bg-white hover:bg-purple-50 text-purple-700 font-semibold py-2.5 px-4 rounded-xl text-sm border border-purple-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loadingPortal ? 'Opening portal…' : 'Manage billing'}
              </button>
            </>
          )}
        </div>

        <div className="px-6 pb-5 text-center">
          <button
            onClick={onClose}
            className="text-xs text-purple-500 hover:text-purple-700 transition-colors"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  )
}
