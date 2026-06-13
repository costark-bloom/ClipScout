'use client'

import { useSession } from 'next-auth/react'
import HomeHeader from '@/components/HomeHeader'
import PlanGrid from '@/components/PlanGrid'

// TODO(upgrades): When a signed-in user with an active subscription clicks
// "Get Started" on a different tier, we currently spin up a *new* Stripe
// subscription via /api/stripe/checkout instead of updating their existing
// one. That risks double-charging (parallel Creator + Pro subs).
// Fix options:
//   (a) Wire up Stripe Billing Portal for plan changes — Stripe handles
//       proration + UX. Quickest path.
//   (b) Add /api/stripe/change-plan that calls
//       stripe.subscriptions.update(subId, { items: [...] }) with proration.
// Safe for pre-launch since most early users will stay on Creator after
// trial, but resolve before promoting tier upgrades.
export default function PricingPage() {
  // Pricing page is session-aware: signed-out visitors only see Creator (it's
  // the only plan they can actually trial via the new-user funnel), signed-in
  // users see all three so they can upgrade. Heading + trial copy adjust to
  // match what's below.
  const { data: session, status } = useSession()
  const isSignedIn = status === 'authenticated' && !!session

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
            {isSignedIn ? (
              <>The right plan for<br />
                <span className="bg-gradient-to-r from-purple-600 to-indigo-500 bg-clip-text text-transparent">
                  every creator
                </span>
              </>
            ) : (
              <>Start finding B-roll in<br />
                <span className="bg-gradient-to-r from-purple-600 to-indigo-500 bg-clip-text text-transparent">
                  30 seconds, not 3 hours
                </span>
              </>
            )}
          </h1>
          <p className="text-purple-600 text-base max-w-md mx-auto">
            {isSignedIn
              ? 'Monthly credits for AI-powered B-roll discovery. Unused credits roll over so you never lose what you\u2019ve paid for.'
              : 'Try every ClipScout feature free for 3 days. Cancel anytime before your trial ends — no charge.'}
          </p>

          {/* Trial badge — only shown to signed-out users since they're the
              ones who actually get the trial. Existing users don't need to
              be reminded they're already past it. */}
          {!isSignedIn && (
            <div className="mt-5 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-indigo-100 to-purple-100 border border-purple-200">
              <svg className="w-3.5 h-3.5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
              </svg>
              <span className="text-xs font-semibold text-purple-800">
                3-day free trial · Cancel anytime
              </span>
            </div>
          )}

          {/* How credits work — anchors to explainer below */}
          <div className="mt-4">
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
        </div>

        {/* Plan grid (toggle + cards + checkout flow). PlanGrid handles the
            anon/signed-in plan filtering internally. */}
        <PlanGrid variant="full" analyticsContext="Pricing" />

        {/* Trial reassurance line — only meaningful for users who haven't
            already used their trial. */}
        {!isSignedIn && (
          <p className="text-center text-sm text-purple-500 mt-8">
            Card required to start your trial · Cancel anytime in Settings before it converts
          </p>
        )}

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
    </div>
  )
}
